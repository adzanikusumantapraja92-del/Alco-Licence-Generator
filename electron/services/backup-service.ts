/**
 * ALCO License Generator - Main Process Backup & Restore Service
 * 
 * Implements two-stage cryptographic verification and restoration proof
 * entirely within the Main Process.
 */

import { decryptWithPassword } from '../../src/modules/vault-crypto';
import { derivePublicKeyHexFromSecretKey, isStrictHex, isValidPublicKeyHex, isValidSecretKeyHex } from '../../src/modules/signing';
import { ElectronFileStorageService } from './storage-service';
import { MainVaultService } from './vault-service';
import { 
  AlcoBackupPayload 
} from '../../src/modules/persistence/persistence-interface';
import { 
  BackupValidationResult, 
  BackupVerificationResult, 
  BackupVerificationProof, 
  BackupRestoreResult 
} from '../types';
import { randomBytes } from 'node:crypto';

const MAX_BACKUP_JSON_LENGTH = 5 * 1024 * 1024;

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
  return `proof-${Date.now()}-${randomBytes(12).toString('hex')}`;
}

export class MainBackupService {
  private readonly storage: ElectronFileStorageService;
  private readonly vaultService: MainVaultService;
  private stagedBackup: AlcoBackupPayload | null = null;
  private stagedProof: BackupVerificationProof | null = null;

  constructor(storage: ElectronFileStorageService, vaultService: MainVaultService) {
    this.storage = storage;
    this.vaultService = vaultService;
  }

  async exportBackup(): Promise<string> {
    const payload = await this.storage.exportBackupPayload();
    return JSON.stringify(payload, null, 2);
  }

  validateBackup(rawJson: string): BackupValidationResult {
    try {
      if (!rawJson || !rawJson.trim()) {
        return { valid: false, error: 'Empty backup content.' };
      }
      if (rawJson.length > MAX_BACKUP_JSON_LENGTH) {
        return { valid: false, error: 'Backup content is too large.' };
      }

      const parsed = JSON.parse(rawJson) as AlcoBackupPayload;

      if (parsed.alcoVaultVersion !== '2.0-encrypted') {
        return { valid: false, error: 'Incompatible backup format. Expected alcoVaultVersion 2.0-encrypted.' };
      }

      if (!parsed.encryptedVault) {
        return { valid: false, error: 'Missing encryptedVault field in backup file.' };
      }

      const v = parsed.encryptedVault;
      if (v.version !== '2.0-aes-gcm' || v.algorithm !== 'AES-256-GCM') {
        return {
          valid: false,
          error: `Incompatible vault encryption: ${v.version || 'legacy'}. Only 2.0-aes-gcm supported.`
        };
      }

      if (!v.ciphertextHex || !v.saltHex || !v.ivHex || !v.publicKeyHex || !v.fingerprint) {
        return { valid: false, error: 'Incomplete vault encryption parameters.' };
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
      return { valid: false, error: `Invalid JSON structure: ${err?.message}` };
    }
  }

  async verifyBackupDecryption(
    backup: AlcoBackupPayload,
    password: string
  ): Promise<BackupVerificationResult> {
    const valResult = this.validateBackup(JSON.stringify(backup));
    if (!valResult.valid || !valResult.backup) {
      return { success: false, error: valResult.error || 'Invalid backup structure.' };
    }

    const v = backup.encryptedVault;

    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: v.ciphertextHex,
          saltHex: v.saltHex,
          ivHex: v.ivHex,
          iterations: v.iterations
        },
        password
      );

      const parsed = JSON.parse(decryptedJson);
      const privateKeyHex = typeof parsed?.privateKeyHex === 'string' ? parsed.privateKeyHex.trim() : '';
      if (!isValidSecretKeyHex(privateKeyHex)) {
        return { success: false, error: 'Corrupted backup: Invalid Ed25519 private key format.' };
      }

      const derived = derivePublicKeyHexFromSecretKey(privateKeyHex);
      if (derived.publicKeyHex.toLowerCase() !== v.publicKeyHex.toLowerCase()) {
        return { success: false, error: 'Corrupted backup: Decrypted private key does not match backup public key.' };
      }
      if (derived.fingerprint !== v.fingerprint) {
        return { success: false, error: 'Corrupted backup: Fingerprint does not match decrypted private key.' };
      }

      const recordCount = Array.isArray(backup.history) ? backup.history.length : 0;
      const customerCount = Array.isArray(backup.customers) ? backup.customers.length : 0;
      const currentVault = await this.storage.getEncryptedVault();
      const isDifferentAuthority = !!currentVault && currentVault.fingerprint !== v.fingerprint;

      const proof: BackupVerificationProof = {
        proofId: createProofId(),
        backupFingerprint: v.fingerprint,
        backupPublicKeyHex: v.publicKeyHex,
        recordCount,
        customerCount,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes TTL
      };

      this.stagedBackup = backup;
      this.stagedProof = proof;

      return {
        success: true,
        proof,
        backupFingerprint: v.fingerprint,
        backupPublicKeyHex: v.publicKeyHex,
        isDifferentAuthority,
        recordCount,
        customerCount
      };
    } catch (err: any) {
      this.stagedBackup = null;
      this.stagedProof = null;
      return {
        success: false,
        error: err?.message || 'Decryption failed: Incorrect Master Password for this backup.'
      };
    }
  }

  async commitRestore(proof: BackupVerificationProof): Promise<BackupRestoreResult> {
    if (!this.stagedBackup || !this.stagedProof) {
      return {
        success: false,
        error: 'No verified backup staged. You must verify decryption first.'
      };
    }

    if (this.stagedProof.proofId !== proof.proofId) {
      return {
        success: false,
        error: 'Invalid restoration proof. Staged proof ID mismatch.'
      };
    }

    if (
      this.stagedProof.backupFingerprint !== proof.backupFingerprint ||
      this.stagedProof.backupPublicKeyHex !== proof.backupPublicKeyHex
    ) {
      return {
        success: false,
        error: 'Invalid restoration proof. Authority identity mismatch.'
      };
    }

    if (Date.now() > this.stagedProof.expiresAt) {
      this.cancelStagedRestore();
      return {
        success: false,
        error: 'Restoration proof expired (5-minute TTL exceeded). Please re-verify.'
      };
    }

    try {
      await this.storage.restoreFromBackupPayload(this.stagedBackup);
      // Lock current authority so owner is prompted with restored credentials
      await this.vaultService.lockVault();

      this.stagedBackup = null;
      this.stagedProof = null;

      return {
        success: true,
        message: 'Encrypted vault and licensing data restored successfully.'
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to restore backup payload.'
      };
    }
  }

  cancelStagedRestore(): void {
    this.stagedBackup = null;
    this.stagedProof = null;
  }
}
