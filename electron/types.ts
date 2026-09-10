/**
 * ALCO License Generator - Electron IPC Interface Definitions
 * 
 * Strict typing for ContextBridge and Main Process IPC Handlers.
 * CRITICAL SECURITY RULE:
 * - privateKeyHex is strictly forbidden in any Renderer-facing return type!
 */

import { 
  VaultStatus, 
  AlcoPlan, 
  AlcoLicenseType, 
  AlcoLicensePayload, 
  AlcoLicenseRecord, 
  AlcoCustomerRecord, 
  AlcoAppDefinition, 
  OwnerKeyPair 
} from '../src/modules/types';
import { 
  OwnerSettings, 
  AlcoBackupPayload 
} from '../src/modules/persistence/persistence-interface';

export type { AlcoBackupPayload };

// ==========================================
// Vault IPC
// ==========================================

export interface VaultStatusResult {
  status: VaultStatus;
  fingerprint?: string;
  publicKeyHex?: string;
  createdAt?: string;
  vaultHint?: string;
}

export interface VaultSetupInput {
  masterPassword: string;
  vaultHint?: string;
}

export interface VaultSetupResult {
  success: boolean;
  status: VaultStatus;
  fingerprint: string;
  publicKeyHex: string;
  createdAt: string;
  error?: string;
}

export interface VaultUnlockInput {
  masterPassword: string;
}

export interface VaultUnlockResult {
  success: boolean;
  status: VaultStatus;
  fingerprint?: string;
  publicKeyHex?: string;
  error?: string;
  // NOTE: privateKeyHex is DELIBERATELY OMITTED. It never leaves Main Process!
}

export interface VaultLockResult {
  success: boolean;
}

export interface VaultChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  vaultHint?: string;
}

export interface VaultChangePasswordResult {
  success: boolean;
  error?: string;
}

// ==========================================
// License Signing IPC
// ==========================================

export interface GenerateLicenseInput {
  appId: string;
  deviceId: string;
  customerId: string;
  customerName?: string;
  plan: AlcoPlan;
  licenseType: AlcoLicenseType;
  features: string[];
  expiresAt: string | null;
  issuedAt?: string;
  metadata?: {
    issuedBy?: string;
    appName?: string;
    notes?: string;
  };
}

export interface GenerateLicenseResult {
  success: boolean;
  licenseKey?: string;
  payload?: AlcoLicensePayload;
  signature?: string;
  canonicalString?: string;
  error?: string;
}

// ==========================================
// Customer Registry IPC
// ==========================================

export interface UpsertCustomerInput {
  name: string;
  email: string;
  whatsapp?: string;
  segment?: string;
  acquisitionSource?: string;
  marketingConsent?: boolean;
}

export interface UpsertCustomerResult {
  customer: AlcoCustomerRecord;
  created: boolean;
}

// ==========================================
// Backup & Restore IPC
// ==========================================

export interface BackupVerificationProof {
  proofId: string;
  backupFingerprint: string;
  backupPublicKeyHex: string;
  recordCount: number;
  customerCount?: number;
  issuedAt: number;
  expiresAt: number;
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  backup?: AlcoBackupPayload;
}

export interface BackupVerificationResult {
  success: boolean;
  proof?: BackupVerificationProof;
  error?: string;
  backupPublicKeyHex?: string;
  backupFingerprint?: string;
  isDifferentAuthority?: boolean;
  recordCount?: number;
  customerCount?: number;
}

export interface BackupRestoreResult {
  success: boolean;
  message?: string;
  error?: string;
}

// ==========================================
// Window.alcoLicense Renderer API
// ==========================================

export interface IAlcoLicenseRendererApi {
  // Vault
  getVaultStatus(): Promise<VaultStatusResult>;
  setupVault(input: VaultSetupInput): Promise<VaultSetupResult>;
  unlockVault(input: VaultUnlockInput): Promise<VaultUnlockResult>;
  lockVault(): Promise<VaultLockResult>;
  changePassword(input: VaultChangePasswordInput): Promise<VaultChangePasswordResult>;

  // Signing (Main Process performs canonicalization & Ed25519 signing)
  generateLicense(input: GenerateLicenseInput): Promise<GenerateLicenseResult>;

  // Customer Registry
  getCustomers(): Promise<AlcoCustomerRecord[]>;
  upsertCustomer(input: UpsertCustomerInput): Promise<UpsertCustomerResult>;

  // License History
  getHistory(): Promise<AlcoLicenseRecord[]>;
  saveLicenseRecord(record: AlcoLicenseRecord): Promise<{ success: boolean }>;
  updateLicenseStatus(id: string, status: 'active' | 'revoked'): Promise<{ success: boolean }>;
  deleteLicenseRecord(id: string): Promise<{ success: boolean }>;

  // App Registry
  getCustomApps(): Promise<AlcoAppDefinition[]>;
  saveCustomApps(apps: AlcoAppDefinition[]): Promise<{ success: boolean }>;

  // Settings
  getSettings(): Promise<OwnerSettings>;
  saveSettings(settings: OwnerSettings): Promise<{ success: boolean }>;

  // Backup & Restore
  exportBackup(): Promise<string>;
  validateBackup(rawJson: string): Promise<BackupValidationResult>;
  verifyBackupDecryption(backup: AlcoBackupPayload, password: string): Promise<BackupVerificationResult>;
  commitRestoreBackup(proof: BackupVerificationProof): Promise<BackupRestoreResult>;
  cancelStagedRestore(): Promise<{ success: boolean }>;
}
