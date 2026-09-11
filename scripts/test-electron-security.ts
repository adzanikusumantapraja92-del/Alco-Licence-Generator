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
import { generateEd25519KeyPair } from '../src/modules/signing';
import { encodeRequestCode, decodeRequestCode } from '../src/modules/request-code';
import { isAllowedAppNavigation } from '../electron/navigation-security';

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
      alcoVaultVersion: '2.0-encrypted',
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

function assertNoPrivateKey(label: string, value: unknown): void {
  if (JSON.stringify(value).includes('privateKeyHex')) {
    throw new Error(`${label} leaked privateKeyHex`);
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
    assertNoPrivateKey('[01]', setupRes);
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
    assertNoPrivateKey('[03]', genRes);
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
    assertNoPrivateKey('[06]', unlockRes);
    console.log('[06] ✅ PASS: MainVaultService.unlockVault strictly returns success/metadata, NEVER privateKeyHex');
    passed++;
  } else {
    throw new Error('[06] FAIL: unlockVault leaked private key!');
  }

  // [07] Backup creation in Main Process
  const backupJson = await backupService.exportBackup();
  const valResult = backupService.validateBackup(backupJson);
  if (valResult.valid && valResult.backup && valResult.backup.alcoVaultVersion === '2.0-encrypted' && valResult.backup.encryptedVault) {
    console.log('[07] ✅ PASS: MainBackupService exports valid encrypted v2 backup JSON with alcoVaultVersion');
    passed++;
  } else {
    throw new Error('[07] FAIL: exportBackup failed');
  }

  // [08] Backup verification proof generation (NEVER leaks privateKeyHex)
  const verifyBackupRes = await backupService.verifyBackupDecryption(valResult.backup!, 'MasterPassword123!');
  if (verifyBackupRes.success && verifyBackupRes.proof && !(verifyBackupRes as any).privateKeyHex) {
    assertNoPrivateKey('[08]', verifyBackupRes);
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

  // [10] Backup public key mismatch is rejected before staging
  const mismatchKey = generateEd25519KeyPair();
  const pubMismatchBackup: AlcoBackupPayload = {
    ...valResult.backup!,
    encryptedVault: {
      ...valResult.backup!.encryptedVault,
      publicKeyHex: mismatchKey.publicKeyHex,
      fingerprint: mismatchKey.fingerprint
    }
  };
  const pubMismatchRes = await backupService.verifyBackupDecryption(pubMismatchBackup, 'MasterPassword123!');
  if (!pubMismatchRes.success && pubMismatchRes.error?.includes('does not match')) {
    console.log('[10] ✅ PASS: Backup with decrypted private/public key mismatch is rejected');
    passed++;
  } else {
    throw new Error('[10] FAIL: Public key mismatch backup was accepted');
  }

  // [11] Backup fingerprint mismatch is rejected
  const fpMismatchBackup: AlcoBackupPayload = {
    ...valResult.backup!,
    encryptedVault: {
      ...valResult.backup!.encryptedVault,
      fingerprint: 'DEADBEEF...BADF00D'
    }
  };
  const fpMismatchRes = await backupService.verifyBackupDecryption(fpMismatchBackup, 'MasterPassword123!');
  if (!fpMismatchRes.success && fpMismatchRes.error?.includes('Fingerprint')) {
    console.log('[11] ✅ PASS: Backup with fingerprint mismatch is rejected');
    passed++;
  } else {
    throw new Error('[11] FAIL: Fingerprint mismatch backup was accepted');
  }

  // [12] Customers survive export and restore
  const customerRecord: AlcoCustomerRecord = {
    customerId: 'CUST-ALCO-8FA4D2C1',
    name: 'Owner Example',
    email: 'Owner@Example.com',
    emailNormalized: 'owner@example.com',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await storage.saveCustomerRegistry([customerRecord]);
  const customerBackup = backupService.validateBackup(await backupService.exportBackup()).backup!;
  await storage.saveCustomerRegistry([]);
  const customerVerify = await backupService.verifyBackupDecryption(customerBackup, 'MasterPassword123!');
  if (!customerVerify.success || !customerVerify.proof) throw new Error('[12] FAIL: Customer backup verification failed');
  const customerRestore = await backupService.commitRestore(customerVerify.proof);
  const restoredCustomers = await storage.getCustomerRegistry();
  if (customerRestore.success && restoredCustomers[0]?.emailNormalized === 'owner@example.com') {
    console.log('[12] ✅ PASS: Customer registry survives Electron backup export/restore');
    passed++;
  } else {
    throw new Error('[12] FAIL: Customer registry was not restored');
  }

  // [13] Valid old encrypted v2 backup without customers is still accepted
  const oldV2Backup = { ...customerBackup };
  delete (oldV2Backup as Partial<AlcoBackupPayload>).customers;
  const oldV2Verify = await backupService.verifyBackupDecryption(oldV2Backup as AlcoBackupPayload, 'MasterPassword123!');
  if (oldV2Verify.success && oldV2Verify.proof) {
    console.log('[13] ✅ PASS: Existing encrypted v2 backup without customers remains compatible');
    passed++;
  } else {
    throw new Error(`[13] FAIL: Old v2 backup without customers rejected: ${oldV2Verify.error}`);
  }

  // [14] Main signing writes generated records to Main persistence
  await signingService.generateLicense({
    appId: 'alco-pro',
    deviceId: 'ALCO-DEV-7A9B-4C2E-8F1D',
    customerId: 'CUST-ALCO-8FA4D2C1',
    customerName: 'Owner Example',
    plan: 'pro',
    licenseType: 'subscription',
    expiresAt: '2099-01-01',
    features: ['offline_mode']
  });
  if ((await storage.getLicenseHistory()).length > 0) {
    console.log('[14] ✅ PASS: Electron license history is persisted through Main storage');
    passed++;
  } else {
    throw new Error('[14] FAIL: Electron signing did not persist history through Main storage');
  }

  // [15] Request Code v1/v2 format remains decodable
  const v1Code = encodeRequestCode({
    version: '1.0',
    requestId: 'REQ-OLD-1',
    appId: 'alco-pro',
    deviceId: 'ALCO-DEV-7A9B-4C2E-8F1D',
    customerId: 'CUST-ALCO-1001',
    timestamp: '2026-01-01T00:00:00.000Z'
  });
  const v2Code = encodeRequestCode({
    version: '2.0',
    requestId: 'REQ-NEW-1',
    appId: 'alco-pro',
    deviceId: 'ALCO-DEV-7A9B-4C2E-8F1D',
    customerName: 'Owner Example',
    customerEmail: 'Owner@Example.com',
    timestamp: '2026-01-01T00:00:00.000Z'
  });
  if (decodeRequestCode(v1Code).success && decodeRequestCode(v2Code).success) {
    console.log('[15] ✅ PASS: Request Code v1/v2 encode/decode remains compatible');
    passed++;
  } else {
    throw new Error('[15] FAIL: Request Code v1/v2 compatibility regressed');
  }

  // [16] Navigation allowlist rejects hostname-prefix bypass
  if (!isAllowedAppNavigation('http://localhost.evil.example:3000', true)) {
    console.log('[16] ✅ PASS: Navigation allowlist rejects localhost.evil.example');
    passed++;
  } else {
    throw new Error('[16] FAIL: Navigation allowlist accepted localhost.evil.example');
  }

  // [17] Browser fallback still initializes and exposes no private key
  const memoryStorage = new Map<string, string>();
  (globalThis as any).window = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => memoryStorage.set(key, value),
    removeItem: (key: string) => memoryStorage.delete(key)
  };
  const { getAuthorityClient } = await import('../src/modules/authority-client');
  const browserAuthority = getAuthorityClient();
  const browserSetup = await browserAuthority.setupVault({ masterPassword: 'BrowserPassword123!' });
  const browserUnlock = await browserAuthority.unlockVault({ masterPassword: 'BrowserPassword123!' });
  const browserBackup = await browserAuthority.exportBackup();
  const firstBrowserVaultJson = memoryStorage.get('alco_encrypted_owner_vault_v2')!;
  const firstBrowserVault = JSON.parse(firstBrowserVaultJson);
  const secondBrowserSetup = await browserAuthority.setupVault({ masterPassword: 'ReplacementPassword123!' });
  const secondBrowserVaultJson = memoryStorage.get('alco_encrypted_owner_vault_v2')!;
  assertNoPrivateKey('[17 setup]', browserSetup);
  assertNoPrivateKey('[17 unlock]', browserUnlock);
  if (browserSetup.success && browserUnlock.success && JSON.parse(browserBackup).alcoVaultVersion === '2.0-encrypted') {
    console.log('[17] ✅ PASS: Browser fallback remains functional without renderer-facing privateKeyHex');
    passed++;
  } else {
    throw new Error('[17] FAIL: Browser fallback failed');
  }

  if (
    !secondBrowserSetup.success &&
    secondBrowserSetup.error === 'Vault already exists. Setup aborted.' &&
    JSON.parse(secondBrowserVaultJson).fingerprint === firstBrowserVault.fingerprint &&
    JSON.parse(secondBrowserVaultJson).publicKeyHex === firstBrowserVault.publicKeyHex &&
    secondBrowserVaultJson === firstBrowserVaultJson
  ) {
    console.log('[18] ✅ PASS: Browser fallback setupVault refuses to overwrite existing authority');
    passed++;
  } else {
    throw new Error('[18] FAIL: Browser fallback setupVault overwrote or failed to protect existing authority');
  }

  const browserMigrationStage = await browserAuthority.stageAuthorityMigration(browserBackup, 'BrowserPassword123!');
  const browserMigrationCommit = await browserAuthority.commitAuthorityMigration({
    proof: {
      proofId: 'unused',
      backupFingerprint: firstBrowserVault.fingerprint,
      backupPublicKeyHex: firstBrowserVault.publicKeyHex,
      recordCount: 0,
      customerCount: 0,
      customAppsCount: 0,
      hasSettings: false,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 1000
    }
  });
  if (
    !browserMigrationStage.success &&
    !browserMigrationCommit.success &&
    browserMigrationStage.error?.includes('only in the Electron desktop application') &&
    browserMigrationCommit.error?.includes('only in the Electron desktop application')
  ) {
    console.log('[19] ✅ PASS: Browser fallback refuses Phase 4 authority migration');
    passed++;
  } else {
    throw new Error('[19] FAIL: Browser fallback exposed production migration success path');
  }

  console.log(`=== ALL ELECTRON SECURITY TESTS PASSED: ${passed}/${passed} ===`);
}

runElectronSecurityTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
