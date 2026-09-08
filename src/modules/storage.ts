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
import { 
  generateEd25519KeyPair, 
  derivePublicKeyHexFromSecretKey, 
  isStrictHex, 
  isValidPublicKeyHex, 
  isValidSecretKeyHex 
} from './signing';

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

export interface AlcoBackupPayload {
  alcoVaultVersion: '2.0-encrypted';
  exportDate: string;
  encryptedVault: EncryptedOwnerVault;
  history?: AlcoLicenseRecord[];
  settings?: OwnerSettings;
  customApps?: any[];
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  backup?: AlcoBackupPayload;
}

export interface BackupVerificationResult {
  success: boolean;
  error?: string;
  isDifferentAuthority?: boolean;
  activeFingerprint?: string;
  backupFingerprint?: string;
  backupPublicKeyHex?: string;
  recordCount?: number;
  decryptedPrivateKeyHex?: string;
}

/**
 * Validates the structure and cryptographic format of a backup file without decrypting
 */
export function validateBackupFileFormat(jsonString: string): BackupValidationResult {
  try {
    const raw = JSON.parse(jsonString);

    if (raw.alcoVaultVersion !== '2.0-encrypted' || !raw.encryptedVault) {
      if (raw.alcoVaultVersion === '1.0') {
        return { 
          valid: false, 
          error: 'Legacy v1 unencrypted backup rejected. For security, only AES-256-GCM encrypted backups (v2.0) are supported.' 
        };
      }
      return { 
        valid: false, 
        error: 'Invalid backup format: Expected "alcoVaultVersion: 2.0-encrypted".' 
      };
    }

    const v = raw.encryptedVault;
    if (!v || typeof v !== 'object') {
      return { valid: false, error: 'Malformed backup: Missing encryptedVault object.' };
    }

    // Strict format validations
    if (!v.ciphertextHex || typeof v.ciphertextHex !== 'string' || !isStrictHex(v.ciphertextHex)) {
      return { valid: false, error: 'Corrupted backup: ciphertextHex is missing or not valid hexadecimal.' };
    }

    if (!v.saltHex || typeof v.saltHex !== 'string' || !isStrictHex(v.saltHex) || v.saltHex.length !== 32) {
      return { valid: false, error: 'Corrupted backup: saltHex must be exactly 32 hex characters (16 bytes).' };
    }

    if (!v.ivHex || typeof v.ivHex !== 'string' || !isStrictHex(v.ivHex) || v.ivHex.length !== 24) {
      return { valid: false, error: 'Corrupted backup: ivHex must be exactly 24 hex characters (12 bytes).' };
    }

    if (typeof v.iterations !== 'number' || v.iterations < 100000) {
      return { valid: false, error: 'Insecure backup: PBKDF2 iterations must be at least 100,000.' };
    }

    if (!v.publicKeyHex || typeof v.publicKeyHex !== 'string' || !isValidPublicKeyHex(v.publicKeyHex)) {
      return { valid: false, error: 'Corrupted backup: publicKeyHex must be 64 hexadecimal characters.' };
    }

    if (!v.fingerprint || typeof v.fingerprint !== 'string') {
      return { valid: false, error: 'Corrupted backup: Missing public key fingerprint.' };
    }

    return {
      valid: true,
      backup: raw as AlcoBackupPayload
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid JSON backup file: ${err?.message || 'Parse error'}`
    };
  }
}

/**
 * Stage 2 of Backup Restore:
 * Decrypts backup with provided Master Password, derives Ed25519 public key from private key,
 * compares against vault public key, and detects Authority Identity mismatch.
 * DOES NOT save or commit to storage yet.
 */
export async function verifyBackupDecryption(
  backup: AlcoBackupPayload,
  masterPassword: string
): Promise<BackupVerificationResult> {
  try {
    // 1. Decrypt secret payload
    const decryptedRaw = await decryptWithPassword(backup.encryptedVault, masterPassword);
    const secret = JSON.parse(decryptedRaw);

    // 2. Validate private key format (strictly 128 hex chars)
    if (!secret.privateKeyHex || !isValidSecretKeyHex(secret.privateKeyHex)) {
      return {
        success: false,
        error: 'Decrypted secret payload contains an invalid or malformed Ed25519 private key.'
      };
    }

    // 3. Cryptographic derivation check: derive public key from decrypted private key
    const derived = derivePublicKeyHexFromSecretKey(secret.privateKeyHex);
    if (derived.publicKeyHex.toLowerCase() !== backup.encryptedVault.publicKeyHex.toLowerCase()) {
      return {
        success: false,
        error: 'Cryptographic integrity failure: Public key derived from decrypted private key does not match the vault public key.'
      };
    }

    // 4. Check against currently active authority identity
    const currentVault = getEncryptedVault();
    const isDifferentAuthority = !!(
      currentVault && 
      currentVault.fingerprint.toUpperCase() !== backup.encryptedVault.fingerprint.toUpperCase()
    );

    return {
      success: true,
      isDifferentAuthority,
      activeFingerprint: currentVault?.fingerprint,
      backupFingerprint: backup.encryptedVault.fingerprint,
      backupPublicKeyHex: backup.encryptedVault.publicKeyHex,
      recordCount: Array.isArray(backup.history) ? backup.history.length : 0,
      decryptedPrivateKeyHex: secret.privateKeyHex
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to decrypt backup. Incorrect Master Password.'
    };
  }
}

/**
 * Stage 3 of Backup Restore:
 * Commits the verified backup to localStorage after all cryptographic checks and confirmations pass.
 */
export function commitRestoreBackup(backup: AlcoBackupPayload): { success: boolean; message: string } {
  try {
    saveEncryptedVault(backup.encryptedVault);

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
      message: 'Encrypted Vault and licensing records successfully restored.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to commit backup to storage: ${err?.message || 'Storage error'}`
    };
  }
}

/**
 * Legacy importVaultBackup wrapper for backwards compatibility
 */
export function importVaultBackup(jsonString: string): { success: boolean; message: string; requiresUnlock?: boolean } {
  const validation = validateBackupFileFormat(jsonString);
  if (!validation.valid || !validation.backup) {
    return { success: false, message: validation.error || 'Invalid backup file' };
  }
  return {
    success: true,
    message: 'Backup validated. Please proceed with password verification.',
    requiresUnlock: true
  };
}
