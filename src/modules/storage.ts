/**
 * ALCO Storage Module
 * 
 * Local, secure, offline storage for:
 * - Owner Ed25519 KeyPair
 * - Generated License History
 * - Owner configurations
 */

import { OwnerKeyPair, AlcoLicenseRecord } from './types';
import { generateEd25519KeyPair } from './signing';

const STORAGE_KEYS = {
  KEYPAIR: 'alco_owner_keypair_v1',
  HISTORY: 'alco_license_history_v1',
  SETTINGS: 'alco_owner_settings_v1'
};

export interface OwnerSettings {
  ownerName: string;
  defaultPlan: 'starter' | 'pro' | 'enterprise';
  defaultLicenseType: 'lifetime' | 'subscription';
  defaultSubscriptionDays: number;
  autoSaveHistory: boolean;
}

const DEFAULT_SETTINGS: OwnerSettings = {
  ownerName: 'Aladzan Corpora Owner',
  defaultPlan: 'pro',
  defaultLicenseType: 'subscription',
  defaultSubscriptionDays: 365,
  autoSaveHistory: true
};

/**
 * Retrieves existing owner Ed25519 keypair, or creates and securely persists one on first launch
 */
export function getOrCreateOwnerKeyPair(): OwnerKeyPair {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KEYPAIR);
    if (raw) {
      const parsed: OwnerKeyPair = JSON.parse(raw);
      if (parsed.publicKeyHex && parsed.privateKeyHex) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read stored keypair, generating new', e);
  }

  // Generate fresh keypair on first run
  const generated = generateEd25519KeyPair();
  const newPair: OwnerKeyPair = {
    publicKeyHex: generated.publicKeyHex,
    privateKeyHex: generated.privateKeyHex,
    fingerprint: generated.fingerprint,
    createdAt: new Date().toISOString()
  };

  localStorage.setItem(STORAGE_KEYS.KEYPAIR, JSON.stringify(newPair));
  return newPair;
}

/**
 * Saves or updates the owner's keypair (e.g. from a backup import)
 */
export function saveOwnerKeyPair(keyPair: OwnerKeyPair): void {
  localStorage.setItem(STORAGE_KEYS.KEYPAIR, JSON.stringify(keyPair));
}

/**
 * Retrieves all saved generated licenses
 */
export function getLicenseHistory(): AlcoLicenseRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Saves a new license into history
 */
export function saveLicenseToHistory(record: AlcoLicenseRecord): void {
  const history = getLicenseHistory();
  // Check if already exists by id
  const existingIdx = history.findIndex(h => h.id === record.id);
  let updated: AlcoLicenseRecord[];
  if (existingIdx >= 0) {
    updated = history.map((item, idx) => idx === existingIdx ? record : item);
  } else {
    // Add to beginning of array
    updated = [record, ...history];
  }
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
}

/**
 * Removes or updates status of a license
 */
export function updateLicenseStatus(id: string, status: 'active' | 'revoked'): void {
  const history = getLicenseHistory();
  const updated = history.map(item => item.id === id ? { ...item, status } : item);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
}

export function deleteLicenseFromHistory(id: string): void {
  const history = getLicenseHistory();
  const updated = history.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
}

export function clearLicenseHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}

/**
 * Settings helpers
 */
export function getOwnerSettings(): OwnerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveOwnerSettings(settings: Partial<OwnerSettings>): OwnerSettings {
  const current = getOwnerSettings();
  const merged = { ...current, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
  return merged;
}

/**
 * Complete Data Backup (Export / Import)
 */
export function exportVaultBackup(): string {
  const keyPair = getOrCreateOwnerKeyPair();
  const history = getLicenseHistory();
  const settings = getOwnerSettings();
  const customAppsRaw = localStorage.getItem('alco_custom_apps_registry_v1');
  const customApps = customAppsRaw ? JSON.parse(customAppsRaw) : [];

  const backup = {
    alcoVaultVersion: '1.0',
    exportDate: new Date().toISOString(),
    keyPair,
    history,
    settings,
    customApps
  };

  return JSON.stringify(backup, null, 2);
}

export function importVaultBackup(jsonString: string): { success: boolean; message: string } {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup.keyPair || !backup.keyPair.privateKeyHex || !backup.keyPair.publicKeyHex) {
      return { success: false, message: 'Invalid backup format: Missing Ed25519 KeyPair' };
    }

    localStorage.setItem(STORAGE_KEYS.KEYPAIR, JSON.stringify(backup.keyPair));
    if (Array.isArray(backup.history)) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(backup.history));
    }
    if (backup.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backup.settings));
    }
    if (Array.isArray(backup.customApps)) {
      localStorage.setItem('alco_custom_apps_registry_v1', JSON.stringify(backup.customApps));
    }

    return { success: true, message: 'Backup successfully restored.' };
  } catch (err: any) {
    return { success: false, message: `Restore failed: ${err?.message}` };
  }
}
