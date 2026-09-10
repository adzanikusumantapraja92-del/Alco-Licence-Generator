/**
 * ALCO License Generator - Authority Client Bridge
 * 
 * Unified client interface that connects React components to the Authority Service.
 * - In Electron mode: Dispatches requests across IPC to window.alcoLicense (Main Process).
 * - In Browser Dev mode: Falls back to an encapsulated browser authority service where
 *   private keys remain isolated inside a local closure and are NEVER exposed to React state.
 * 
 * GUARANTEED INVARIANT:
 * No method on this client ever returns `privateKeyHex` to React components!
 */

import { 
  VaultStatus, 
  AlcoLicenseRecord, 
  AlcoCustomerRecord, 
  AlcoAppDefinition, 
  OwnerKeyPair 
} from './types';
import { 
  VaultStatusResult, 
  VaultSetupInput, 
  VaultSetupResult, 
  VaultUnlockInput, 
  VaultUnlockResult, 
  VaultLockResult, 
  VaultChangePasswordInput, 
  VaultChangePasswordResult, 
  GenerateLicenseInput, 
  GenerateLicenseResult, 
  UpsertCustomerInput, 
  UpsertCustomerResult, 
  BackupVerificationProof, 
  BackupValidationResult, 
  BackupVerificationResult, 
  BackupRestoreResult, 
  IAlcoLicenseRendererApi 
} from '../../electron/types';
import { 
  OwnerSettings, 
  DEFAULT_OWNER_SETTINGS, 
  AlcoBackupPayload 
} from './persistence/persistence-interface';
import { LocalStoragePersistenceAdapter } from './persistence/local-storage-adapter';
import { encryptWithPassword, decryptWithPassword } from './vault-crypto';
import {
  derivePublicKeyHexFromSecretKey,
  generateEd25519KeyPair,
  isStrictHex,
  isValidPublicKeyHex,
  isValidSecretKeyHex,
  signCanonicalPayload,
  packageLicenseKey
} from './signing';
import { createLicensePayload } from './license-payload';
import { resolveOrCreateCustomerRecord } from './customer-registry';

const MAX_BACKUP_JSON_LENGTH = 5 * 1024 * 1024;

function validateSecretMatchesVault(secretPayload: any, vault: AlcoBackupPayload['encryptedVault']): string {
  const privateKeyHex = typeof secretPayload?.privateKeyHex === 'string'
    ? secretPayload.privateKeyHex.trim()
    : '';

  if (!isValidSecretKeyHex(privateKeyHex)) {
    throw new Error('Corrupted vault: Invalid Ed25519 private key format.');
  }

  const derived = derivePublicKeyHexFromSecretKey(privateKeyHex);
  if (derived.publicKeyHex.toLowerCase() !== vault.publicKeyHex.toLowerCase()) {
    throw new Error('Corrupted vault: Private key does not match stored public key.');
  }
  if (derived.fingerprint !== vault.fingerprint) {
    throw new Error('Corrupted vault: Authority fingerprint does not match derived public key.');
  }

  return privateKeyHex;
}

function isStrictHexLength(value: unknown, length: number): boolean {
  return typeof value === 'string' && value.length === length && isStrictHex(value);
}

function isValidCustomerRegistryPayload(customers: unknown): boolean {
  if (customers === undefined) return true;
  if (!Array.isArray(customers) || customers.length > 10000) return false;

  return customers.every((customer) => {
    if (!customer || typeof customer !== 'object') return false;
    const c = customer as Record<string, unknown>;
    return (
      typeof c.customerId === 'string' &&
      c.customerId.length > 0 &&
      c.customerId.length <= 80 &&
      typeof c.name === 'string' &&
      c.name.length <= 160 &&
      typeof c.email === 'string' &&
      c.email.length > 0 &&
      c.email.length <= 254 &&
      typeof c.emailNormalized === 'string' &&
      c.emailNormalized.length > 0 &&
      c.emailNormalized.length <= 254 &&
      typeof c.createdAt === 'string' &&
      typeof c.updatedAt === 'string'
    );
  });
}

