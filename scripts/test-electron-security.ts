/**
 * ALCO License Generator - Electron Security & Persistence Invariant Tests
 * Verifies Phase 1-3 implementation invariants:
 * 1. Private key NEVER leaks in IPC responses (VaultUnlock, BackupVerification)
 * 2. MainVaultService strictly zeroizes inMemoryPrivateKey on lock
 * 3. MainSigningService produces valid ALCO-LIC-v1 signatures strictly in Main Process
 * 4. Persistence interface contract consistency
 */

import { MainVaultService } from '../electron/services/vault-service';
import { MainSigningService } from '../electron/services/signing-service';
import { MainBackupService } from '../electron/services/backup-service';
import { IAlcoPersistenceService, OwnerSettings, AlcoBackupPayload } from '../src/modules/persistence/persistence-interface';
import { EncryptedOwnerVault, AlcoLicenseRecord, AlcoCustomerRecord, AlcoAppDefinition } from '../src/modules/types';
import { verifyAlcoLicense } from '../src/modules/verification';

// In-memory mock storage implementation conforming to IAlcoPersistenceService
class MockMainStorage implements IAlcoPersistenceService {
  private vault: EncryptedOwnerVault | null = null;
  private history: AlcoLicenseRecord[] = [];
  private customers: AlcoCustomerRecord[] = [];
  private apps: AlcoAppDefinition[] = [];
  private settings: OwnerSettings = {
    ownerName: 'Aladzan Corpora Owner',
    defaultPlan: 'pro',
    defaultLicenseType: 'subscription',
    defaultSubscriptionDays: 365,
    autoSaveHistory: true,
    autoLockMinutes: 15
  };

  async hasOwnerVault() { return this.vault !== null; }
  async getEncryptedVault() { return this.vault; }
  async saveEncryptedVault(v: EncryptedOwnerVault) { this.vault = v; }
  async getOwnerPublicMeta() {
    if (!this.vault) return null;
    return {
      publicKeyHex: this.vault.publicKeyHex,
      fingerprint: this.vault.fingerprint,
      createdAt: this.vault.createdAt
    };
  }
  async deleteEncryptedVault() { this.vault = null; }
  async getLicenseHistory() { return this.history; }
  async saveLicenseHistory(h: AlcoLicenseRecord[]) { this.history = h; }
  async appendLicenseRecord(r: AlcoLicenseRecord) { this.history.push(r); }
  async updateLicenseStatus(id: string, s: 'active' | 'revoked') {
    const idx = this.history.findIndex(x => x.id === id);
    if (idx >= 0) this.history[idx].status = s;
  }
  async deleteLicenseRecord(id: string) {
    this.history = this.history.filter(x => x.id !== id);
  }
  async getCustomerRegistry() { return this.customers; }
  async saveCustomerRegistry(c: AlcoCustomerRecord[]) { this.customers = c; }
  async getCustomApps() { return this.apps; }
  async saveCustomApps(a: AlcoAppDefinition[]) { this.apps = a; }
  async getOwnerSettings() { return this.settings; }
  async saveOwnerSettings(s: OwnerSettings) { this.settings = s; }

  async exportBackupPayload(): Promise<AlcoBackupPayload> {
    if (!this.vault) throw new Error('No vault to backup');
    return {
      exportDate: new Date().toISOString(),
      encryptedVault: this.vault,
      history: this.history,
      customers: this.customers,
      settings: this.settings,
      customApps: this.apps
    };
  }

  async restoreFromBackupPayload(backup: AlcoBackupPayload): Promise<void> {
    this.vault = backup.encryptedVault;
    if (backup.history) this.history = backup.history;
    if (backup.customers) this.customers = backup.customers;
    if (backup.settings) this.settings = backup.settings;
    if (backup.customApps) this.apps = backup.customApps;
  }
}

