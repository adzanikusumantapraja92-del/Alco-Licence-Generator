/**
 * ALCO License Generator - Electron IPC Handler Registration
 * 
 * Maps explicit IPC channels to Main Process services.
 * Enforces boundary security and guarantees privateKeyHex is NEVER returned.
 */

import { ipcMain } from 'electron';
import { ALCO_IPC_CHANNELS } from './channels';
import { MainVaultService } from '../services/vault-service';
import { MainSigningService } from '../services/signing-service';
import { ElectronFileStorageService } from '../services/storage-service';
import { MainBackupService } from '../services/backup-service';
import { MainMigrationService } from '../services/migration-service';
import { 
  VaultSetupInput, 
  VaultUnlockInput, 
  VaultChangePasswordInput, 
  GenerateLicenseInput, 
  UpsertCustomerInput, 
  BackupVerificationProof, 
  AlcoBackupPayload,
  MigrationCommitInput
} from '../types';
import { resolveOrCreateCustomerRecord } from '../../src/modules/customer-registry';
import { AlcoCustomerRecord, AlcoLicenseRecord, AlcoAppDefinition } from '../../src/modules/types';
import { OwnerSettings } from '../../src/modules/persistence/persistence-interface';

export function registerIpcHandlers(
  vaultService: MainVaultService,
  signingService: MainSigningService,
  storageService: ElectronFileStorageService,
  backupService: MainBackupService,
  migrationService?: MainMigrationService
): void {
  // -------------------------------------------------------------
  // Vault Channels
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_GET_STATUS, async () => {
    return await vaultService.getStatus();
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_SETUP, async (_event, input: VaultSetupInput) => {
    return await vaultService.setupVault(input.masterPassword, input.vaultHint);
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_UNLOCK, async (_event, input: VaultUnlockInput) => {
    const result = await vaultService.unlockVault(input.masterPassword);
    // Extra safety assurance: delete privateKeyHex if somehow present
    if ((result as any).privateKeyHex) {
      delete (result as any).privateKeyHex;
    }
    return result;
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_LOCK, async () => {
    return await vaultService.lockVault();
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_CHANGE_PASSWORD, async (_event, input: VaultChangePasswordInput) => {
    return await vaultService.changePassword(input.currentPassword, input.newPassword, input.vaultHint);
  });

  // -------------------------------------------------------------
  // License Signing Channel
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.LICENSE_GENERATE, async (_event, input: GenerateLicenseInput) => {
    return await signingService.generateLicense(input);
  });

  // -------------------------------------------------------------
  // Customer Registry Channels
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.CUSTOMERS_GET_ALL, async () => {
    return await storageService.getCustomerRegistry();
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.CUSTOMERS_UPSERT, async (_event, input: UpsertCustomerInput) => {
    const registry = await storageService.getCustomerRegistry();
    const resolution = resolveOrCreateCustomerRecord(registry, {
      name: input.name,
      email: input.email,
      whatsapp: input.whatsapp,
      segment: input.segment,
      acquisitionSource: input.acquisitionSource,
      marketingConsent: input.marketingConsent
    });

    if (resolution.created || resolution.updatedRegistry.length !== registry.length) {
      await storageService.saveCustomerRegistry(resolution.updatedRegistry);
    }

    return {
      customer: resolution.customer,
      created: resolution.created
    };
  });

  // -------------------------------------------------------------
  // License History Channels
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_GET_ALL, async () => {
    return await storageService.getLicenseHistory();
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_SAVE, async (_event, record: AlcoLicenseRecord) => {
    await storageService.appendLicenseRecord(record);
    return { success: true };
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_UPDATE_STATUS, async (_event, { id, status }: { id: string; status: 'active' | 'revoked' }) => {
    await storageService.updateLicenseStatus(id, status);
    return { success: true };
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_DELETE, async (_event, { id }: { id: string }) => {
    await storageService.deleteLicenseRecord(id);
    return { success: true };
  });

  // -------------------------------------------------------------
  // Apps Channels
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.APPS_GET_CUSTOM, async () => {
    return await storageService.getCustomApps();
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.APPS_SAVE_CUSTOM, async (_event, apps: AlcoAppDefinition[]) => {
    await storageService.saveCustomApps(apps);
    return { success: true };
  });

  // -------------------------------------------------------------
  // Settings Channels
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.SETTINGS_GET, async () => {
    return await storageService.getOwnerSettings();
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.SETTINGS_SAVE, async (_event, settings: OwnerSettings) => {
    await storageService.saveOwnerSettings(settings);
    return { success: true };
  });

  // -------------------------------------------------------------
  // Backup Channels
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_EXPORT, async () => {
    return await backupService.exportBackup();
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_VALIDATE, async (_event, rawJson: string) => {
    return backupService.validateBackup(rawJson);
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_VERIFY, async (_event, { backup, password }: { backup: AlcoBackupPayload; password: string }) => {
    return await backupService.verifyBackupDecryption(backup, password);
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_COMMIT, async (_event, proof: BackupVerificationProof) => {
    return await backupService.commitRestore(proof);
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_CANCEL, async () => {
    backupService.cancelStagedRestore();
    return { success: true };
  });

  // -------------------------------------------------------------
  // Safe Authority Migration Channels (Phase 4)
  // -------------------------------------------------------------
  ipcMain.handle(ALCO_IPC_CHANNELS.MIGRATION_STAGE, async (_event, { rawJson, password }: { rawJson: string; password: string }) => {
    if (!migrationService) {
      return { success: false, error: 'Migration service not initialized on Main process.' };
    }
    return await migrationService.stageMigration(rawJson, password);
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.MIGRATION_COMMIT, async (_event, input: MigrationCommitInput) => {
    if (!migrationService) {
      return { success: false, error: 'Migration service not initialized on Main process.' };
    }
    return await migrationService.commitMigration(input);
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.MIGRATION_CANCEL, async () => {
    if (migrationService) {
      migrationService.cancelMigration();
    }
    return { success: true };
  });

  ipcMain.handle(ALCO_IPC_CHANNELS.DIAGNOSTICS_GET, async () => {
    if (!migrationService) {
      const status = await vaultService.getStatus();
      const customers = await storageService.getCustomerRegistry();
      const history = await storageService.getLicenseHistory();
      const customApps = await storageService.getCustomApps();
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
    return await migrationService.getRuntimeDiagnostics();
  });
}
