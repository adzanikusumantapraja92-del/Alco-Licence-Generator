/**
 * ALCO License Generator - Phase 4 Safe Authority Migration Test Suite
 * 
 * Tests the 15 critical invariants for migrating existing browser-based
 * ALCO Ed25519 Authorities into the Electron desktop application.
 * 
 * Absolute Security Rule:
 * "Fingerprint before migration MUST equal fingerprint after migration.
 * If it does not: FAIL CLOSED. Never silently generate a replacement key."
 */

import { MainMigrationService } from '../electron/services/migration-service';
import { MainVaultService } from '../electron/services/vault-service';
import { IAlcoPersistenceService, OwnerSettings, AlcoBackupPayload } from '../src/modules/persistence/persistence-interface';
import { EncryptedOwnerVault, AlcoLicenseRecord, AlcoCustomerRecord, AlcoAppDefinition } from '../src/modules/types';
import { generateEd25519KeyPair, derivePublicKeyHexFromSecretKey } from '../src/modules/signing';
import { encryptWithPassword } from '../src/modules/vault-crypto';
import { MainSigningService } from '../electron/services/signing-service';
import fs from 'node:fs';

// In-memory mock persistence conforming to IAlcoPersistenceService
class MockMigrationStorage implements IAlcoPersistenceService {
  public vault: EncryptedOwnerVault | null = null;
  public history: AlcoLicenseRecord[] = [];
  public customers: AlcoCustomerRecord[] = [];
  public apps: AlcoAppDefinition[] = [];
  public existed = {
    vault: false,
    customers: false,
    history: false,
    settings: false,
    customApps: false
  };
  public tamperVaultAfterRestore = false;
  public failCustomerReadAfterRestore = false;
  private restoredOnce = false;
  public settings: OwnerSettings = {
    ownerName: 'Aladzan Corpora Owner',
    defaultPlan: 'pro',
    defaultLicenseType: 'subscription',
    defaultSubscriptionDays: 365,
    autoSaveHistory: true,
    autoLockMinutes: 15
  };

  async hasOwnerVault() { return this.vault !== null; }
  storageDomainExists(domain: keyof MockMigrationStorage['existed']) { return this.existed[domain]; }
  async getEncryptedVault() {
    if (this.tamperVaultAfterRestore && this.restoredOnce && this.vault) {
      return { ...this.vault, fingerprint: 'TAMPERED-AFTER-WRITE' };
    }
    return this.vault;
  }
  async saveEncryptedVault(v: EncryptedOwnerVault) {
    this.vault = JSON.parse(JSON.stringify(v));
    this.existed.vault = true;
  }
  async getOwnerPublicMeta() {
    if (!this.vault) return null;
    return {
      publicKeyHex: this.vault.publicKeyHex,
      fingerprint: this.vault.fingerprint,
      createdAt: this.vault.createdAt
    };
  }
  async deleteEncryptedVault() {
    this.vault = null;
    this.existed.vault = false;
  }
  async getLicenseHistory() { return this.history; }
  async saveLicenseHistory(h: AlcoLicenseRecord[]) {
    this.history = JSON.parse(JSON.stringify(h));
    this.existed.history = true;
  }
  async deleteLicenseHistory() {
    this.history = [];
    this.existed.history = false;
  }
  async appendLicenseRecord(r: AlcoLicenseRecord) {
    this.history.push(r);
    this.existed.history = true;
  }
  async updateLicenseStatus(id: string, s: 'active' | 'revoked') {
    const idx = this.history.findIndex(x => x.id === id);
    if (idx >= 0) this.history[idx].status = s;
  }
  async deleteLicenseRecord(id: string) {
    this.history = this.history.filter(x => x.id !== id);
  }
  async getCustomerRegistry() {
    if (this.failCustomerReadAfterRestore && this.restoredOnce) {
      this.failCustomerReadAfterRestore = false;
      throw new Error('Simulated diagnostics customer read failure after unlock');
    }
    return this.customers;
  }
  async saveCustomerRegistry(c: AlcoCustomerRecord[]) {
    this.customers = JSON.parse(JSON.stringify(c));
    this.existed.customers = true;
  }
  async deleteCustomerRegistry() {
    this.customers = [];
    this.existed.customers = false;
  }
  async getCustomApps() { return this.apps; }
  async saveCustomApps(a: AlcoAppDefinition[]) {
    this.apps = JSON.parse(JSON.stringify(a));
    this.existed.customApps = true;
  }
  async deleteCustomApps() {
    this.apps = [];
    this.existed.customApps = false;
  }
  async getOwnerSettings() { return this.settings; }
  async saveOwnerSettings(s: OwnerSettings) {
    this.settings = JSON.parse(JSON.stringify(s));
    this.existed.settings = true;
  }
  async deleteOwnerSettings() {
    this.settings = {
      ownerName: 'Aladzan Corpora Owner',
      defaultPlan: 'pro',
      defaultLicenseType: 'subscription',
      defaultSubscriptionDays: 365,
      autoSaveHistory: true,
      autoLockMinutes: 15
    };
    this.existed.settings = false;
  }

