/**
 * ALCO License Generator - Main Process File Storage Service
 * 
 * Persists owner licensing authority domains inside Electron app.getPath('userData'):
 * - vault.enc.json: AES-256-GCM encrypted vault with public key & fingerprint
 * - customers.json: ALCO customer registry records
 * - history.json: Signed license audit records
 * - settings.json: Authority owner preferences
 * - custom-apps.json: Dynamically registered ALCO ecosystem apps
 */

import fs from 'node:fs';
import path from 'node:path';
import { 
  EncryptedOwnerVault, 
  AlcoLicenseRecord, 
  AlcoCustomerRecord, 
  AlcoAppDefinition, 
  OwnerKeyPair 
} from '../../src/modules/types';
import { 
  IAlcoPersistenceService, 
  OwnerSettings, 
  DEFAULT_OWNER_SETTINGS, 
  AlcoBackupPayload 
} from '../../src/modules/persistence/persistence-interface';

export class ElectronFileStorageService implements IAlcoPersistenceService {
  private readonly dataDir: string;
  private readonly files: {
    vault: string;
    customers: string;
    history: string;
    settings: string;
    customApps: string;
  };

  constructor(baseDir: string) {
    this.dataDir = baseDir;
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    this.files = {
      vault: path.join(this.dataDir, 'vault.enc.json'),
      customers: path.join(this.dataDir, 'customers.json'),
      history: path.join(this.dataDir, 'history.json'),
      settings: path.join(this.dataDir, 'settings.json'),
      customApps: path.join(this.dataDir, 'custom-apps.json')
    };
  }

  private safeReadJson<T>(filePath: string, fallback: T): T {
    try {
      if (!fs.existsSync(filePath)) return fallback;
      const raw = fs.readFileSync(filePath, 'utf-8');
      if (!raw || !raw.trim()) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private safeWriteJson<T>(filePath: string, data: T): void {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, serialized, 'utf-8');
    fs.renameSync(tempPath, filePath);
  }

  private safeDelete(filePath: string): void {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  storageDomainExists(domain: 'vault' | 'customers' | 'history' | 'settings' | 'customApps'): boolean {
    return fs.existsSync(this.files[domain]);
  }

  async hasOwnerVault(): Promise<boolean> {
    const vault = await this.getEncryptedVault();
    return !!(vault && vault.ciphertextHex && vault.publicKeyHex && vault.saltHex && vault.ivHex);
  }

  async getEncryptedVault(): Promise<EncryptedOwnerVault | null> {
    return this.safeReadJson<EncryptedOwnerVault | null>(this.files.vault, null);
  }

  async saveEncryptedVault(vault: EncryptedOwnerVault): Promise<void> {
    this.safeWriteJson(this.files.vault, vault);
  }

  async deleteEncryptedVault(): Promise<void> {
    this.safeDelete(this.files.vault);
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
    const list = this.safeReadJson<AlcoCustomerRecord[]>(this.files.customers, []);
    return Array.isArray(list) ? list : [];
  }

  async saveCustomerRegistry(customers: AlcoCustomerRecord[]): Promise<void> {
    this.safeWriteJson(this.files.customers, customers);
  }

  async deleteCustomerRegistry(): Promise<void> {
    this.safeDelete(this.files.customers);
  }

  async getLicenseHistory(): Promise<AlcoLicenseRecord[]> {
    const list = this.safeReadJson<AlcoLicenseRecord[]>(this.files.history, []);
    return Array.isArray(list) ? list : [];
  }

  async saveLicenseHistory(history: AlcoLicenseRecord[]): Promise<void> {
    this.safeWriteJson(this.files.history, history);
  }

  async deleteLicenseHistory(): Promise<void> {
    this.safeDelete(this.files.history);
  }

  async appendLicenseRecord(record: AlcoLicenseRecord): Promise<void> {
    const history = await this.getLicenseHistory();
    const updated = [record, ...history.filter(h => h.id !== record.id)];
    await this.saveLicenseHistory(updated);
  }

  async updateLicenseStatus(id: string, status: 'active' | 'revoked'): Promise<void> {
    const history = await this.getLicenseHistory();
    const updated = history.map(h => h.id === id ? { ...h, status } : h);
    await this.saveLicenseHistory(updated);
  }

  async deleteLicenseRecord(id: string): Promise<void> {
    const history = await this.getLicenseHistory();
    const updated = history.filter(h => h.id !== id);
    await this.saveLicenseHistory(updated);
  }

  async getOwnerSettings(): Promise<OwnerSettings> {
    return this.safeReadJson<OwnerSettings>(this.files.settings, { ...DEFAULT_OWNER_SETTINGS });
  }

  async saveOwnerSettings(settings: OwnerSettings): Promise<void> {
    this.safeWriteJson(this.files.settings, settings);
  }

  async deleteOwnerSettings(): Promise<void> {
    this.safeDelete(this.files.settings);
  }

  async getCustomApps(): Promise<AlcoAppDefinition[]> {
    const list = this.safeReadJson<AlcoAppDefinition[]>(this.files.customApps, []);
    return Array.isArray(list) ? list : [];
  }

  async saveCustomApps(apps: AlcoAppDefinition[]): Promise<void> {
    this.safeWriteJson(this.files.customApps, apps);
  }

  async deleteCustomApps(): Promise<void> {
    this.safeDelete(this.files.customApps);
  }

  async exportBackupPayload(): Promise<AlcoBackupPayload> {
    const vault = await this.getEncryptedVault();
    if (!vault) {
      throw new Error('Cannot export backup: Encrypted Vault is not initialized.');
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

  async restoreFromBackupPayload(payload: AlcoBackupPayload): Promise<void> {
    if (!payload.encryptedVault) {
      throw new Error('Corrupted backup: Missing encryptedVault.');
    }
    await this.saveEncryptedVault(payload.encryptedVault);
    if (Array.isArray(payload.customers)) {
      await this.saveCustomerRegistry(payload.customers);
    }
    if (Array.isArray(payload.history)) {
      await this.saveLicenseHistory(payload.history);
    }
    if (payload.settings) {
      await this.saveOwnerSettings(payload.settings);
    }
    if (Array.isArray(payload.customApps)) {
      await this.saveCustomApps(payload.customApps);
    }
  }
}
