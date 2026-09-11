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
  MigrationProof,
  MigrationStageResult,
  MigrationCommitInput,
  MigrationCommitResult,
  RuntimeDiagnostics,
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

// Fallback migration staging (Phase 4)
let browserStagedMigrationBackup: AlcoBackupPayload | null = null;
let browserStagedMigrationPassword: string | null = null;
let browserStagedMigrationProof: MigrationProof | null = null;

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

  // ==========================================
  // Safe Authority Migration (Phase 4)
  // ==========================================

  async stageAuthorityMigration(rawJson: string, masterPassword: string): Promise<MigrationStageResult> {
    if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
      return { success: false, error: 'Backup content is empty.' };
    }
    if (rawJson.length > MAX_BACKUP_JSON_LENGTH) {
      return { success: false, error: 'Backup exceeds maximum allowed file size of 5MB.' };
    }
    if (!masterPassword || typeof masterPassword !== 'string' || masterPassword.length < 8) {
      return { success: false, error: 'Master Password must be at least 8 characters long.' };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return { success: false, error: 'Backup is not a valid JSON document.' };
    }

    if (parsed?.alcoVaultVersion !== '2.0-encrypted') {
      return {
        success: false,
        error: 'Unsupported backup version. Migration requires an ALCO encrypted v2 backup (alcoVaultVersion: "2.0-encrypted").'
      };
    }

    const v = parsed?.encryptedVault;
    if (!v || typeof v !== 'object') {
      return { success: false, error: 'Corrupted backup: Missing encryptedVault container.' };
    }

    if (v.version !== '2.0-aes-gcm' || v.algorithm !== 'AES-256-GCM' || v.kdf !== 'PBKDF2-SHA-256') {
      return { success: false, error: 'Unsupported vault cryptographic parameters.' };
    }

    if (typeof v.iterations !== 'number' || v.iterations < 100000) {
      return { success: false, error: 'Inadequate PBKDF2 iteration count in backup.' };
    }

    if (!isStrictHexLength(v.saltHex, 32) || !isStrictHexLength(v.ivHex, 24) || !isStrictHex(v.ciphertextHex)) {
      return { success: false, error: 'Corrupted hex encryption vectors in backup vault.' };
    }

    if (!isValidPublicKeyHex(v.publicKeyHex)) {
      return { success: false, error: 'Invalid Ed25519 public key format in backup vault.' };
    }

    if (typeof v.fingerprint !== 'string' || !v.fingerprint.trim() || v.fingerprint.length > 80) {
      return { success: false, error: 'Invalid authority fingerprint in backup vault.' };
    }

    if (!isValidCustomerRegistryPayload(parsed.customers)) {
      return { success: false, error: 'Corrupted customer registry in backup payload.' };
    }

    let decryptedJson: string;
    try {
      decryptedJson = await decryptWithPassword(v, masterPassword);
    } catch {
      return { success: false, error: 'Decryption failed: Incorrect Master Password for this backup.' };
    }

    let secretPayload: any;
    try {
      secretPayload = JSON.parse(decryptedJson);
    } catch {
      return { success: false, error: 'Corrupted vault payload: decrypted content is not valid JSON.' };
    }

    const privateKeyHex = typeof secretPayload?.privateKeyHex === 'string'
      ? secretPayload.privateKeyHex.trim()
      : '';

    if (!isValidSecretKeyHex(privateKeyHex)) {
      return {
        success: false,
        error: 'Corrupted backup: Invalid Ed25519 private key format (expected 128 hex characters / 64 bytes).'
      };
    }

    let derived: { publicKeyHex: string; fingerprint: string };
    try {
      derived = derivePublicKeyHexFromSecretKey(privateKeyHex);
    } catch (err: any) {
      return {
        success: false,
        error: `Cryptographic derivation failure: ${err?.message || 'Cannot derive public key from secret key.'}`
      };
    }

    if (derived.publicKeyHex.toLowerCase() !== v.publicKeyHex.toLowerCase()) {
      return {
        success: false,
        error: 'SECURITY VIOLATION: Decrypted private key does not correspond to the backup public key.'
      };
    }

    if (derived.fingerprint !== v.fingerprint) {
      return {
        success: false,
        error: 'SECURITY VIOLATION: Authority fingerprint does not match decrypted private key.'
      };
    }

    const existingVault = await browserStorage.getEncryptedVault();

    const proof: MigrationProof = {
      proofId: createProofId(),
      backupFingerprint: v.fingerprint,
      backupPublicKeyHex: v.publicKeyHex,
      recordCount: Array.isArray(parsed.history) ? parsed.history.length : 0,
      customerCount: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
      customAppsCount: Array.isArray(parsed.customApps) ? parsed.customApps.length : 0,
      hasSettings: !!parsed.settings,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    browserStagedMigrationBackup = parsed;
    browserStagedMigrationPassword = masterPassword;
    browserStagedMigrationProof = proof;

    return {
      success: true,
      proof,
      backupFingerprint: v.fingerprint,
      backupPublicKeyHex: v.publicKeyHex,
      customerCount: proof.customerCount,
      historyCount: proof.recordCount,
      customAppsCount: proof.customAppsCount,
      hasSettings: proof.hasSettings,
      hasExistingVault: !!existingVault,
      existingFingerprint: existingVault?.fingerprint
    };
  }

  async commitAuthorityMigration(input: MigrationCommitInput): Promise<MigrationCommitResult> {
    if (!browserStagedMigrationBackup || !browserStagedMigrationPassword || !browserStagedMigrationProof) {
      return {
        success: false,
        error: 'No verified migration staged. You must verify backup and password first.'
      };
    }

    if (!input.proof || browserStagedMigrationProof.proofId !== input.proof.proofId) {
      return {
        success: false,
        error: 'Invalid migration proof: proof ID mismatch.'
      };
    }

    if (
      browserStagedMigrationProof.backupFingerprint !== input.proof.backupFingerprint ||
      browserStagedMigrationProof.backupPublicKeyHex !== input.proof.backupPublicKeyHex
    ) {
      return {
        success: false,
        error: 'SECURITY VIOLATION: Authority identity mismatch in migration proof.'
      };
    }

    if (Date.now() > browserStagedMigrationProof.expiresAt || Date.now() > input.proof.expiresAt) {
      this.cancelAuthorityMigration();
      return {
        success: false,
        error: 'Migration proof expired (5-minute TTL exceeded). Please re-verify backup.'
      };
    }

    const existingVault = await browserStorage.getEncryptedVault();
    if (existingVault && !input.overwriteExisting) {
      return {
        success: false,
        error: 'An existing authority vault is already present in this desktop app. Explicit overwrite confirmation is required.'
      };
    }

    // Rollback snapshot
    const prevVault = await browserStorage.getEncryptedVault();
    const prevCustomers = await browserStorage.getCustomerRegistry();
    const prevHistory = await browserStorage.getLicenseHistory();
    const prevSettings = await browserStorage.getOwnerSettings();
    const prevApps = await browserStorage.getCustomApps();

    const targetFingerprint = browserStagedMigrationProof.backupFingerprint;
    const targetPublicKeyHex = browserStagedMigrationProof.backupPublicKeyHex;
    const password = browserStagedMigrationPassword;
    const backupPayload = browserStagedMigrationBackup;

    try {
      await browserStorage.saveEncryptedVault(backupPayload.encryptedVault);
      if (Array.isArray(backupPayload.customers)) {
        await browserStorage.saveCustomerRegistry(backupPayload.customers);
      }
      if (Array.isArray(backupPayload.history)) {
        await browserStorage.saveLicenseHistory(backupPayload.history);
      }
      if (backupPayload.settings) {
        await browserStorage.saveOwnerSettings(backupPayload.settings);
      }
      if (Array.isArray(backupPayload.customApps)) {
        await browserStorage.saveCustomApps(backupPayload.customApps);
      }

      // Read back from storage
      const storedVault = await browserStorage.getEncryptedVault();
      if (!storedVault) {
        throw new Error('Post-migration read verification failed: Vault not found in storage.');
      }
      if (storedVault.fingerprint !== targetFingerprint) {
        throw new Error('Post-migration verification failed: Stored fingerprint does not match target backup fingerprint.');
      }
      if (storedVault.publicKeyHex.toLowerCase() !== targetPublicKeyHex.toLowerCase()) {
        throw new Error('Post-migration verification failed: Stored public key does not match target backup public key.');
      }

      // Decrypt stored vault and re-derive
      const decryptedJson = await decryptWithPassword(storedVault, password);
      const secretPayload = JSON.parse(decryptedJson);
      const secretKeyHex = typeof secretPayload?.privateKeyHex === 'string'
        ? secretPayload.privateKeyHex.trim()
        : '';

      if (!isValidSecretKeyHex(secretKeyHex)) {
        throw new Error('Post-migration verification failed: Invalid secret key on storage read-back.');
      }

      const postDerived = derivePublicKeyHexFromSecretKey(secretKeyHex);
      if (postDerived.fingerprint !== targetFingerprint) {
        throw new Error('SECURITY VIOLATION: Post-migration derived fingerprint does not match pre-migration fingerprint!');
      }
      if (postDerived.publicKeyHex.toLowerCase() !== targetPublicKeyHex.toLowerCase()) {
        throw new Error('SECURITY VIOLATION: Post-migration derived public key does not match pre-migration public key!');
      }

      // Unlock volatile memory
      browserVolatilePrivateKey = secretKeyHex;
      browserVolatileFingerprint = postDerived.fingerprint;

      const diagnostics: RuntimeDiagnostics = {
        storageLocation: 'Browser Storage (Fallback)',
        status: 'unlocked',
        fingerprint: targetFingerprint,
        publicKeyHex: targetPublicKeyHex,
        customersCount: (await browserStorage.getCustomerRegistry()).length,
        historyCount: (await browserStorage.getLicenseHistory()).length,
        customAppsCount: (await browserStorage.getCustomApps()).length
      };

      this.cancelAuthorityMigration();

      return {
        success: true,
        message: 'Existing ALCO Authority successfully migrated with 100% cryptographic parity.',
        diagnostics
      };
    } catch (err: any) {
      try {
        if (prevVault) {
          await browserStorage.saveEncryptedVault(prevVault);
          await browserStorage.saveCustomerRegistry(prevCustomers);
          await browserStorage.saveLicenseHistory(prevHistory);
          await browserStorage.saveOwnerSettings(prevSettings);
          await browserStorage.saveCustomApps(prevApps);
        }
      } catch (rbErr) {
        console.error('Browser rollback failure:', rbErr);
      }

      this.cancelAuthorityMigration();
      return {
        success: false,
        error: `Migration failed and was rolled back: ${err?.message || 'Verification check failed.'}`
      };
    }
  }

  async cancelAuthorityMigration(): Promise<{ success: boolean }> {
    browserStagedMigrationBackup = null;
    browserStagedMigrationPassword = null;
    browserStagedMigrationProof = null;
    return { success: true };
  }

  async getRuntimeDiagnostics(): Promise<RuntimeDiagnostics> {
    const status = await this.getVaultStatus();
    const customers = await browserStorage.getCustomerRegistry();
    const history = await browserStorage.getLicenseHistory();
    const customApps = await browserStorage.getCustomApps();

    return {
      storageLocation: typeof window !== 'undefined' && (window as any).alcoLicense 
        ? 'Electron userData (Local Disk)' 
        : 'Browser Storage (Fallback)',
      status: status.status,
      fingerprint: status.fingerprint,
      publicKeyHex: status.publicKeyHex,
      customersCount: customers.length,
      historyCount: history.length,
      customAppsCount: customApps.length
    };
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