function createProofId(): string {
  const bytes = new Uint8Array(12);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return `proof-${Date.now()}-${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

// Browser fallback closure: holds private key in module scope, away from React state
let browserVolatilePrivateKey: string | null = null;
let browserVolatileFingerprint: string | null = null;
const browserStorage = new LocalStoragePersistenceAdapter();

// Fallback backup staging
let browserStagedBackup: AlcoBackupPayload | null = null;
let browserStagedProof: BackupVerificationProof | null = null;

class BrowserAuthorityFallback implements IAlcoLicenseRendererApi {
  async getVaultStatus(): Promise<VaultStatusResult> {
    const vault = await browserStorage.getEncryptedVault();
    if (!vault) {
      return { status: 'uninitialized' };
    }
    const isUnlocked = !!browserVolatilePrivateKey;
    return {
      status: isUnlocked ? 'unlocked' : 'locked',
      fingerprint: vault.fingerprint,
      publicKeyHex: vault.publicKeyHex,
      createdAt: vault.createdAt,
      vaultHint: vault.vaultHint
    };
  }

  async setupVault(input: VaultSetupInput): Promise<VaultSetupResult> {
    if (!input.masterPassword || input.masterPassword.length < 8) {
      return {
        success: false,
        status: 'uninitialized',
        fingerprint: '',
        publicKeyHex: '',
        createdAt: '',
        error: 'Master Password must be at least 8 characters long.'
      };
    }

    const keyPair = generateEd25519KeyPair();
    const secretPayload = JSON.stringify({
      privateKeyHex: keyPair.privateKeyHex,
      fingerprint: keyPair.fingerprint,
      createdAt: new Date().toISOString()
    });

    const encrypted = await encryptWithPassword(secretPayload, input.masterPassword);

    const vault = {
      version: '2.0-aes-gcm' as const,
      algorithm: 'AES-256-GCM' as const,
      kdf: 'PBKDF2-SHA-256' as const,
      iterations: encrypted.iterations,
      saltHex: encrypted.saltHex,
      ivHex: encrypted.ivHex,
      ciphertextHex: encrypted.ciphertextHex,
      publicKeyHex: keyPair.publicKeyHex,
      fingerprint: keyPair.fingerprint,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vaultHint: input.vaultHint?.trim() || undefined
    };

    await browserStorage.saveEncryptedVault(vault);

    // Keep active in browser closure
    browserVolatilePrivateKey = keyPair.privateKeyHex;
    browserVolatileFingerprint = keyPair.fingerprint;

    return {
      success: true,
      status: 'unlocked',
      fingerprint: keyPair.fingerprint,
      publicKeyHex: keyPair.publicKeyHex,
      createdAt: vault.createdAt
    };
  }

  async unlockVault(input: VaultUnlockInput): Promise<VaultUnlockResult> {
    const vault = await browserStorage.getEncryptedVault();
    if (!vault) {
      return { success: false, status: 'uninitialized', error: 'Vault not initialized.' };
    }

    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: vault.ciphertextHex,
          saltHex: vault.saltHex,
          ivHex: vault.ivHex,
          iterations: vault.iterations
        },
        input.masterPassword
      );

      const secretPayload = JSON.parse(decryptedJson);
      const privateKeyHex = validateSecretMatchesVault(secretPayload, vault);

      browserVolatilePrivateKey = privateKeyHex;
      browserVolatileFingerprint = vault.fingerprint;

      return {
        success: true,
        status: 'unlocked',
        fingerprint: vault.fingerprint,
        publicKeyHex: vault.publicKeyHex
      };
    } catch (err: any) {
      browserVolatilePrivateKey = null;
      browserVolatileFingerprint = null;
      return {
        success: false,
        status: 'locked',
        error: err?.message || 'Incorrect Master Password.'
      };
    }
  }

  async lockVault(): Promise<VaultLockResult> {
    browserVolatilePrivateKey = null;
    browserVolatileFingerprint = null;
    return { success: true };
  }

  async changePassword(input: VaultChangePasswordInput): Promise<VaultChangePasswordResult> {
    const vault = await browserStorage.getEncryptedVault();
    if (!vault) {
      return { success: false, error: 'Vault not initialized.' };
    }

    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: vault.ciphertextHex,
          saltHex: vault.saltHex,
          ivHex: vault.ivHex,
          iterations: vault.iterations
        },
        input.currentPassword
      );

      const secretPayload = JSON.parse(decryptedJson);
      validateSecretMatchesVault(secretPayload, vault);

      const newEncrypted = await encryptWithPassword(decryptedJson, input.newPassword);
      const updatedVault = {
        ...vault,
        iterations: newEncrypted.iterations,
        saltHex: newEncrypted.saltHex,
        ivHex: newEncrypted.ivHex,
        ciphertextHex: newEncrypted.ciphertextHex,
        updatedAt: new Date().toISOString(),
        vaultHint: input.vaultHint !== undefined ? input.vaultHint.trim() || undefined : vault.vaultHint
      };

      await browserStorage.saveEncryptedVault(updatedVault);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to change password.' };
    }
  }

  async generateLicense(input: GenerateLicenseInput): Promise<GenerateLicenseResult> {
    if (!browserVolatilePrivateKey) {
      return { success: false, error: 'Authority Vault is locked. Master Password required.' };
    }

    try {
      const { payload, canonicalPayload } = createLicensePayload({
        appId: input.appId,
        deviceId: input.deviceId,
        customerId: input.customerId,
        customerName: input.customerName?.trim() || undefined,
        plan: input.plan,
        licenseType: input.licenseType,
        features: input.features || [],
        expiresAt: input.licenseType === 'lifetime' ? null : input.expiresAt,
        metadata: input.metadata
      });

      const signatureHex = signCanonicalPayload(canonicalPayload, browserVolatilePrivateKey);
      const licenseKey = packageLicenseKey(canonicalPayload, signatureHex);

      const record: AlcoLicenseRecord = {
        id: payload.licenseId,
        licenseKey,
        payload,
        signature: signatureHex,
        createdAt: payload.issuedAt,
        status: 'active'
      };

      const settings = await browserStorage.getOwnerSettings();
      if (settings.autoSaveHistory) {
        await browserStorage.appendLicenseRecord(record);
      }

      return {
        success: true,
        licenseKey,
        payload,
        signature: signatureHex,
        canonicalString: canonicalPayload
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Signing failed.' };
    }
  }

  async getCustomers(): Promise<AlcoCustomerRecord[]> {
    return await browserStorage.getCustomerRegistry();
  }

  async upsertCustomer(input: UpsertCustomerInput): Promise<UpsertCustomerResult> {
    const registry = await browserStorage.getCustomerRegistry();
    const resolution = resolveOrCreateCustomerRecord(registry, {
      name: input.name,
      email: input.email,
      whatsapp: input.whatsapp,
      segment: input.segment,
      acquisitionSource: input.acquisitionSource,
      marketingConsent: input.marketingConsent
    });

    if (resolution.created || resolution.updatedRegistry.length !== registry.length) {
      await browserStorage.saveCustomerRegistry(resolution.updatedRegistry);
    }

    return {
      customer: resolution.customer,
      created: resolution.created
    };
  }

  async getHistory(): Promise<AlcoLicenseRecord[]> {
    return await browserStorage.getLicenseHistory();
  }

  async saveLicenseRecord(record: AlcoLicenseRecord): Promise<{ success: boolean }> {
    await browserStorage.appendLicenseRecord(record);
    return { success: true };
  }

  async updateLicenseStatus(id: string, status: 'active' | 'revoked'): Promise<{ success: boolean }> {
    await browserStorage.updateLicenseStatus(id, status);
    return { success: true };
  }

  async deleteLicenseRecord(id: string): Promise<{ success: boolean }> {
    await browserStorage.deleteLicenseRecord(id);
    return { success: true };
  }

  async getCustomApps(): Promise<AlcoAppDefinition[]> {
    return await browserStorage.getCustomApps();
  }

  async saveCustomApps(apps: AlcoAppDefinition[]): Promise<{ success: boolean }> {
    await browserStorage.saveCustomApps(apps);
    return { success: true };
  }

  async getSettings(): Promise<OwnerSettings> {
    return await browserStorage.getOwnerSettings();
  }

  async saveSettings(settings: OwnerSettings): Promise<{ success: boolean }> {
    await browserStorage.saveOwnerSettings(settings);
    return { success: true };
  }

  async exportBackup(): Promise<string> {
    const backup = await browserStorage.exportBackupPayload();
    return JSON.stringify(backup, null, 2);
  }

  async validateBackup(rawJson: string): Promise<BackupValidationResult> {
    try {
      if (!rawJson?.trim()) return { valid: false, error: 'Empty backup content.' };
      if (rawJson.length > MAX_BACKUP_JSON_LENGTH) {
        return { valid: false, error: 'Backup content is too large.' };
      }
      const parsed = JSON.parse(rawJson);
      if (parsed.alcoVaultVersion !== '2.0-encrypted') {
        return { valid: false, error: 'Incompatible backup format. Expected alcoVaultVersion 2.0-encrypted.' };
      }
      if (!parsed.encryptedVault) return { valid: false, error: 'Missing encryptedVault field.' };
      const v = parsed.encryptedVault;
      if (v.version !== '2.0-aes-gcm' || v.algorithm !== 'AES-256-GCM') {
        return { valid: false, error: 'Incompatible vault encryption version.' };
      }
      if (v.kdf !== 'PBKDF2-SHA-256') {
        return { valid: false, error: 'Incompatible vault KDF.' };
      }
      if (!Number.isInteger(v.iterations) || v.iterations < 100000) {
        return { valid: false, error: 'Invalid vault KDF iterations.' };
      }
      if (!isStrictHexLength(v.saltHex, 32) || !isStrictHexLength(v.ivHex, 24) || !isStrictHex(v.ciphertextHex)) {
        return { valid: false, error: 'Invalid vault encryption encoding.' };
      }
      if (!isValidPublicKeyHex(v.publicKeyHex) || typeof v.fingerprint !== 'string' || v.fingerprint.length > 80) {
        return { valid: false, error: 'Invalid authority public identity in backup.' };
      }
      if (!isValidCustomerRegistryPayload(parsed.customers)) {
        return { valid: false, error: 'Invalid customer registry in backup.' };
      }
      return { valid: true, backup: parsed };
    } catch (err: any) {
      return { valid: false, error: `Invalid JSON: ${err?.message}` };
    }
  }

  async verifyBackupDecryption(backup: AlcoBackupPayload, password: string): Promise<BackupVerificationResult> {
    const v = backup.encryptedVault;
    try {
      const decrypted = await decryptWithPassword(
        {
          ciphertextHex: v.ciphertextHex,
          saltHex: v.saltHex,
          ivHex: v.ivHex,
          iterations: v.iterations
        },
        password
      );

      const parsed = JSON.parse(decrypted);
      validateSecretMatchesVault(parsed, v);
      const currentVault = await browserStorage.getEncryptedVault();
      const isDifferentAuthority = !!currentVault && currentVault.fingerprint !== v.fingerprint;

      const proof: BackupVerificationProof = {
        proofId: createProofId(),
        backupFingerprint: v.fingerprint,
        backupPublicKeyHex: v.publicKeyHex,
        recordCount: Array.isArray(backup.history) ? backup.history.length : 0,
        customerCount: Array.isArray(backup.customers) ? backup.customers.length : 0,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000
      };

      browserStagedBackup = backup;
      browserStagedProof = proof;

      return {
        success: true,
        proof,
        backupFingerprint: v.fingerprint,
        backupPublicKeyHex: v.publicKeyHex,
        isDifferentAuthority,
        recordCount: proof.recordCount,
        customerCount: proof.customerCount
      };
    } catch (err: any) {
      browserStagedBackup = null;
      browserStagedProof = null;
      return { success: false, error: err?.message || 'Decryption failed: Incorrect password.' };
    }
  }

  async commitRestoreBackup(proof: BackupVerificationProof): Promise<BackupRestoreResult> {
    if (!browserStagedBackup || !browserStagedProof) {
      return { success: false, error: 'No verified backup staged.' };
    }
    if (browserStagedProof.proofId !== proof.proofId) {
      return { success: false, error: 'Proof ID mismatch.' };
    }
    if (
      browserStagedProof.backupFingerprint !== proof.backupFingerprint ||
      browserStagedProof.backupPublicKeyHex !== proof.backupPublicKeyHex
    ) {
      return { success: false, error: 'Authority identity mismatch.' };
    }
    if (Date.now() > browserStagedProof.expiresAt) {
      this.cancelStagedRestore();
      return { success: false, error: 'Proof expired.' };
    }

    await browserStorage.saveEncryptedVault(browserStagedBackup.encryptedVault);
    if (Array.isArray(browserStagedBackup.customers)) {
      await browserStorage.saveCustomerRegistry(browserStagedBackup.customers);
    }
    if (Array.isArray(browserStagedBackup.history)) {
      await browserStorage.saveLicenseHistory(browserStagedBackup.history);
    }
    if (browserStagedBackup.settings) {
      await browserStorage.saveOwnerSettings(browserStagedBackup.settings);
    }
    if (Array.isArray(browserStagedBackup.customApps)) {
      await browserStorage.saveCustomApps(browserStagedBackup.customApps);
    }

    browserVolatilePrivateKey = null;
    browserVolatileFingerprint = null;
    this.cancelStagedRestore();

    return { success: true, message: 'Restore completed successfully.' };
  }

  async cancelStagedRestore(): Promise<{ success: boolean }> {
    browserStagedBackup = null;
    browserStagedProof = null;
    return { success: true };
  }
}

const fallbackService = new BrowserAuthorityFallback();

/**
 * Returns the Authority Client:
 * Uses window.alcoLicense if running in Electron renderer,
 * otherwise falls back to the safe browser authority.
 */
export function getAuthorityClient(): IAlcoLicenseRendererApi {
  if (typeof window !== 'undefined' && (window as any).alcoLicense) {
    return (window as any).alcoLicense;
  }
  return fallbackService;
}

export const authorityClient = getAuthorityClient();
