/**
 * ALCO Storage Module (Encrypted Vault Edition)
 * 
 * Local, secure, offline storage:
 * - Encrypted Owner Vault (AES-256-GCM + PBKDF2-SHA-256)
 * - Zero plaintext private keys in localStorage
 * - Plaintext Public Key metadata for client verification
 * - Generated License History
 * - Application Registry and Settings
 */

import { EncryptedOwnerVault, AlcoLicenseRecord, OwnerKeyPair } from './types';
import { encryptWithPassword, decryptWithPassword } from './vault-crypto';
import { generateEd25519KeyPair } from './signing';

export const STORAGE_KEYS = {
  VAULT: 'alco_encrypted_owner_vault_v2',
  HISTORY: 'alco_license_history_v1',
  SETTINGS: 'alco_owner_settings_v1',
  CUSTOM_APPS: 'alco_custom_apps_registry_v1',
  LEGACY_KEYPAIR: 'alco_owner_keypair_v1'
};

export interface OwnerSettings {
  ownerName: string;
  defaultPlan: 'starter' | 'pro' | 'enterprise';
  defaultLicenseType: 'lifetime' | 'subscription';
  defaultSubscriptionDays: number;
  autoSaveHistory: boolean;
  autoLockMinutes: number; // e.g. 15 mins (0 = manual lock only)
}

const DEFAULT_SETTINGS: OwnerSettings = {
  ownerName: 'Aladzan Corpora Owner',
  defaultPlan: 'pro',
  defaultLicenseType: 'subscription',
  defaultSubscriptionDays: 365,
  autoSaveHistory: true,
  autoLockMinutes: 15
};

/**
 * Checks if the Encrypted Owner Vault has been set up
 */
export function hasOwnerVault(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VAULT);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return !!(parsed.ciphertextHex && parsed.publicKeyHex && parsed.saltHex && parsed.ivHex);
  } catch {
    return false;
  }
}

/**
 * Retrieves the stored Encrypted Owner Vault
 */
export function getEncryptedVault(): EncryptedOwnerVault | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VAULT);
    if (!raw) return null;
    return JSON.parse(raw) as EncryptedOwnerVault;
  } catch {
    return null;
  }
}

/**
 * Saves or updates the Encrypted Owner Vault.
 * IMPORTANT: Purges any legacy plaintext keypair from storage immediately.
 */
export function saveEncryptedVault(vault: EncryptedOwnerVault): void {
  localStorage.setItem(STORAGE_KEYS.VAULT, JSON.stringify(vault));
  // Purge legacy plaintext storage if any
  localStorage.removeItem(STORAGE_KEYS.LEGACY_KEYPAIR);
}

/**
 * Checks for legacy plaintext keypair that can be upgraded during setup
 */
export function getLegacyPlaintextKeyPair(): { publicKeyHex: string; privateKeyHex: string; fingerprint: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LEGACY_KEYPAIR);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.publicKeyHex && parsed.privateKeyHex) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Initializes a new Encrypted Owner Vault with Master Password.
 * If legacy keypair exists or initialKeyPair is passed, it is encrypted; otherwise a fresh Ed25519 pair is generated.
 * Returns the created vault and the transient in-memory private key.
 */
export async function initializeOwnerVault(
  masterPassword: string,
  existingPair?: { publicKeyHex: string; privateKeyHex: string; fingerprint: string },
  hint?: string
): Promise<{ vault: EncryptedOwnerVault; privateKeyHex: string }> {
  // Use existing keypair (e.g. migrating from legacy) or generate fresh
  const keyPairToEncrypt = existingPair || getLegacyPlaintextKeyPair() || generateEd25519KeyPair();

  const secretPayload = JSON.stringify({
    privateKeyHex: keyPairToEncrypt.privateKeyHex,
    fingerprint: keyPairToEncrypt.fingerprint,
    createdAt: new Date().toISOString()
  });

  const encrypted = await encryptWithPassword(secretPayload, masterPassword);

  const vault: EncryptedOwnerVault = {
    version: '2.0-aes-gcm',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: encrypted.iterations,
    saltHex: encrypted.saltHex,
    ivHex: encrypted.ivHex,
    ciphertextHex: encrypted.ciphertextHex,
    publicKeyHex: keyPairToEncrypt.publicKeyHex,
    fingerprint: keyPairToEncrypt.fingerprint,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    vaultHint: hint?.trim() || undefined
  };

  saveEncryptedVault(vault);

  return {
    vault,
    privateKeyHex: keyPairToEncrypt.privateKeyHex
  };
}

/**
 * Unlocks the vault in transient memory.
 * Returns decrypted privateKeyHex. NEVER writes this to storage!
 */
export async function unlockOwnerVault(masterPassword: string): Promise<{
  privateKeyHex: string;
  fingerprint: string;
}> {
  const vault = getEncryptedVault();
  if (!vault) {
    throw new Error('No encrypted vault found. Setup required.');
  }

  const decryptedJson = await decryptWithPassword(
    {
      ciphertextHex: vault.ciphertextHex,
      saltHex: vault.saltHex,
      ivHex: vault.ivHex,
      iterations: vault.iterations
    },
    masterPassword
  );

  const secret = JSON.parse(decryptedJson);
  if (!secret.privateKeyHex) {
    throw new Error('Corrupted vault secret data.');
  }

  return {
    privateKeyHex: secret.privateKeyHex,
    fingerprint: secret.fingerprint || vault.fingerprint
  };
}

/**
 * Changes the Master Password of the Vault.
 * Requires the current password to decrypt, then re-encrypts with a fresh salt and IV.
 */