  async exportBackupPayload(): Promise<AlcoBackupPayload> {
    if (!this.vault) throw new Error('Cannot export backup: Vault not initialized');
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

  async restoreFromBackupPayload(payload: AlcoBackupPayload): Promise<void> {
    if (!payload.encryptedVault) throw new Error('Corrupted backup');
    this.vault = JSON.parse(JSON.stringify(payload.encryptedVault));
    this.existed.vault = true;
    if (Array.isArray(payload.customers)) {
      this.customers = JSON.parse(JSON.stringify(payload.customers));
      this.existed.customers = true;
    }
    if (Array.isArray(payload.history)) {
      this.history = JSON.parse(JSON.stringify(payload.history));
      this.existed.history = true;
    }
    if (payload.settings) {
      this.settings = JSON.parse(JSON.stringify(payload.settings));
      this.existed.settings = true;
    }
    if (Array.isArray(payload.customApps)) {
      this.apps = JSON.parse(JSON.stringify(payload.customApps));
      this.existed.customApps = true;
    }
    this.restoredOnce = true;
  }
}

async function createValidBackupPayload(password: string, keyPair?: any) {
  const kp = keyPair || generateEd25519KeyPair();
  const secretPayload = JSON.stringify({
    privateKeyHex: kp.privateKeyHex,
    publicKeyHex: kp.publicKeyHex,
    fingerprint: kp.fingerprint,
    createdAt: new Date().toISOString()
  });

  const enc = await encryptWithPassword(secretPayload, password);
  const encryptedVault: EncryptedOwnerVault = {
    version: '2.0-aes-gcm',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: enc.iterations,
    saltHex: enc.saltHex,
    ivHex: enc.ivHex,
    ciphertextHex: enc.ciphertextHex,
    publicKeyHex: kp.publicKeyHex,
    fingerprint: kp.fingerprint,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const backup: AlcoBackupPayload = {
    alcoVaultVersion: '2.0-encrypted',
    exportDate: new Date().toISOString(),
    encryptedVault,
    customers: [
      {
        customerId: 'CUS-NUSANTARAD-9B4A71',
        name: 'PT Nusantara Digital',
        email: 'admin@nusantara.digital',
        emailNormalized: 'admin@nusantara.digital',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ],
    history: [
      {
        id: 'lic-101',
        licenseKey: 'ALCO-LIC-v1-TEST-KEY',
        payload: {
          licenseVersion: '1.0',
          licenseId: 'ALCO-LIC-20260907-001',
          appId: 'alco-point-of-sale',
          deviceId: 'DEV-JAKARTA-01',
          customerId: 'CUS-NUSANTARAD-9B4A71',
          customerName: 'PT Nusantara Digital',
          plan: 'enterprise',
          licenseType: 'lifetime',
          features: ['all'],
          issuedAt: new Date().toISOString(),
          expiresAt: null
        },
        signature: '00'.repeat(64),
        createdAt: new Date().toISOString(),
        status: 'active'
      }
    ],
    customApps: [
      {
        id: 'alco-custom-erp',
        name: 'ALCO Custom ERP',
        description: 'Enterprise ERP Suite',
        category: 'utility',
        iconName: 'Building',
        availablePlans: ['enterprise'],
        features: [],
        createdAt: new Date().toISOString()
      }
    ],
    settings: {
      ownerName: 'ALCO Ecosystem Authority',
      defaultPlan: 'enterprise',
      defaultLicenseType: 'lifetime',
      defaultSubscriptionDays: 365,
      autoSaveHistory: true,
      autoLockMinutes: 30
    }
  };

  return { backup, kp };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    failed++;
    console.error(`  FAIL: ${msg}`);
    throw new Error(msg);
  } else {
    passed++;
    console.log(`  PASS: ${msg}`);
  }
}

function createTestServices() {
  const storage = new MockMigrationStorage();
  const vault = new MainVaultService(storage as any);
  const migration = new MainMigrationService(storage as any, vault);
  return { storage, vault, migration };
}

async function runMigrationTests() {
  console.log('\n======================================================');
  console.log('ALCO LICENSE GENERATOR - PHASE 4 SAFE MIGRATION TESTS');
  console.log('======================================================\n');

  const password = 'SuperSecretMasterPassword123!';

  // -----------------------------------------------------------
  // Test 1: Successful Migration with Exact Fingerprint Parity
  // -----------------------------------------------------------
  console.log('[Test 1] Successful Migration with Exact Fingerprint Parity');
  {
    const { storage, vault, migration } = createTestServices();

    const { backup, kp } = await createValidBackupPayload(password);
    const rawJson = JSON.stringify(backup);

    const stageRes = await migration.stageMigration(rawJson, password);
    if (!stageRes.success) {
      console.error('Stage failed with error:', stageRes.error);
    }
    assert(stageRes.success === true, 'Stage migration succeeded');
    assert(stageRes.proof !== undefined, 'Proof generated');
    assert(stageRes.backupFingerprint === kp.fingerprint, 'Pre-migration fingerprint strictly matches generated keypair');
    assert(stageRes.backupPublicKeyHex === kp.publicKeyHex, 'Pre-migration public key strictly matches generated keypair');

    const commitRes = await migration.commitMigration({ proof: stageRes.proof! });
    if (!commitRes.success) {
      console.error('Commit failed with error:', commitRes.error);
    }
    assert(commitRes.success === true, 'Commit migration succeeded');
    assert(commitRes.diagnostics !== undefined, 'Diagnostics returned on commit');
    assert(commitRes.diagnostics?.fingerprint === kp.fingerprint, 'Post-migration fingerprint === Pre-migration fingerprint');
    assert(commitRes.diagnostics?.publicKeyHex === kp.publicKeyHex, 'Post-migration public key === Pre-migration public key');
    assert(commitRes.diagnostics?.status === 'unlocked', 'Authority is unlocked in volatile RAM after migration');

    // Storage read-back parity
    const storedVault = await storage.getEncryptedVault();
    assert(storedVault !== null, 'Vault stored in storage');
    assert(storedVault?.fingerprint === kp.fingerprint, 'Storage fingerprint equals original fingerprint');
    assert(storedVault?.publicKeyHex === kp.publicKeyHex, 'Storage public key equals original public key');
  }

  // -----------------------------------------------------------
  // Test 2: Never Silently Generate Replacement Key
  // -----------------------------------------------------------
  console.log('\n[Test 2] Never Silently Generate Replacement Key');
  {
    const { storage, vault, migration } = createTestServices();

    const knownKp = generateEd25519KeyPair();
    const { backup } = await createValidBackupPayload(password, knownKp);

    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);
    await migration.commitMigration({ proof: stageRes.proof! });

    const status = await vault.getStatus();
    assert(status.fingerprint === knownKp.fingerprint, 'Authority retained exact known fingerprint (no new key generated)');
    assert(status.publicKeyHex === knownKp.publicKeyHex, 'Authority retained exact known public key');
  }

  // -----------------------------------------------------------
  // Test 3: Fail-Closed on Tampered Public Key
  // -----------------------------------------------------------
  console.log('\n[Test 3] Fail-Closed on Tampered Public Key');
  {
    const { storage, migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    // Tamper public key
    backup.encryptedVault.publicKeyHex = '00'.repeat(32);

    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Stage failed closed on tampered public key');
    assert(res.error?.includes('SECURITY VIOLATION') || res.error?.includes('does not correspond'), 'Error flagged security violation');
    assert(await storage.getEncryptedVault() === null, 'No vault was written to storage');
  }

  // -----------------------------------------------------------
  // Test 4: Fail-Closed on Tampered Fingerprint
  // -----------------------------------------------------------
  console.log('\n[Test 4] Fail-Closed on Tampered Fingerprint');
  {
    const { storage, migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    // Tamper fingerprint
    backup.encryptedVault.fingerprint = 'TAMPERED-FINGERPRINT-999';

    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Stage failed closed on tampered fingerprint');
    assert(res.error?.includes('SECURITY VIOLATION') || res.error?.includes('Authority fingerprint does not match'), 'Error flagged fingerprint violation');
    assert(await storage.getEncryptedVault() === null, 'No vault was written to storage');
  }

  // -----------------------------------------------------------
  // Test 5: Fail-Closed on Wrong Master Password
  // -----------------------------------------------------------
  console.log('\n[Test 5] Fail-Closed on Wrong Master Password');
  {
    const { storage, migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);

    const res = await migration.stageMigration(JSON.stringify(backup), 'WrongPassword123!');
    assert(res.success === false, 'Stage failed on incorrect password');
    assert(res.error?.includes('Decryption failed') || res.error?.includes('Incorrect Master Password'), 'Clear error on decryption failure');
    assert(await storage.getEncryptedVault() === null, 'Storage remains untouched');
  }

  // -----------------------------------------------------------
  // Test 6: Fail-Closed on Corrupted Ciphertext
  // -----------------------------------------------------------
  console.log('\n[Test 6] Fail-Closed on Corrupted Ciphertext');
  {
    const { migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    backup.encryptedVault.ciphertextHex = backup.encryptedVault.ciphertextHex.slice(0, -8) + 'deadbeef';

    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Stage failed on corrupted ciphertext');
    assert(res.error?.includes('Decryption failed'), 'Decryption authentication failure caught');
  }

  // -----------------------------------------------------------
  // Test 7: Fail-Closed on Invalid Decrypted Secret Key Length
  // -----------------------------------------------------------
  console.log('\n[Test 7] Fail-Closed on Invalid Decrypted Secret Key Length');
  {
    const { migration } = createTestServices();

    const kp = generateEd25519KeyPair();
    // Short 32-byte / 64 hex private key payload instead of 64-byte / 128 hex
    const invalidSecretPayload = JSON.stringify({
      privateKeyHex: kp.privateKeyHex.slice(0, 64),
      publicKeyHex: kp.publicKeyHex,
      fingerprint: kp.fingerprint
    });

    const enc = await encryptWithPassword(invalidSecretPayload, password);
    const backup: AlcoBackupPayload = {
      alcoVaultVersion: '2.0-encrypted',
      exportDate: new Date().toISOString(),
      encryptedVault: {
        version: '2.0-aes-gcm',
        algorithm: 'AES-256-GCM',
        kdf: 'PBKDF2-SHA-256',
        iterations: enc.iterations,
        saltHex: enc.saltHex,
        ivHex: enc.ivHex,
        ciphertextHex: enc.ciphertextHex,
        publicKeyHex: kp.publicKeyHex,
        fingerprint: kp.fingerprint,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };

    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Stage failed on invalid private key length');
    assert(res.error?.includes('Invalid Ed25519 private key format'), 'Detailed rejection reason provided');
  }

  // -----------------------------------------------------------
  // Test 8: Fail-Closed on Inadequate PBKDF2 Iteration Count
  // -----------------------------------------------------------
  console.log('\n[Test 8] Fail-Closed on Inadequate PBKDF2 Iteration Count');
  {
    const { migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    backup.encryptedVault.iterations = 50000; // Under minimum 100,000

    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Stage rejected inadequate PBKDF2 iterations');
    assert(res.error?.includes('Inadequate PBKDF2 iteration count'), 'Inadequate iteration error reported');
  }

  // -----------------------------------------------------------
  // Test 9: Fail-Closed on Unsupported Backup Version
  // -----------------------------------------------------------
  console.log('\n[Test 9] Fail-Closed on Unsupported Backup Version');
  {
    const { migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    (backup as any).alcoVaultVersion = '1.0-plaintext';

    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Stage rejected v1.0 backup');
    assert(res.error?.includes('Unsupported backup version'), 'Version rejection error message returned');
  }

  // -----------------------------------------------------------
  // Test 10: Atomic Rollback on Invariant Failure During Commit
  // -----------------------------------------------------------
  console.log('\n[Test 10] Atomic Rollback on Invariant Failure During Commit');
  {
    const { storage, vault, migration } = createTestServices();

    // Establish pre-existing authority
    await vault.setupVault('OldPassword123!');
    const originalVault = await storage.getEncryptedVault();
    const originalFingerprint = originalVault!.fingerprint;

    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);

    // Simulate tampered staged proof
    const tamperedProof = {
      ...stageRes.proof!,
      backupFingerprint: 'MODIFIED-DURING-IN-FLIGHT'
    };

    const commitRes = await migration.commitMigration({
      proof: tamperedProof,
      overwriteExisting: true
    });

    assert(commitRes.success === false, 'Commit aborted due to tampered proof identity');
    assert(commitRes.error?.includes('SECURITY VIOLATION'), 'Security violation raised');

    // Verify rollback
    const postRollbackVault = await storage.getEncryptedVault();
    assert(postRollbackVault?.fingerprint === originalFingerprint, 'Storage rolled back to pre-existing vault fingerprint');
  }

  // -----------------------------------------------------------
  // Test 11: Overwrite Protection for Existing Authority
  // -----------------------------------------------------------
  console.log('\n[Test 11] Overwrite Protection for Existing Authority');
  {
    const { vault, migration } = createTestServices();

    // Pre-existing vault
    await vault.setupVault('ExistingPassword123!');

    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);

    assert(stageRes.hasExistingVault === true, 'Stage correctly detected existing vault');

    // Attempt commit without overwriteExisting flag
    const commitWithoutOverwrite = await migration.commitMigration({
      proof: stageRes.proof!,
      overwriteExisting: false
    });

    assert(commitWithoutOverwrite.success === false, 'Commit blocked when overwriteExisting is false');
    assert(commitWithoutOverwrite.error?.includes('overwrite confirmation is required'), 'Requires explicit confirmation');
  }

  // -----------------------------------------------------------
  // Test 12: Proof Expiration (TTL Enforcement)
  // -----------------------------------------------------------
  console.log('\n[Test 12] Proof Expiration (TTL Enforcement)');
  {
    const { migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);

    // Create expired proof
    const expiredProof = {
      ...stageRes.proof!,
      expiresAt: Date.now() - 1000 // Expired 1 second ago
    };

    const commitRes = await migration.commitMigration({ proof: expiredProof });
    assert(commitRes.success === false, 'Commit failed on expired proof');
    assert(commitRes.error?.includes('expired'), 'Error message reports proof expiration');
  }

  // -----------------------------------------------------------
  // Test 13: Proof ID Mismatch Protection
  // -----------------------------------------------------------
  console.log('\n[Test 13] Proof ID Mismatch Protection');
  {
    const { migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);

    const mismatchProof = {
      ...stageRes.proof!,
      proofId: 'forged-proof-id-999'
    };

    const commitRes = await migration.commitMigration({ proof: mismatchProof });
    assert(commitRes.success === false, 'Commit rejected mismatched proof ID');
    assert(commitRes.error?.includes('proof ID mismatch'), 'Rejection due to proof ID mismatch');
  }

  // -----------------------------------------------------------
  // Test 14: Customer Registry and License History Integrity
  // -----------------------------------------------------------
  console.log('\n[Test 14] Customer Registry and License History Integrity');
  {
    const { storage, migration } = createTestServices();

    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);
    await migration.commitMigration({ proof: stageRes.proof! });

    const restoredCustomers = await storage.getCustomerRegistry();
    const restoredHistory = await storage.getLicenseHistory();
    const restoredApps = await storage.getCustomApps();
    const restoredSettings = await storage.getOwnerSettings();

    assert(restoredCustomers.length === 1, 'Customer record restored');
    assert(restoredCustomers[0].name === 'PT Nusantara Digital', 'Customer name intact');
    assert(restoredHistory.length === 1, 'License history record restored');
    assert(restoredHistory[0].id === 'lic-101', 'License ID intact');
    assert(restoredApps.length === 1, 'Custom app restored');
    assert(restoredApps[0].id === 'alco-custom-erp', 'Custom app ID intact');
    assert(restoredSettings.ownerName === 'ALCO Ecosystem Authority', 'Settings owner name intact');
  }

  // -----------------------------------------------------------
  // Test 15: Runtime Diagnostics Accuracy and Zero Private Key Exposure
  // -----------------------------------------------------------
  console.log('\n[Test 15] Runtime Diagnostics Accuracy and Zero Private Key Exposure');
  {
    const { migration } = createTestServices();

    const { backup, kp } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);
    const commitRes = await migration.commitMigration({ proof: stageRes.proof! });

    const diag = await migration.getRuntimeDiagnostics();
    assert(diag.fingerprint === kp.fingerprint, 'Diagnostics fingerprint accurate');
    assert(diag.publicKeyHex === kp.publicKeyHex, 'Diagnostics public key accurate');
    assert(diag.customersCount === 1, 'Diagnostics customer count accurate');
    assert(diag.historyCount === 1, 'Diagnostics history count accurate');
    assert(diag.customAppsCount === 1, 'Diagnostics custom apps count accurate');
    assert(diag.status === 'unlocked', 'Diagnostics status is unlocked');

    // Crucial check: zero private key exposure in diagnostics object
    const serializedDiag = JSON.stringify(diag);
    assert(!serializedDiag.includes(kp.privateKeyHex), 'Diagnostics object does NOT contain privateKeyHex');
    assert(!serializedDiag.includes('privateKey'), 'Diagnostics object contains zero private key properties');
  }

  // -----------------------------------------------------------
  // Test 16: Empty Electron State Rollback Removes Newly Written Data
  // -----------------------------------------------------------
  console.log('\n[Test 16] Empty Electron State Rollback Removes Newly Written Data');
  {
    const { storage, migration } = createTestServices();
    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);
    storage.tamperVaultAfterRestore = true;

    const commitRes = await migration.commitMigration({ proof: stageRes.proof! });

    assert(commitRes.success === false, 'Commit failed after simulated post-write verification failure');
    assert(await storage.getEncryptedVault() === null, 'Newly written vault removed after rollback from empty state');
    assert((await storage.getCustomerRegistry()).length === 0, 'Customers restored to empty state');
    assert((await storage.getLicenseHistory()).length === 0, 'History restored to empty state');
    assert((await storage.getCustomApps()).length === 0, 'Custom apps restored to empty state');
    assert(storage.existed.vault === false, 'Vault domain existence restored to absent');
    assert(storage.existed.customers === false, 'Customer domain existence restored to absent');
    assert(storage.existed.history === false, 'History domain existence restored to absent');
    assert(storage.existed.settings === false, 'Settings domain existence restored to absent');
    assert(storage.existed.customApps === false, 'Custom apps domain existence restored to absent');
    assert((await storage.getOwnerSettings()).ownerName === 'Aladzan Corpora Owner', 'Settings restored to default fallback');
  }

  // -----------------------------------------------------------
  // Test 17: Failure After Imported Vault Unlock Leaves Runtime Locked
  // -----------------------------------------------------------
  console.log('\n[Test 17] Failure After Imported Vault Unlock Leaves Runtime Locked');
  {
    const { storage, vault, migration } = createTestServices();
    const signing = new MainSigningService(vault, storage as any);
    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);
    storage.failCustomerReadAfterRestore = true;

    const commitRes = await migration.commitMigration({ proof: stageRes.proof! });
    const status = await vault.getStatus();
    const signRes = await signing.generateLicense({
      appId: 'alco-point-of-sale',
      deviceId: 'ALCO-DEV-7A9B-4C2E-8F1D',
      customerId: 'CUS-NUSANTARAD-9B4A71',
      plan: 'pro',
      licenseType: 'lifetime',
      expiresAt: null,
      features: []
    });

    assert(commitRes.success === false, 'Commit failed after imported vault was unlocked');
    assert(status.status === 'uninitialized' || status.status === 'locked', 'Vault service does not retain imported unlocked authority');
    assert(signRes.success === false && !!signRes.error?.includes('locked'), 'Imported private key is no longer usable for signing');
  }

  // -----------------------------------------------------------
  // Test 18: Existing Authority Rollback Restores Disk and Leaves Runtime Locked
  // -----------------------------------------------------------
  console.log('\n[Test 18] Existing Authority Rollback Restores Disk and Leaves Runtime Locked');
  {
    const { storage, vault, migration } = createTestServices();
    await vault.setupVault('ExistingPassword123!');
    const previousVault = await storage.getEncryptedVault();
    await storage.saveCustomerRegistry([{
      customerId: 'CUS-OLD-1',
      name: 'Old Customer',
      email: 'old@example.com',
      emailNormalized: 'old@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]);

    const { backup } = await createValidBackupPayload(password);
    const stageRes = await migration.stageMigration(JSON.stringify(backup), password);
    storage.failCustomerReadAfterRestore = true;

    const commitRes = await migration.commitMigration({ proof: stageRes.proof!, overwriteExisting: true });
    const restoredVault = await storage.getEncryptedVault();
    const status = await vault.getStatus();

    assert(commitRes.success === false, 'Commit failed with existing authority and simulated post-unlock failure');
    assert(restoredVault?.fingerprint === previousVault?.fingerprint, 'Old disk authority restored');
    assert((await storage.getCustomerRegistry())[0]?.customerId === 'CUS-OLD-1', 'Old customer registry restored');
    assert(status.status === 'locked', 'Runtime vault remains locked after rollback');
  }

  // -----------------------------------------------------------
  // Test 19: Strict Customer Validation Rejects Duplicate Normalized Email
  // -----------------------------------------------------------
  console.log('\n[Test 19] Strict Customer Validation Rejects Duplicate Normalized Email');
  {
    const { migration } = createTestServices();
    const { backup } = await createValidBackupPayload(password);
    backup.customers = [
      ...backup.customers!,
      { ...backup.customers![0], customerId: 'CUS-DIFFERENT-2' }
    ];
    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Duplicate emailNormalized rejected');
    assert(!!res.error?.includes('Duplicate emailNormalized'), 'Duplicate normalized email error reported');
  }

  // -----------------------------------------------------------
  // Test 20: Strict Customer Validation Rejects Duplicate Customer ID
  // -----------------------------------------------------------
  console.log('\n[Test 20] Strict Customer Validation Rejects Duplicate Customer ID');
  {
    const { migration } = createTestServices();
    const { backup } = await createValidBackupPayload(password);
    backup.customers = [
      ...backup.customers!,
      { ...backup.customers![0], email: 'second@example.com', emailNormalized: 'second@example.com' }
    ];
    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Duplicate customerId rejected');
    assert(!!res.error?.includes('Duplicate customerId'), 'Duplicate customerId error reported');
  }

  // -----------------------------------------------------------
  // Test 21: Strict Customer Validation Rejects emailNormalized Mismatch
  // -----------------------------------------------------------
  console.log('\n[Test 21] Strict Customer Validation Rejects emailNormalized Mismatch');
  {
    const { migration } = createTestServices();
    const { backup } = await createValidBackupPayload(password);
    backup.customers![0].emailNormalized = 'wrong@example.com';
    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'emailNormalized mismatch rejected');
    assert(!!res.error?.includes('emailNormalized must equal'), 'emailNormalized mismatch error reported');
  }

  // -----------------------------------------------------------
  // Test 22: Strict Customer Validation Rejects Invalid Timestamps
  // -----------------------------------------------------------
  console.log('\n[Test 22] Strict Customer Validation Rejects Invalid Timestamps');
  {
    const { migration } = createTestServices();
    const { backup } = await createValidBackupPayload(password);
    backup.customers![0].updatedAt = 'not-a-date';
    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === false, 'Invalid customer timestamps rejected');
    assert(!!res.error?.includes('valid date strings'), 'Invalid timestamp error reported');
  }

  // -----------------------------------------------------------
  // Test 23: Strict Customer Validation Accepts Optional Field Types
  // -----------------------------------------------------------
  console.log('\n[Test 23] Strict Customer Validation Accepts Optional Field Types');
  {
    const { migration } = createTestServices();
    const { backup } = await createValidBackupPayload(password);
    backup.customers![0] = {
      ...backup.customers![0],
      whatsapp: '+6281234567890',
      segment: 'enterprise',
      acquisitionSource: 'referral',
      marketingConsent: true
    };
    const res = await migration.stageMigration(JSON.stringify(backup), password);
    assert(res.success === true, 'Valid optional customer fields accepted');
  }

  // -----------------------------------------------------------
  // Test 24: Migration Proof Uses Secure Randomness Shape
  // -----------------------------------------------------------
  console.log('\n[Test 24] Migration Proof Uses Secure Randomness Shape');
  {
    const { migration } = createTestServices();
    const { backup } = await createValidBackupPayload(password);
    const res = await migration.stageMigration(JSON.stringify(backup), password);
    const source = fs.readFileSync(new URL('../electron/services/migration-service.ts', import.meta.url), 'utf-8');
    assert(/^mig_\d+_[0-9a-f]{32}$/.test(res.proof!.proofId), 'Migration proof ID uses 16-byte hex suffix');
    assert(source.includes("randomBytes(16)") && !source.includes('Math.random()'), 'Migration proof source uses node:crypto randomBytes, not Math.random');
  }

  console.log('\n------------------------------------------------------');
  console.log(`Phase 4 Migration Tests Finished: ${passed} passed, ${failed} failed.`);
  console.log('------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMigrationTests().catch((err) => {
  console.error('Fatal error during migration test execution:', err);
  process.exit(1);
});
