/**
 * ALCO License Generator - Explicit IPC Channels
 * 
 * Strict channel naming convention for Electron IPC communication.
 */

export const ALCO_IPC_CHANNELS = {
  // Vault
  VAULT_GET_STATUS: 'alco:vault:getStatus',
  VAULT_SETUP: 'alco:vault:setup',
  VAULT_UNLOCK: 'alco:vault:unlock',
  VAULT_LOCK: 'alco:vault:lock',
  VAULT_CHANGE_PASSWORD: 'alco:vault:changePassword',

  // Signing
  LICENSE_GENERATE: 'alco:license:generate',

  // Customers
  CUSTOMERS_GET_ALL: 'alco:customers:getAll',
  CUSTOMERS_UPSERT: 'alco:customers:upsert',

  // History
  HISTORY_GET_ALL: 'alco:history:getAll',
  HISTORY_SAVE: 'alco:history:save',
  HISTORY_UPDATE_STATUS: 'alco:history:updateStatus',
  HISTORY_DELETE: 'alco:history:delete',

  // Apps
  APPS_GET_CUSTOM: 'alco:apps:getCustom',
  APPS_SAVE_CUSTOM: 'alco:apps:saveCustom',

  // Settings
  SETTINGS_GET: 'alco:settings:get',
  SETTINGS_SAVE: 'alco:settings:save',

  // Backup
  BACKUP_EXPORT: 'alco:backup:export',
  BACKUP_VALIDATE: 'alco:backup:validate',
  BACKUP_VERIFY: 'alco:backup:verify',
  BACKUP_COMMIT: 'alco:backup:commit',
  BACKUP_CANCEL: 'alco:backup:cancel',

  // Migration & Diagnostics (Phase 4)
  MIGRATION_STAGE: 'alco:migration:stage',
  MIGRATION_COMMIT: 'alco:migration:commit',
  MIGRATION_CANCEL: 'alco:migration:cancel',
  DIAGNOSTICS_GET: 'alco:diagnostics:get'
} as const;

export type AlcoIpcChannel = typeof ALCO_IPC_CHANNELS[keyof typeof ALCO_IPC_CHANNELS];
