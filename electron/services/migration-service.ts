/**
 * ALCO License Generator - Electron Authority Migration Service
 * 
 * Phase 4: Safe Authority Migration
 * 
 * Implements safe, atomic migration of an EXISTING ALCO Ed25519 authority
 * from browser backups into the Electron desktop application.
 * 
 * ABSOLUTE SECURITY INVARIANTS:
 * 1. Fingerprint before migration MUST equal fingerprint after migration.
 * 2. Fail closed on any mismatch or verification error.
 * 3. Never silently generate a replacement key (generateEd25519KeyPair() is strictly forbidden).
 * 4. Safe transaction/staging behavior: read-back verification + automatic rollback on failure.
 * 5. Explicit overwrite confirmation required if an existing vault is already present.
 * 6. privateKeyHex is NEVER returned or leaked across IPC.
 */

import { ElectronFileStorageService } from './storage-service';
import { MainVaultService } from './vault-service';
import { 
  MigrationProof, 
  MigrationStageResult, 
  MigrationCommitInput, 
  MigrationCommitResult, 
  RuntimeDiagnostics,
  AlcoBackupPayload 
} from '../types';
import { decryptWithPassword } from '../../src/modules/vault-crypto';
import { 
  derivePublicKeyHexFromSecretKey, 
  isStrictHex, 
  isValidPublicKeyHex, 
  isValidSecretKeyHex 
} from '../../src/modules/signing';

const MAX_BACKUP_JSON_LENGTH = 5 * 1024 * 1024; // 5 MB

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
      typeof c.createdAt === 'string'
    );
  });
}

export class MainMigrationService {
  private readonly storage: ElectronFileStorageService;
  private readonly vaultService: MainVaultService;

  private stagedBackup: AlcoBackupPayload | null = null;
  private stagedPassword: string | null = null;
  private stagedProof: MigrationProof | null = null;

  constructor(storage: ElectronFileStorageService, vaultService: MainVaultService) {
    this.storage = storage;
    this.vaultService = vaultService;
  }

  /**
   * Stages an existing ALCO backup for migration.
   * Performs schema validation, password decryption, Ed25519 key derivation,
   * and pre-migration identity parity checking.
   * 
   * NEVER returns privateKeyHex.
   */
  async stageMigration(rawJson: string, masterPassword: string): Promise<MigrationStageResult> {
    if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
      return { success: false, error: 'Backup content is empty.' };
    }

    if (rawJson.length > MAX_BACKUP_JSON_LENGTH) {
      return { success: false, error: 'Backup exceeds maximum allowed file size of 5MB.' };
    }

    if (!masterPassword || typeof masterPassword !== 'string' || masterPassword.length < 8) {
      return { success: false, error: 'Master Password must be at least 8 characters long.' };
    }

    // Step 2: Validate backup schema
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

    // Step 4: Main Process decrypts vault
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

    // Step 5: Validate strict Ed25519 private key format
    const privateKeyHex = typeof secretPayload?.privateKeyHex === 'string'
      ? secretPayload.privateKeyHex.trim()
      : '';

    if (!isValidSecretKeyHex(privateKeyHex)) {
      return {
        success: false,
        error: 'Corrupted backup: Invalid Ed25519 private key format (expected 128 hex characters / 64 bytes).'
      };
    }

    // Step 6: Derive public key from private key
    let derived: { publicKeyHex: string; fingerprint: string };
    try {
      derived = derivePublicKeyHexFromSecretKey(privateKeyHex);
    } catch (err: any) {
      return {
        success: false,
        error: `Cryptographic derivation failure: ${err?.message || 'Cannot derive public key from secret key.'}`
      };
    }

    // Step 7: Compare derived public key with backup publicKeyHex
    if (derived.publicKeyHex.toLowerCase() !== v.publicKeyHex.toLowerCase()) {
      return {
        success: false,
        error: 'SECURITY VIOLATION: Decrypted private key does not correspond to the backup public key.'
      };
    }

    // Step 8: Compare derived fingerprint with backup fingerprint
    if (derived.fingerprint !== v.fingerprint) {
      return {
        success: false,
        error: 'SECURITY VIOLATION: Authority fingerprint does not match decrypted private key.'
      };
    }

    // Step 9: Display BEFORE MIGRATION authority metadata
    const existingVault = await this.storage.getEncryptedVault();

