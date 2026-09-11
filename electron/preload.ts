/**
 * ALCO License Generator - Electron Preload Script
 * 
 * CRITICAL SECURITY ARCHITECTURE:
 * - Runs in isolated context (contextIsolation: true).
 * - Renderer receives NO Node.js APIs, NO direct fs, NO raw ipcRenderer, NO arbitrary IPC.
 * - Exposes only a narrow, strictly typed, audited API via window.alcoLicense.
 * - NEVER leaks privateKeyHex to Renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { ALCO_IPC_CHANNELS } from './ipc/channels';
import { 
  IAlcoLicenseRendererApi, 
  VaultSetupInput, 
  VaultUnlockInput, 
  VaultChangePasswordInput, 
  GenerateLicenseInput, 
  UpsertCustomerInput, 
  BackupVerificationProof, 
  AlcoBackupPayload 
} from './types';
import { AlcoLicenseRecord, AlcoAppDefinition } from '../src/modules/types';
import { OwnerSettings } from '../src/modules/persistence/persistence-interface';

const alcoLicenseApi: IAlcoLicenseRendererApi = {
  // Vault
  getVaultStatus: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_GET_STATUS),
  setupVault: (input: VaultSetupInput) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_SETUP, input),
  unlockVault: (input: VaultUnlockInput) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_UNLOCK, input),
  lockVault: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_LOCK),
  changePassword: (input: VaultChangePasswordInput) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_CHANGE_PASSWORD, input),

  // License Signing (Main Process signs payload with memory-bound Ed25519 key)
  generateLicense: (input: GenerateLicenseInput) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.LICENSE_GENERATE, input),

  // Customer Registry
  getCustomers: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.CUSTOMERS_GET_ALL),
  upsertCustomer: (input: UpsertCustomerInput) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.CUSTOMERS_UPSERT, input),

  // License History
  getHistory: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_GET_ALL),
  saveLicenseRecord: (record: AlcoLicenseRecord) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_SAVE, record),
  updateLicenseStatus: (id: string, status: 'active' | 'revoked') => ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_UPDATE_STATUS, { id, status }),
  deleteLicenseRecord: (id: string) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_DELETE, { id }),

  // Custom App Registry
  getCustomApps: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.APPS_GET_CUSTOM),
  saveCustomApps: (apps: AlcoAppDefinition[]) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.APPS_SAVE_CUSTOM, apps),

  // Settings
  getSettings: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.SETTINGS_GET),
  saveSettings: (settings: OwnerSettings) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.SETTINGS_SAVE, settings),

  // Backup & Restore
  exportBackup: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_EXPORT),
  validateBackup: (rawJson: string) => ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_VALIDATE, rawJson),
  verifyBackupDecryption: (backup: AlcoBackupPayload, password: string) => 
    ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_VERIFY, { backup, password }),
  commitRestoreBackup: (proof: BackupVerificationProof) => 
    ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_COMMIT, proof),
  cancelStagedRestore: () => ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_CANCEL),

  // Safe Authority Migration (Phase 4)
  stageAuthorityMigration: (rawJson: string, password: string) => 
    ipcRenderer.invoke(ALCO_IPC_CHANNELS.MIGRATION_STAGE, { rawJson, password }),
  commitAuthorityMigration: (input) => 
    ipcRenderer.invoke(ALCO_IPC_CHANNELS.MIGRATION_COMMIT, input),
  cancelAuthorityMigration: () => 
    ipcRenderer.invoke(ALCO_IPC_CHANNELS.MIGRATION_CANCEL),
  getRuntimeDiagnostics: () => 
    ipcRenderer.invoke(ALCO_IPC_CHANNELS.DIAGNOSTICS_GET)
};

// Expose safe API to Window
contextBridge.exposeInMainWorld('alcoLicense', alcoLicenseApi);
