/**
 * ALCO License Generator - Main Process Vault Authority Service
 * 
 * CRITICAL SECURITY INVARIANT:
 * - Owns the decrypted Ed25519 private key in Main Process memory only.
 * - Private key is strictly isolated in volatile RAM.
 * - Never returns privateKeyHex through IPC methods.
 * - Clears JavaScript references on lock or application shutdown.
 */

import { EncryptedOwnerVault, VaultStatus } from '../../src/modules/types';
import { encryptWithPassword, decryptWithPassword } from '../../src/modules/vault-crypto';
import { derivePublicKeyHexFromSecretKey, generateEd25519KeyPair, isValidSecretKeyHex } from '../../src/modules/signing';
import { ElectronFileStorageService } from './storage-service';
import { 
  VaultStatusResult, 
  VaultSetupResult, 
  VaultUnlockResult, 
  VaultLockResult, 
  VaultChangePasswordResult 
} from '../types';

export class MainVaultService {
  private inMemoryPrivateKeyHex: string | null = null;
  private inMemoryFingerprint: string | null = null;
  private readonly storage: ElectronFileStorageService;

  constructor(storage: ElectronFileStorageService) {
    this.storage = storage;
  }

  private validateSecretMatchesVault(secretPayload: any, vault: EncryptedOwnerVault): string {
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

  isUnlocked(): boolean {
    return !!this.inMemoryPrivateKeyHex;
  }

  async getStatus(): Promise<VaultStatusResult> {
    const vault = await this.storage.getEncryptedVault();
    if (!vault) {
      return { status: 'uninitialized' };
    }

    const isUnlocked = this.isUnlocked();
    return {
      status: isUnlocked ? 'unlocked' : 'locked',
      fingerprint: vault.fingerprint,
      publicKeyHex: vault.publicKeyHex,
      createdAt: vault.createdAt,
      vaultHint: vault.vaultHint
    };
  }

  async setupVault(masterPassword: string, vaultHint?: string): Promise<VaultSetupResult> {
    if (!masterPassword || masterPassword.length < 8) {
      return {
        success: false,
        status: 'uninitialized',
        fingerprint: '',
        publicKeyHex: '',
        createdAt: '',
        error: 'Master Password must be at least 8 characters long.'
      };
    }

    const hasVault = await this.storage.hasOwnerVault();
    if (hasVault) {
      return {
        success: false,
        status: 'locked',
        fingerprint: '',
        publicKeyHex: '',
        createdAt: '',
        error: 'Vault already exists. Setup aborted.'
      };
    }

    // Generate authoritative Ed25519 keypair
    const authorityKeyPair = generateEd25519KeyPair();

    const secretPayload = JSON.stringify({
      privateKeyHex: authorityKeyPair.privateKeyHex,
      fingerprint: authorityKeyPair.fingerprint,
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
      publicKeyHex: authorityKeyPair.publicKeyHex,
      fingerprint: authorityKeyPair.fingerprint,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      vaultHint: vaultHint?.trim() || undefined
    };

    await this.storage.saveEncryptedVault(vault);

    // Keep active in volatile RAM for immediate operational readiness
    this.inMemoryPrivateKeyHex = authorityKeyPair.privateKeyHex;
    this.inMemoryFingerprint = authorityKeyPair.fingerprint;

    return {
      success: true,
      status: 'unlocked',
      fingerprint: authorityKeyPair.fingerprint,
      publicKeyHex: authorityKeyPair.publicKeyHex,
      createdAt: vault.createdAt
    };
  }

  async unlockVault(masterPassword: string): Promise<VaultUnlockResult> {
    const vault = await this.storage.getEncryptedVault();
    if (!vault) {
      return {
        success: false,
        status: 'uninitialized',
        error: 'No encrypted vault found. Setup required.'
      };
    }

    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: vault.ciphertextHex,
          saltHex: vault.saltHex,
          ivHex: vault.ivHex,
          iterations: vault.iterations
        },
        masterPassword
      );

      const secretPayload = JSON.parse(decryptedJson);
      const privateKeyHex = this.validateSecretMatchesVault(secretPayload, vault);

      this.inMemoryPrivateKeyHex = privateKeyHex;
      this.inMemoryFingerprint = vault.fingerprint;

      return {
        success: true,
        status: 'unlocked',
        fingerprint: vault.fingerprint,
        publicKeyHex: vault.publicKeyHex
      };
    } catch (err: any) {
      this.inMemoryPrivateKeyHex = null;
      this.inMemoryFingerprint = null;
      return {
        success: false,
        status: 'locked',
        error: err?.message || 'Incorrect Master Password.'
      };
    }
  }

  async lockVault(): Promise<VaultLockResult> {
    // Release JavaScript references to the active private key.
    this.inMemoryPrivateKeyHex = null;
    this.inMemoryFingerprint = null;
    return { success: true };
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    vaultHint?: string
  ): Promise<VaultChangePasswordResult> {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'New Master Password must be at least 8 characters long.' };
    }

    const vault = await this.storage.getEncryptedVault();
    if (!vault) {
      return { success: false, error: 'No encrypted vault found.' };
    }

    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: vault.ciphertextHex,
          saltHex: vault.saltHex,
          ivHex: vault.ivHex,
          iterations: vault.iterations
        },
        currentPassword
      );

      const secretPayload = JSON.parse(decryptedJson);
      const privateKeyHex = this.validateSecretMatchesVault(secretPayload, vault);

      const newEncrypted = await encryptWithPassword(decryptedJson, newPassword);

      const updatedVault: EncryptedOwnerVault = {
        ...vault,
        iterations: newEncrypted.iterations,
        saltHex: newEncrypted.saltHex,
        ivHex: newEncrypted.ivHex,
        ciphertextHex: newEncrypted.ciphertextHex,
        updatedAt: new Date().toISOString(),
        vaultHint: vaultHint !== undefined ? vaultHint.trim() || undefined : vault.vaultHint
      };

      await this.storage.saveEncryptedVault(updatedVault);

      if (this.isUnlocked()) {
        this.inMemoryPrivateKeyHex = privateKeyHex;
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to change Master Password.' };
    }
  }

  /**
   * Internal access for Main Process Signing Service ONLY.
   * This is never exposed through IPC.
   */
  getActivePrivateKeyForSigning(): string {
    if (!this.inMemoryPrivateKeyHex) {
      throw new Error('Authority Vault is locked. Unlock vault with Master Password first.');
    }
    return this.inMemoryPrivateKeyHex;
  }
}
