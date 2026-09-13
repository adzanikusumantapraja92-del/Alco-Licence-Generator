// electron/preload.ts
var import_electron = require("electron");

// electron/ipc/channels.ts
var ALCO_IPC_CHANNELS = {
  // Vault
  VAULT_GET_STATUS: "alco:vault:getStatus",
  VAULT_SETUP: "alco:vault:setup",
  VAULT_UNLOCK: "alco:vault:unlock",
  VAULT_LOCK: "alco:vault:lock",
  VAULT_CHANGE_PASSWORD: "alco:vault:changePassword",
  // Signing
  LICENSE_GENERATE: "alco:license:generate",
  // Customers
  CUSTOMERS_GET_ALL: "alco:customers:getAll",
  CUSTOMERS_UPSERT: "alco:customers:upsert",
  // History
  HISTORY_GET_ALL: "alco:history:getAll",
  HISTORY_SAVE: "alco:history:save",
  HISTORY_UPDATE_STATUS: "alco:history:updateStatus",
  HISTORY_DELETE: "alco:history:delete",
  // Apps
  APPS_GET_CUSTOM: "alco:apps:getCustom",
  APPS_SAVE_CUSTOM: "alco:apps:saveCustom",
  // Settings
  SETTINGS_GET: "alco:settings:get",
  SETTINGS_SAVE: "alco:settings:save",
  // Backup
  BACKUP_EXPORT: "alco:backup:export",
  BACKUP_VALIDATE: "alco:backup:validate",
  BACKUP_VERIFY: "alco:backup:verify",
  BACKUP_COMMIT: "alco:backup:commit",
  BACKUP_CANCEL: "alco:backup:cancel",
  // Migration & Diagnostics (Phase 4)
  MIGRATION_STAGE: "alco:migration:stage",
  MIGRATION_COMMIT: "alco:migration:commit",
  MIGRATION_CANCEL: "alco:migration:cancel",
  DIAGNOSTICS_GET: "alco:diagnostics:get"
};

// electron/preload.ts
var alcoLicenseApi = {
  // Vault
  getVaultStatus: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_GET_STATUS),
  setupVault: (input) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_SETUP, input),
  unlockVault: (input) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_UNLOCK, input),
  lockVault: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_LOCK),
  changePassword: (input) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.VAULT_CHANGE_PASSWORD, input),
  // License Signing (Main Process signs payload with memory-bound Ed25519 key)
  generateLicense: (input) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.LICENSE_GENERATE, input),
  // Customer Registry
  getCustomers: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.CUSTOMERS_GET_ALL),
  upsertCustomer: (input) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.CUSTOMERS_UPSERT, input),
  // License History
  getHistory: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_GET_ALL),
  saveLicenseRecord: (record) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_SAVE, record),
  updateLicenseStatus: (id, status) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_UPDATE_STATUS, { id, status }),
  deleteLicenseRecord: (id) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.HISTORY_DELETE, { id }),
  // Custom App Registry
  getCustomApps: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.APPS_GET_CUSTOM),
  saveCustomApps: (apps) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.APPS_SAVE_CUSTOM, apps),
  // Settings
  getSettings: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.SETTINGS_GET),
  saveSettings: (settings) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.SETTINGS_SAVE, settings),
  // Backup & Restore
  exportBackup: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_EXPORT),
  validateBackup: (rawJson) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_VALIDATE, rawJson),
  verifyBackupDecryption: (backup, password) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_VERIFY, { backup, password }),
  commitRestoreBackup: (proof) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_COMMIT, proof),
  cancelStagedRestore: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.BACKUP_CANCEL),
  // Safe Authority Migration (Phase 4)
  stageAuthorityMigration: (rawJson, password) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.MIGRATION_STAGE, { rawJson, password }),
  commitAuthorityMigration: (input) => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.MIGRATION_COMMIT, input),
  cancelAuthorityMigration: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.MIGRATION_CANCEL),
  getRuntimeDiagnostics: () => import_electron.ipcRenderer.invoke(ALCO_IPC_CHANNELS.DIAGNOSTICS_GET)
};
import_electron.contextBridge.exposeInMainWorld("alcoLicense", alcoLicenseApi);
//# sourceMappingURL=preload.cjs.map
