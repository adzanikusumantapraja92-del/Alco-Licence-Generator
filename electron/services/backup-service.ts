/**
 * ALCO License Generator - Main Process Backup & Restore Service
 * 
 * Implements two-stage cryptographic verification and restoration proof
 * entirely within the Main Process.
 */

import { decryptWithPassword } from '../../src/modules/vault-crypto';
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

      const parsed = JSON.parse(rawJson) as AlcoBackupPayload;

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
      if (!parsed.privateKeyHex) {
        return { success: false, error: 'Corrupted backup: Private key is missing.' };
      }

      const recordCount = Array.isArray(backup.history) ? backup.history.length : 0;
      const customerCount = Array.isArray(backup.customers) ? backup.customers.length : 0;

      const proof: BackupVerificationProof = {
        proofId: `proof-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
