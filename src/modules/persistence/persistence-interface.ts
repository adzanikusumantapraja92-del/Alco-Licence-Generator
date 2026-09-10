/**
 * ALCO License Generator - Persistence Service Abstraction
 * 
 * Defines unified interfaces for storage operations across:
 * 1. Browser Development Mode (localStorage adapter)
 * 2. Electron Desktop Mode (Node.js Main Process file storage in userData)
 */

import { 
  EncryptedOwnerVault, 
  AlcoLicenseRecord, 
  AlcoCustomerRecord, 
  AlcoAppDefinition, 
  OwnerKeyPair 
} from '../types';

export interface OwnerSettings {
  ownerName: string;
  defaultPlan: 'starter' | 'pro' | 'enterprise';
  defaultLicenseType: 'lifetime' | 'subscription';
  defaultSubscriptionDays: number;
  autoSaveHistory: boolean;
  autoLockMinutes: number;
}

export const DEFAULT_OWNER_SETTINGS: OwnerSettings = {
  ownerName: 'Aladzan Corpora Owner',
  defaultPlan: 'pro',
  defaultLicenseType: 'subscription',
  defaultSubscriptionDays: 365,
  autoSaveHistory: true,
  autoLockMinutes: 15
};

export interface AlcoBackupPayload {
  alcoVaultVersion: '2.0-encrypted';
  exportDate: string;
  encryptedVault: EncryptedOwnerVault;
  history?: AlcoLicenseRecord[];
  customers?: AlcoCustomerRecord[];
  settings?: OwnerSettings;
  customApps?: AlcoAppDefinition[];
}

export interface IAlcoPersistenceService {
  // Vault
  hasOwnerVault(): Promise<boolean>;
  getEncryptedVault(): Promise<EncryptedOwnerVault | null>;
  saveEncryptedVault(vault: EncryptedOwnerVault): Promise<void>;
  getOwnerPublicMeta(): Promise<OwnerKeyPair | null>;

  // Customers
  getCustomerRegistry(): Promise<AlcoCustomerRecord[]>;
  saveCustomerRegistry(customers: AlcoCustomerRecord[]): Promise<void>;

  // History
  getLicenseHistory(): Promise<AlcoLicenseRecord[]>;
  saveLicenseHistory(history: AlcoLicenseRecord[]): Promise<void>;
  appendLicenseRecord(record: AlcoLicenseRecord): Promise<void>;
  updateLicenseStatus(id: string, status: 'active' | 'revoked'): Promise<void>;
  deleteLicenseRecord(id: string): Promise<void>;

  // Settings
  getOwnerSettings(): Promise<OwnerSettings>;
  saveOwnerSettings(settings: OwnerSettings): Promise<void>;

  // Apps
  getCustomApps(): Promise<AlcoAppDefinition[]>;
  saveCustomApps(apps: AlcoAppDefinition[]): Promise<void>;

  // Backup Export
  exportBackupPayload(): Promise<AlcoBackupPayload>;
}
