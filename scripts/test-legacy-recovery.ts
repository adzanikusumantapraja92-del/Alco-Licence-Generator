/**
 * ALCO License Generator - Safe Legacy Browser Authority Recovery Test Suite
 * 
 * Verifies all 16 critical requirements for detecting, validating, and safely
 * recovering unencrypted browser legacy keys (alco_owner_keypair_v1) into
 * v2 AES-256-GCM encrypted vaults with 100% identity preservation.
 */

import { generateEd25519KeyPair, derivePublicKeyHexFromSecretKey } from '../src/modules/signing';
import { validateLegacyKeyPair } from '../src/modules/legacy-recovery';
import { LocalStoragePersistenceAdapter, STORAGE_KEYS } from '../src/modules/persistence/local-storage-adapter';
import { authorityClient } from '../src/modules/authority-client';
import { MainMigrationService } from '../electron/services/migration-service';
import { MainVaultService } from '../electron/services/vault-service';
import { IAlcoPersistenceService, OwnerSettings } from '../src/modules/persistence/persistence-interface';
import { EncryptedOwnerVault, AlcoLicenseRecord, AlcoCustomerRecord, AlcoAppDefinition } from '../src/modules/types';
import { decryptWithPassword } from '../src/modules/vault-crypto';

// Setup Mock Storage for Node environment
class MockLocalStorage {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] || null;
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

// Setup Mock for Electron Testing
class MockElectronStorage implements IAlcoPersistenceService {
  public vault: EncryptedOwnerVault | null = null;
  public history: AlcoLicenseRecord[] = [];
  public customers: AlcoCustomerRecord[] = [];
  public apps: AlcoAppDefinition[] = [];
  public settings: OwnerSettings = {
    ownerName: 'Test Owner',
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
    return { publicKeyHex: this.vault.publicKeyHex, fingerprint: this.vault.fingerprint, createdAt: this.vault.createdAt };
  }
  async getCustomerRegistry() { return this.customers; }
  async saveCustomerRegistry(c: AlcoCustomerRecord[]) { this.customers = c; }
  async getLicenseHistory() { return this.history; }
  async saveLicenseHistory(h: AlcoLicenseRecord[]) { this.history = h; }
  async appendLicenseRecord(r: AlcoLicenseRecord) { this.history.push(r); }
  async updateLicenseStatus(id: string, s: 'active' | 'revoked') {
    const item = this.history.find(x => x.id === id);
    if (item) item.status = s;
  }
  async deleteLicenseRecord(id: string) {
    this.history = this.history.filter(x => x.id !== id);
  }
  async getCustomApps() { return this.apps; }
  async saveCustomApps(a: AlcoAppDefinition[]) { this.apps = a; }
  async getOwnerSettings() { return this.settings; }
  async saveOwnerSettings(s: OwnerSettings) { this.settings = s; }
  async exportBackupPayload(): Promise<any> { throw new Error('Not implemented'); }
  async restoreFromBackupPayload(payload: any): Promise<void> {
    if (!payload.encryptedVault) throw new Error('Corrupted backup');
    this.vault = JSON.parse(JSON.stringify(payload.encryptedVault));
    if (Array.isArray(payload.customers)) {
      this.customers = JSON.parse(JSON.stringify(payload.customers));
    }
    if (Array.isArray(payload.history)) {
      this.history = JSON.parse(JSON.stringify(payload.history));
    }
    if (payload.settings) {
      this.settings = JSON.parse(JSON.stringify(payload.settings));
    }
    if (Array.isArray(payload.customApps)) {
      this.apps = JSON.parse(JSON.stringify(payload.customApps));
    }
  }
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('ALCO LICENSE GENERATOR - SAFE LEGACY BROWSER RECOVERY TEST SUITE');
  console.log('===============================================================\n');

  const adapter = new LocalStoragePersistenceAdapter();

  // -------------------------------------------------------------
  // Test 1: Valid legacy key detected
  // -------------------------------------------------------------
  console.log('[Test 1] Valid legacy key detected');
  mockStorage.clear();
  const originalKeyPair = generateEd25519KeyPair();
  mockStorage.setItem(STORAGE_KEYS.LEGACY_KEYPAIR, JSON.stringify({
    publicKeyHex: originalKeyPair.publicKeyHex,
    privateKeyHex: originalKeyPair.privateKeyHex,
    fingerprint: originalKeyPair.fingerprint
  }));

  const hasLegacy = await adapter.hasLegacyKeyPair();
  const status1 = await authorityClient.getVaultStatus();
  assert(hasLegacy === true, '1.1 LocalStoragePersistenceAdapter reports hasLegacyKeyPair === true');
  assert(status1.firstRunState === 'legacy_authority_detected', '1.2 authorityClient.getVaultStatus reports firstRunState === legacy_authority_detected');
  assert(status1.status === 'uninitialized', '1.3 authorityClient.getVaultStatus reports status === uninitialized');