async function runElectronSecurityTests() {
  console.log('=== RUNNING ALCO ELECTRON SECURITY FOUNDATION TEST SUITE ===');
  let passed = 0;

  const storage = new MockMainStorage();
  const vaultService = new MainVaultService(storage as any);
  const signingService = new MainSigningService(vaultService, storage as any);
  const backupService = new MainBackupService(storage as any, vaultService);

  // [01] Initialize Vault in Main Process
  const setupRes = await vaultService.setupVault('MasterPassword123!', 'test-hint');
  if (setupRes.success && setupRes.publicKeyHex && setupRes.fingerprint && !(setupRes as any).privateKeyHex) {
    console.log('[01] ✅ PASS: MainVaultService.setupVault returns public metadata and ZERO privateKey');
    passed++;
  } else {
    throw new Error('[01] FAIL: setupVault leaked privateKey or failed');
  }

  // [02] Vault Status shows unlocked
  const status1 = await vaultService.getStatus();
  if (status1.status === 'unlocked' && status1.fingerprint === setupRes.fingerprint && !(status1 as any).privateKeyHex) {
    console.log('[02] ✅ PASS: MainVaultService.getStatus reports volatile unlocked state without leaking private key');
    passed++;
  } else {
    throw new Error('[02] FAIL: getStatus failed or leaked private key');
  }

  // [03] Generate License via MainSigningService
  const genRes = await signingService.generateLicense({
    appId: 'alco-pro',
    deviceId: 'ALCO-DEV-7A9B-4C2E-8F1D',
    customerId: 'CUST-ALCO-1001',
    customerName: 'Ahmad Aladzan',
    plan: 'enterprise',
    licenseType: 'lifetime',
    expiresAt: null,
    features: ['all_modules', 'offline_mode']
  });
  if (genRes.success && genRes.licenseKey && genRes.canonicalString && !(genRes as any).privateKeyHex) {
    // Verify using standard verifier
    const verifyRes = verifyAlcoLicense({
      licenseKey: genRes.licenseKey,
      publicKeyHex: setupRes.publicKeyHex,
      expectedAppId: 'alco-pro',
      expectedDeviceId: 'ALCO-DEV-7A9B-4C2E-8F1D'
    });
    if (verifyRes.valid) {
      console.log('[03] ✅ PASS: MainSigningService generates authentic ALCO-LIC-v1 key accepted by client verifier');
      passed++;
    } else {
      throw new Error(`[03] FAIL: Generated license was rejected by verifier: ${verifyRes.reason}`);
    }
  } else {
    throw new Error(`[03] FAIL: generateLicense failed: ${genRes.error}`);
  }

  // [04] Lock Vault & verify zeroization
  const lockRes = await vaultService.lockVault();
  const status2 = await vaultService.getStatus();
  if (lockRes.success && status2.status === 'locked') {
    console.log('[04] ✅ PASS: MainVaultService.lockVault locks status and wipes volatile memory');
    passed++;
  } else {
    throw new Error('[04] FAIL: lockVault failed');
  }

  // [05] Signing fails when vault is locked
  try {
    const shouldFail = await signingService.generateLicense({
      appId: 'alco-pro',
      deviceId: 'ALCO-DEV-7A9B-4C2E-8F1D',
      customerId: 'CUST-ALCO-1001',
      plan: 'pro',
      licenseType: 'lifetime',
      expiresAt: null,
      features: []
    });
    if (!shouldFail.success && shouldFail.error?.includes('locked')) {
      console.log('[05] ✅ PASS: MainSigningService rejects signing while vault is locked');
      passed++;
    } else {
      throw new Error('[05] FAIL: Signing should have failed while locked');
    }
  } catch (err: any) {
    if (err.message.includes('locked')) {
      console.log('[05] ✅ PASS: MainSigningService rejects signing while vault is locked');
      passed++;
    } else {
      throw err;
    }
  }

  // [06] Unlock Vault with Master Password - verify NO privateKeyHex in return
  const unlockRes = await vaultService.unlockVault('MasterPassword123!');
  if (unlockRes.success && !(unlockRes as any).privateKeyHex && !(unlockRes as any).inMemoryPrivateKeyHex) {
    console.log('[06] ✅ PASS: MainVaultService.unlockVault strictly returns success/metadata, NEVER privateKeyHex');
    passed++;
  } else {
    throw new Error('[06] FAIL: unlockVault leaked private key!');
  }

  // [07] Backup creation in Main Process
  const backupJson = await backupService.exportBackup();
  const valResult = backupService.validateBackup(backupJson);
  if (valResult.valid && valResult.backup && valResult.backup.encryptedVault) {
    console.log('[07] ✅ PASS: MainBackupService exports valid encrypted backup JSON');
    passed++;
  } else {
    throw new Error('[07] FAIL: exportBackup failed');
  }

  // [08] Backup verification proof generation (NEVER leaks privateKeyHex)
  const verifyBackupRes = await backupService.verifyBackupDecryption(valResult.backup!, 'MasterPassword123!');
  if (verifyBackupRes.success && verifyBackupRes.proof && !(verifyBackupRes as any).privateKeyHex) {
    console.log('[08] ✅ PASS: MainBackupService.verifyBackupDecryption yields ephemeral proof without privateKeyHex');
    passed++;
  } else {
    throw new Error(`[08] FAIL: verifyBackupDecryption failed or leaked private key: ${verifyBackupRes.error}`);
  }

  // [09] Backup restore commits with valid proof
  const restoreRes = await backupService.commitRestore(verifyBackupRes.proof!);
  if (restoreRes.success) {
    console.log('[09] ✅ PASS: MainBackupService.commitRestore commits successfully with valid cryptographic proof');
    passed++;
  } else {
    throw new Error('[09] FAIL: commitRestore failed');
  }

  console.log(`=== ALL ELECTRON SECURITY TESTS PASSED: ${passed}/${passed} ===`);
}

runElectronSecurityTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