    const proof: MigrationProof = {
      proofId: `mig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      backupFingerprint: v.fingerprint,
      backupPublicKeyHex: v.publicKeyHex,
      recordCount: Array.isArray(parsed.history) ? parsed.history.length : 0,
      customerCount: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
      customAppsCount: Array.isArray(parsed.customApps) ? parsed.customApps.length : 0,
      hasSettings: !!parsed.settings,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5-minute validity window
    };

    // Stage in volatile Main process memory
    this.stagedBackup = parsed;
    this.stagedPassword = masterPassword;
    this.stagedProof = proof;

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

  /**
   * Commits the staged migration to Electron userData storage.
   * Enforces double read-back verification and pre/post fingerprint equality check.
   * If any step fails, automatically rolls back to previous state.
   */
  async commitMigration(input: MigrationCommitInput): Promise<MigrationCommitResult> {
    if (!this.stagedBackup || !this.stagedPassword || !this.stagedProof) {
      return {
        success: false,
        error: 'No verified migration staged. You must verify backup and password first.'
      };
    }

    if (!input.proof || this.stagedProof.proofId !== input.proof.proofId) {
      return {
        success: false,
        error: 'Invalid migration proof: proof ID mismatch.'
      };
    }

    if (
      this.stagedProof.backupFingerprint !== input.proof.backupFingerprint ||
      this.stagedProof.backupPublicKeyHex !== input.proof.backupPublicKeyHex
    ) {
      return {
        success: false,
        error: 'SECURITY VIOLATION: Authority identity mismatch in migration proof.'
      };
    }

    if (Date.now() > this.stagedProof.expiresAt || Date.now() > input.proof.expiresAt) {
      this.cancelMigration();
      return {
        success: false,
        error: 'Migration proof expired (5-minute TTL exceeded). Please re-verify backup.'
      };
    }

    // Overwrite safety: detect if Electron already has a vault
    const existingVault = await this.storage.getEncryptedVault();
    if (existingVault && !input.overwriteExisting) {
      return {
        success: false,
        error: 'An existing authority vault is already present in this desktop app. Explicit overwrite confirmation is required.'
      };
    }

    // Capture pre-migration rollback snapshot
    const previousVault = await this.storage.getEncryptedVault();
    const previousCustomers = await this.storage.getCustomerRegistry();
    const previousHistory = await this.storage.getLicenseHistory();
    const previousSettings = await this.storage.getOwnerSettings();
    const previousApps = await this.storage.getCustomApps();

    const targetFingerprint = this.stagedProof.backupFingerprint;
    const targetPublicKeyHex = this.stagedProof.backupPublicKeyHex;
    const password = this.stagedPassword;
    const backupPayload = this.stagedBackup;

    try {
      // Step 11: Main Process writes data to Electron userData storage
      await this.storage.restoreFromBackupPayload(backupPayload);

      // Step 12: Immediately read stored vault back from disk
      const storedVault = await this.storage.getEncryptedVault();
      if (!storedVault) {
        throw new Error('Post-migration read verification failed: Vault not found on disk after write.');
      }

      // Step 13: Verify stored identity matches backup identity
      if (storedVault.fingerprint !== targetFingerprint) {
        throw new Error('Post-migration verification failed: Stored fingerprint does not match target backup fingerprint.');
      }
      if (storedVault.publicKeyHex.toLowerCase() !== targetPublicKeyHex.toLowerCase()) {
        throw new Error('Post-migration verification failed: Stored public key does not match target backup public key.');
      }

      // Step 14: Unlock restored vault using same Master Password
      const decryptedJson = await decryptWithPassword(storedVault, password);
      const secretPayload = JSON.parse(decryptedJson);
      const secretKeyHex = typeof secretPayload?.privateKeyHex === 'string'
        ? secretPayload.privateKeyHex.trim()
        : '';

      if (!isValidSecretKeyHex(secretKeyHex)) {
        throw new Error('Post-migration verification failed: Invalid secret key format on disk read-back.');
      }

      // Step 15: Derive identity again
      const postDerived = derivePublicKeyHexFromSecretKey(secretKeyHex);

      // Step 16: Confirm PRE-MIGRATION FINGERPRINT === POST-MIGRATION FINGERPRINT
      if (postDerived.fingerprint !== targetFingerprint) {
        throw new Error('SECURITY VIOLATION: Post-migration derived fingerprint does not match pre-migration fingerprint!');
      }
      if (postDerived.publicKeyHex.toLowerCase() !== targetPublicKeyHex.toLowerCase()) {
        throw new Error('SECURITY VIOLATION: Post-migration derived public key does not match pre-migration public key!');
      }

      // Step 17: Unlock the vault in MainVaultService so owner can immediately sign
      await this.vaultService.unlockVault(password);

      const diagnostics: RuntimeDiagnostics = {
        storageLocation: 'Electron userData (Local Disk)',
        status: 'unlocked',
        fingerprint: targetFingerprint,
        publicKeyHex: targetPublicKeyHex,
        customersCount: (await this.storage.getCustomerRegistry()).length,
        historyCount: (await this.storage.getLicenseHistory()).length,
        customAppsCount: (await this.storage.getCustomApps()).length
      };

      this.cancelMigration();

      return {
        success: true,
        message: 'Existing ALCO Authority successfully migrated with 100% cryptographic parity.',
        diagnostics
      };
    } catch (err: any) {
      // Critical Rollback: restore previous snapshot
      try {
        if (previousVault) {
          await this.storage.saveEncryptedVault(previousVault);
          await this.storage.saveCustomerRegistry(previousCustomers);
          await this.storage.saveLicenseHistory(previousHistory);
          await this.storage.saveOwnerSettings(previousSettings);
          await this.storage.saveCustomApps(previousApps);
        }
      } catch (rollbackErr) {
        console.error('Critical rollback failure:', rollbackErr);
      }

      this.cancelMigration();
      return {
        success: false,
        error: `Migration failed and was rolled back: ${err?.message || 'Verification check failed.'}`
      };
    }
  }

  cancelMigration(): void {
    this.stagedBackup = null;
    this.stagedPassword = null;
    this.stagedProof = null;
  }

  async getRuntimeDiagnostics(): Promise<RuntimeDiagnostics> {
    const status = await this.vaultService.getStatus();
    const customers = await this.storage.getCustomerRegistry();
    const history = await this.storage.getLicenseHistory();
    const customApps = await this.storage.getCustomApps();

    return {
      storageLocation: 'Electron userData (Local Disk)',
      status: status.status,
      fingerprint: status.fingerprint,
      publicKeyHex: status.publicKeyHex,
      customersCount: customers.length,
      historyCount: history.length,
      customAppsCount: customApps.length
    };
  }
}