  // -------------------------------------------------------------
  // Test 2: Legacy fingerprint displayed
  // -------------------------------------------------------------
  console.log('\n[Test 2] Legacy fingerprint displayed');
  assert(
    status1.legacyAuthority?.fingerprint === originalKeyPair.fingerprint,
    '2.1 Legacy fingerprint is correctly populated and matches original legacy keypair',
    `Expected ${originalKeyPair.fingerprint}, got ${status1.legacyAuthority?.fingerprint}`
  );
  assert(
    status1.legacyAuthority?.publicKeyHex === originalKeyPair.publicKeyHex,
    '2.2 Legacy public key is correctly populated in legacyAuthority info'
  );
  assert(
    (status1.legacyAuthority as any)?.privateKeyHex === undefined,
    '2.3 Strict Security: legacyAuthority contains ZERO privateKeyHex'
  );

  // -------------------------------------------------------------
  // Test 3: Recovery preserves same public key
  // -------------------------------------------------------------
  console.log('\n[Test 3] Recovery preserves same public key');
  const recoveryPass = 'SecureMasterPassword123!';
  const recoveryRes = await (authorityClient as any).recoverLegacyAuthority({
    masterPassword: recoveryPass,
    vaultHint: 'Recovery test hint'
  });

  assert(recoveryRes.success === true, '3.1 Recovery operation succeeded');
  assert(
    recoveryRes.publicKeyHex.toLowerCase() === originalKeyPair.publicKeyHex.toLowerCase(),
    '3.2 Recovered public key is bit-for-bit identical to original legacy public key',
    `Expected ${originalKeyPair.publicKeyHex}, got ${recoveryRes.publicKeyHex}`
  );

  // -------------------------------------------------------------
  // Test 4: Recovery preserves same fingerprint
  // -------------------------------------------------------------
  console.log('\n[Test 4] Recovery preserves same fingerprint');
  assert(
    recoveryRes.fingerprint === originalKeyPair.fingerprint,
    '4.1 Recovered authority fingerprint is identical to original fingerprint',
    `Expected ${originalKeyPair.fingerprint}, got ${recoveryRes.fingerprint}`
  );

  // -------------------------------------------------------------
  // Test 5: No new Ed25519 key generated
  // -------------------------------------------------------------
  console.log('\n[Test 5] No new Ed25519 key generated');
  const savedVault = await adapter.getEncryptedVault();
  assert(savedVault !== null, '5.1 Encrypted vault exists in storage');
  assert(
    savedVault?.publicKeyHex.toLowerCase() === originalKeyPair.publicKeyHex.toLowerCase(),
    '5.2 Saved vault public key strictly matches legacy key (no new keypair generated)'
  );
  assert(
    savedVault?.fingerprint === originalKeyPair.fingerprint,
    '5.3 Saved vault fingerprint strictly matches legacy fingerprint'
  );

  // -------------------------------------------------------------
  // Test 6: Encrypted vault can unlock
  // -------------------------------------------------------------
  console.log('\n[Test 6] Encrypted vault can unlock');
  assert(recoveryRes.status === 'locked', '6.1 Post-recovery vault is locked by default');
  const unlockRes = await authorityClient.unlockVault({ masterPassword: recoveryPass });
  assert(unlockRes.success === true, '6.2 Owner can unlock the recovered vault using master password');
  assert(unlockRes.status === 'unlocked', '6.3 Vault status is unlocked after valid password entry');
  assert(unlockRes.fingerprint === originalKeyPair.fingerprint, '6.4 Unlock response confirms fingerprint');

  // -------------------------------------------------------------
  // Test 7: Encrypted vault public/private key match
  // -------------------------------------------------------------
  console.log('\n[Test 7] Encrypted vault public/private key match');
  const decryptedPayloadStr = await decryptWithPassword(savedVault!, recoveryPass);
  const decryptedSecret = JSON.parse(decryptedPayloadStr);
  const derivedPub = derivePublicKeyHexFromSecretKey(decryptedSecret.privateKeyHex);

  assert(
    decryptedSecret.privateKeyHex.toLowerCase() === originalKeyPair.privateKeyHex.toLowerCase(),
    '7.1 Decrypted private key matches original legacy private key'
  );
  assert(
    derivedPub.publicKeyHex.toLowerCase() === savedVault!.publicKeyHex.toLowerCase(),
    '7.2 Public key derived from decrypted private key matches vault public key'
  );
  assert(
    derivedPub.fingerprint === savedVault!.fingerprint,
    '7.3 Fingerprint derived from decrypted private key matches vault fingerprint'
  );