export async function changeVaultMasterPassword(
  currentPassword: string,
  newPassword: string,
  newHint?: string
): Promise<EncryptedOwnerVault> {
  const vault = getEncryptedVault();
  if (!vault) {
    throw new Error('No encrypted vault found.');
  }

  // 1. Decrypt current secret
  const decryptedJson = await decryptWithPassword(
    {
      ciphertextHex: vault.ciphertextHex,
      saltHex: vault.saltHex,
      ivHex: vault.ivHex,
      iterations: vault.iterations
    },
    currentPassword
  );

  // 2. Encrypt with new password (generates fresh salt and fresh IV)
  const newEncrypted = await encryptWithPassword(decryptedJson, newPassword);

  const updatedVault: EncryptedOwnerVault = {
    ...vault,
    iterations: newEncrypted.iterations,
    saltHex: newEncrypted.saltHex,
    ivHex: newEncrypted.ivHex,
    ciphertextHex: newEncrypted.ciphertextHex,
    updatedAt: new Date().toISOString(),
    vaultHint: newHint !== undefined ? newHint : vault.vaultHint
  };

  saveEncryptedVault(updatedVault);
  return updatedVault;
}

/**
 * Explicit key rotation: Replaces the Ed25519 identity.
 * Requires the current master password.
 */
export async function rotateOwnerKeyPair(masterPassword: string): Promise<{
  vault: EncryptedOwnerVault;
  newKeyPair: OwnerKeyPair;
}> {
  // Confirm current password is valid first
  await unlockOwnerVault(masterPassword);

  const generated = generateEd25519KeyPair();
  const secretPayload = JSON.stringify({
    privateKeyHex: generated.privateKeyHex,
    fingerprint: generated.fingerprint,
    createdAt: new Date().toISOString(),
    rotatedAt: new Date().toISOString()
  });

  const encrypted = await encryptWithPassword(secretPayload, masterPassword);

  const vault: EncryptedOwnerVault = {
    version: '2.0-aes-gcm',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: encrypted.iterations,
    saltHex: encrypted.saltHex,
    ivHex: encrypted.ivHex,
    ciphertextHex: encrypted.ciphertextHex,
    publicKeyHex: generated.publicKeyHex,
    fingerprint: generated.fingerprint,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveEncryptedVault(vault);

  return {
    vault,
    newKeyPair: {
      publicKeyHex: generated.publicKeyHex,
      privateKeyHex: generated.privateKeyHex,
      fingerprint: generated.fingerprint,
      createdAt: vault.createdAt
    }
  };
}

/**
 * Retrieves public key metadata without needing master password (safe for client inspection)
 */
export function getOwnerPublicMeta(): OwnerKeyPair | null {
  const vault = getEncryptedVault();
  if (vault) {
    return {
      publicKeyHex: vault.publicKeyHex,
      fingerprint: vault.fingerprint,
      createdAt: vault.createdAt
    };
  }

  // Fallback to legacy if vault not yet migrated
  const legacy = getLegacyPlaintextKeyPair();
  if (legacy) {
    return {
      publicKeyHex: legacy.publicKeyHex,
      fingerprint: legacy.fingerprint,
      createdAt: new Date().toISOString()
    };
  }

  return null;
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
  const existingIdx = history.findIndex(h => h.id === record.id);
  let updated: AlcoLicenseRecord[];
  if (existingIdx >= 0) {
    updated = history.map((item, idx) => idx === existingIdx ? record : item);
  } else {
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
 * Complete Data Backup (ENCRYPTED ONLY)
 * Under NO CIRCUMSTANCE is plaintext privateKeyHex exported!
 */
export function exportVaultBackup(): string {
  const encryptedVault = getEncryptedVault();
  const history = getLicenseHistory();
  const settings = getOwnerSettings();
  const customAppsRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_APPS);
  const customApps = customAppsRaw ? JSON.parse(customAppsRaw) : [];

  const backup = {
    alcoVaultVersion: '2.0-encrypted',
    exportDate: new Date().toISOString(),
    encryptedVault, // Contains ciphertext, salt, IV, and public key only
    history,
    settings,
    customApps
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Restores an encrypted vault backup.
 * Requires master password when unlocking the imported vault.
 */
export function importVaultBackup(jsonString: string): { success: boolean; message: string; requiresUnlock?: boolean } {
  try {
    const backup = JSON.parse(jsonString);

    // Check if it's the secure v2 encrypted vault
    if (backup.alcoVaultVersion === '2.0-encrypted' && backup.encryptedVault) {
      const v = backup.encryptedVault;
      if (!v.ciphertextHex || !v.publicKeyHex || !v.saltHex || !v.ivHex) {
        return { success: false, message: 'Invalid backup format: Malformed encrypted vault structure.' };
      }

      saveEncryptedVault(v);

      if (Array.isArray(backup.history)) {
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(backup.history));
      }
      if (backup.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(backup.settings));
      }
      if (Array.isArray(backup.customApps)) {
        localStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(backup.customApps));
      }

      return { 
        success: true, 
        message: 'Encrypted Vault successfully restored. Please unlock with your Master Password.',
        requiresUnlock: true
      };
    }

    // Support legacy v1 backup with warning
    if (backup.alcoVaultVersion === '1.0' && backup.keyPair?.privateKeyHex) {
      return { 
        success: false, 
        message: 'Legacy unencrypted backup detected. For security, please set up a master password in the Vault Setup first, then migrate your keys.' 
      };
    }

    return { success: false, message: 'Unrecognized backup file format.' };
  } catch (err: any) {
    return { success: false, message: `Restore failed: ${err?.message || 'Unknown error'}` };
  }
}
