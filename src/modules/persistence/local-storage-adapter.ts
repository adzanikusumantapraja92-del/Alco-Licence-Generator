/**
 * ALCO License Generator - LocalStorage Persistence Adapter
 * 
 * Provides fallback persistence implementation for Browser Development mode
 * using localStorage while maintaining identical domain models.
 */

import { 
  EncryptedOwnerVault, 
  AlcoLicenseRecord, 
  AlcoCustomerRecord, 
  AlcoAppDefinition, 
  OwnerKeyPair 
} from '../types';
import { 
  IAlcoPersistenceService, 
  OwnerSettings, 
  DEFAULT_OWNER_SETTINGS, 
  AlcoBackupPayload 
} from './persistence-interface';

export const STORAGE_KEYS = {
  VAULT: 'alco_encrypted_owner_vault_v2',
  HISTORY: 'alco_license_history_v1',
  CUSTOMERS: 'alco_customer_registry_v1',
  SETTINGS: 'alco_owner_settings_v1',
  CUSTOM_APPS: 'alco_custom_apps_registry_v1',
  LEGACY_KEYPAIR: 'alco_owner_keypair_v1'
};

export class LocalStoragePersistenceAdapter implements IAlcoPersistenceService {
  private getStorage(): Storage {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
      return (globalThis as any).localStorage;
    }
    throw new Error('localStorage is not available in current environment');
  }

  async hasOwnerVault(): Promise<boolean> {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(STORAGE_KEYS.VAULT);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed.ciphertextHex && parsed.publicKeyHex && parsed.saltHex && parsed.ivHex);
    } catch {
      return false;
    }
  }

  async getEncryptedVault(): Promise<EncryptedOwnerVault | null> {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(STORAGE_KEYS.VAULT);
      if (!raw) return null;
      return JSON.parse(raw) as EncryptedOwnerVault;
    } catch {
      return null;
    }
  }

  async saveEncryptedVault(vault: EncryptedOwnerVault): Promise<void> {
    const storage = this.getStorage();
    storage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(vault));
    storage.removeItem(STORAGE_KEYS.LEGACY_KEYPAIR);
  }

  async getOwnerPublicMeta(): Promise<OwnerKeyPair | null> {
    const vault = await this.getEncryptedVault();
    if (!vault) return null;
    return {
      publicKeyHex: vault.publicKeyHex,
      fingerprint: vault.fingerprint,
      createdAt: vault.createdAt
    };
  }

  async getCustomerRegistry(): Promise<AlcoCustomerRecord[]> {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(STORAGE_KEYS.CUSTOMERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveCustomerRegistry(customers: AlcoCustomerRecord[]): Promise<void> {
    const storage = this.getStorage();
    storage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  async getLicenseHistory(): Promise<AlcoLicenseRecord[]> {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(STORAGE_KEYS.HISTORY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveLicenseHistory(history: AlcoLicenseRecord[]): Promise<void> {
    const storage = this.getStorage();
    storage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  }

  async appendLicenseRecord(record: AlcoLicenseRecord): Promise<void> {
    const history = await this.getLicenseHistory();
    const updated = [record, ...history.filter(h => h.id !== record.id)];
    await this.saveLicenseHistory(updated);
  }

  async updateLicenseStatus(id: string, status: 'active' | 'revoked'): Promise<void> {
    const history = await this.getLicenseHistory();
    const updated = history.map(item => item.id === id ? { ...item, status } : item);
    await this.saveLicenseHistory(updated);
  }

  async deleteLicenseRecord(id: string): Promise<void> {
    const history = await this.getLicenseHistory();
    const updated = history.filter(item => item.id !== id);
    await this.saveLicenseHistory(updated);
  }

  async getOwnerSettings(): Promise<OwnerSettings> {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(STORAGE_KEYS.SETTINGS);
      if (!raw) return { ...DEFAULT_OWNER_SETTINGS };
      return { ...DEFAULT_OWNER_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_OWNER_SETTINGS };
    }
  }

  async saveOwnerSettings(settings: OwnerSettings): Promise<void> {
    const storage = this.getStorage();
    storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  async getCustomApps(): Promise<AlcoAppDefinition[]> {
    try {
      const storage = this.getStorage();
      const raw = storage.getItem(STORAGE_KEYS.CUSTOM_APPS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveCustomApps(apps: AlcoAppDefinition[]): Promise<void> {
    const storage = this.getStorage();
    storage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(apps));
  }

  async exportBackupPayload(): Promise<AlcoBackupPayload> {
    const vault = await this.getEncryptedVault();
    if (!vault) {
      throw new Error('Cannot export backup: No Encrypted Vault initialized.');
    }
    const history = await this.getLicenseHistory();
    const customers = await this.getCustomerRegistry();
    const settings = await this.getOwnerSettings();
    const customApps = await this.getCustomApps();

    return {
      alcoVaultVersion: '2.0-encrypted',
      exportDate: new Date().toISOString(),
      encryptedVault: vault,
      history,
      customers,
      settings,
      customApps
    };
  }
}