  // -------------------------------------------------------------
  // Test 8: Legacy plaintext key removed only after success
  // -------------------------------------------------------------
  console.log('\n[Test 8] Legacy plaintext key removed only after success');
  const rawLegacyAfterRecovery = mockStorage.getItem(STORAGE_KEYS.LEGACY_KEYPAIR);
  assert(
    rawLegacyAfterRecovery === null,
    '8.1 Plaintext alco_owner_keypair_v1 is permanently purged from storage upon successful recovery'
  );

  // -------------------------------------------------------------
  // Test 9: Failed encryption preserves legacy key
  // -------------------------------------------------------------
  console.log('\n[Test 9] Failed encryption preserves legacy key');
  mockStorage.clear();
  const testKey9 = generateEd25519KeyPair();
  mockStorage.setItem(STORAGE_KEYS.LEGACY_KEYPAIR, JSON.stringify(testKey9));

  // Attempt recovery with password < 8 characters
  const shortPassRes = await (authorityClient as any).recoverLegacyAuthority({
    masterPassword: 'short',
    vaultHint: 'hint'
  });
  assert(shortPassRes.success === false, '9.1 Recovery rejects passwords under 8 characters');
  assert(
    mockStorage.getItem(STORAGE_KEYS.LEGACY_KEYPAIR) !== null,
    '9.2 Legacy key remains completely untouched when validation or encryption fails'
  );
  assert(
    mockStorage.getItem(STORAGE_KEYS.VAULT) === null,
    '9.3 No partial or unverified vault is left in storage'
  );

  // -------------------------------------------------------------
  // Test 10: Failed verification preserves legacy key
  // -------------------------------------------------------------
  console.log('\n[Test 10] Failed verification preserves legacy key');
  mockStorage.clear();
  const testKey10 = generateEd25519KeyPair();
  mockStorage.setItem(STORAGE_KEYS.LEGACY_KEYPAIR, JSON.stringify(testKey10));

  // Patch LocalStoragePersistenceAdapter.prototype to return tampered data during verification
  const originalProtoGetEncryptedVault = LocalStoragePersistenceAdapter.prototype.getEncryptedVault;
  let simulateTamper = true;
  LocalStoragePersistenceAdapter.prototype.getEncryptedVault = async function() {
    const real = await originalProtoGetEncryptedVault.call(this);
    if (real && simulateTamper) {
      return { ...real, fingerprint: 'TAMPERED_DURING_READBACK' };
    }
    return real;
  };

  const tamperedRecovery = await (authorityClient as any).recoverLegacyAuthority({
    masterPassword: 'ValidPassword123!',
    vaultHint: 'hint'
  });

  // Restore prototype immediately
  LocalStoragePersistenceAdapter.prototype.getEncryptedVault = originalProtoGetEncryptedVault;

  assert(tamperedRecovery.success === false, '10.1 Recovery fails closed when read-back verification fails');
  assert(
    mockStorage.getItem(STORAGE_KEYS.LEGACY_KEYPAIR) !== null,
    '10.2 Legacy plaintext key remains completely intact after verification failure'
  );
  assert(
    mockStorage.getItem(STORAGE_KEYS.VAULT) === null,
    '10.3 Newly created vault is rolled back and deleted after verification failure'
  );

  // -------------------------------------------------------------
  // Test 11: Corrupted legacy public key rejected
  // -------------------------------------------------------------
  console.log('\n[Test 11] Corrupted legacy public key rejected');
  const validKey = generateEd25519KeyPair();
  const corruptedPub1 = {
    privateKeyHex: validKey.privateKeyHex,
    publicKeyHex: 'not-a-valid-hex-length',
    fingerprint: validKey.fingerprint
  };
  const corruptedPub2 = {
    privateKeyHex: validKey.privateKeyHex,
    publicKeyHex: generateEd25519KeyPair().publicKeyHex, // mismatched public key
    fingerprint: validKey.fingerprint
  };

  let threwPub1 = false;
  try {
    validateLegacyKeyPair(corruptedPub1);
  } catch {
    threwPub1 = true;
  }
  assert(threwPub1, '11.1 Rejects invalid public key hex length');

  let threwPub2 = false;
  try {
    validateLegacyKeyPair(corruptedPub2);
  } catch {
    threwPub2 = true;
  }
  assert(threwPub2, '11.2 Rejects public key that does not match derived private key');

  // -------------------------------------------------------------
  // Test 12: Corrupted legacy private key rejected
  // -------------------------------------------------------------
  console.log('\n[Test 12] Corrupted legacy private key rejected');
  const corruptedPriv1 = {
    privateKeyHex: 'invalid_non_hex_key',
    publicKeyHex: validKey.publicKeyHex,
    fingerprint: validKey.fingerprint
  };
  const corruptedPriv2 = {
    privateKeyHex: 'abcdef123456', // too short
    publicKeyHex: validKey.publicKeyHex,
    fingerprint: validKey.fingerprint
  };

  let threwPriv1 = false;
  try { validateLegacyKeyPair(corruptedPriv1); } catch { threwPriv1 = true; }
  assert(threwPriv1, '12.1 Rejects non-hex secret key');

  let threwPriv2 = false;
  try { validateLegacyKeyPair(corruptedPriv2); } catch { threwPriv2 = true; }
  assert(threwPriv2, '12.2 Rejects truncated secret key');

  // -------------------------------------------------------------
  // Test 13: Fingerprint mismatch rejected
  // -------------------------------------------------------------
  console.log('\n[Test 13] Fingerprint mismatch rejected');
  const mismatchedFingerprint = {
    privateKeyHex: validKey.privateKeyHex,
    publicKeyHex: validKey.publicKeyHex,
    fingerprint: 'DEAD...BEEF' // incorrect fingerprint
  };

  let threwFingerprint = false;
  try {
    validateLegacyKeyPair(mismatchedFingerprint);
  } catch {
    threwFingerprint = true;
  }
  assert(threwFingerprint, '13.1 Rejects legacy key candidate with mismatched fingerprint');

  // -------------------------------------------------------------
  // Test 14: Exported backup is 2.0-encrypted
  // -------------------------------------------------------------
  console.log('\n[Test 14] Exported backup is 2.0-encrypted');
  // Recover a clean legacy authority
  mockStorage.clear();
  const testKey14 = generateEd25519KeyPair();
  mockStorage.setItem(STORAGE_KEYS.LEGACY_KEYPAIR, JSON.stringify(testKey14));

  await (authorityClient as any).recoverLegacyAuthority({
    masterPassword: 'ValidMasterPassword123!',
    vaultHint: 'Backup test hint'
  });

  const rawExportJson = await authorityClient.exportBackup();
  const parsedBackup = JSON.parse(rawExportJson);

  assert(
    parsedBackup.alcoVaultVersion === '2.0-encrypted',
    '14.1 Exported backup has alcoVaultVersion: 2.0-encrypted',
    `Got ${parsedBackup.alcoVaultVersion}`
  );
  assert(
    parsedBackup.encryptedVault !== undefined && parsedBackup.encryptedVault.version === '2.0-aes-gcm',
    '14.2 Exported backup contains AES-256-GCM encrypted vault'
  );
  assert(
    parsedBackup.encryptedVault.fingerprint === testKey14.fingerprint,
    '14.3 Exported encrypted vault fingerprint matches original legacy fingerprint'
  );

  // -------------------------------------------------------------
  // Test 15: Exported backup contains no plaintext privateKeyHex
  // -------------------------------------------------------------
  console.log('\n[Test 15] Exported backup contains no plaintext privateKeyHex');
  const exportContainsPrivKey = rawExportJson.includes(testKey14.privateKeyHex);
  const exportContainsPrivField = rawExportJson.includes('"privateKeyHex"');

  assert(!exportContainsPrivKey, '15.1 Exported backup JSON does NOT contain original privateKeyHex');
  assert(!exportContainsPrivField, '15.2 Exported backup JSON does NOT contain privateKeyHex property name');

  // -------------------------------------------------------------
  // Test 16: Electron migration behavior unchanged
  // -------------------------------------------------------------
  console.log('\n[Test 16] Electron migration behavior unchanged');
  const electronStorage = new MockElectronStorage();
  const electronVault = new MainVaultService(electronStorage as any);
  const electronMigration = new MainMigrationService(electronStorage as any, electronVault);

  // 16.1 Electron rejects unencrypted plaintext backup
  const plainLegacyBackup = JSON.stringify({
    alcoVaultVersion: '1.0-plaintext',
    keyPair: testKey14
  });
  const stageResult = await electronMigration.stageMigration(plainLegacyBackup, 'pass');
  assert(
    stageResult.success === false,
    '16.1 Electron migration rejects unencrypted legacy backups (requires 2.0-encrypted)'
  );

  // 16.2 Electron migration succeeds with valid 2.0-encrypted backup
  const validStage = await electronMigration.stageMigration(rawExportJson, 'ValidMasterPassword123!');
  assert(
    validStage.success === true,
    '16.2 Electron migration successfully stages 2.0-encrypted backup'
  );
  assert(
    validStage.proof?.backupFingerprint === testKey14.fingerprint,
    '16.3 Electron migration proof matches identity'
  );

  // 16.3 Electron migration commits and validates parity
  const commitResult = await electronMigration.commitMigration({
    proof: validStage.proof!,
    overwriteExisting: true
  });
  assert(
    commitResult.success === true,
    '16.4 Electron migration commits cleanly with bit-for-bit identity parity'
  );
  assert(
    electronStorage.vault?.fingerprint === testKey14.fingerprint,
    '16.5 Electron vault fingerprint matches identity'
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
