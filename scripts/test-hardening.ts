/**
 * ALCO License Generator - Regression & Security Hardening Test Suite
 * Tests 20+ scenarios covering:
 * - Canonical JSON byte-identity
 * - Unified schema validation
 * - Internal verifier vs Client verifier parity
 * - Fail-closed malformed payloads
 * - Backup decryption and transient proof enforcement
 * - Elimination of private key leakage
 */

// Polyfill localStorage & atob in Node environment if missing
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0
  } as any;
}

if (typeof globalThis.atob === 'undefined') {
  globalThis.atob = (b64: string) => Buffer.from(b64, 'base64').toString('binary');
}

if (typeof globalThis.btoa === 'undefined') {
  globalThis.btoa = (bin: string) => Buffer.from(bin, 'binary').toString('base64');
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis as any;
}

import { canonicalJsonStringify, runCanonicalTestVectors } from '../src/modules/canonical';
import { generateEd25519KeyPair, signCanonicalPayload, packageLicenseKey } from '../src/modules/signing';
import { createLicensePayload, validateLicensePayloadSchema } from '../src/modules/license-payload';
import { verifyAlcoLicense, verifyClientLicenseStandalone } from '../src/modules/verification';
import { 
  initializeOwnerVault, 
  exportVaultBackup, 
  validateBackupFileFormat, 
  verifyBackupDecryption, 
  commitRestoreBackup,
  BackupVerificationProof,
  cancelStagedRestore
} from '../src/modules/storage';

interface TestResult {
  num: number;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(num: number, name: string, condition: boolean, details?: string) {
  results.push({ num, name, passed: condition, details });
  const symbol = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`[${num.toString().padStart(2, '0')}] ${symbol}: ${name}${details ? ' (' + details + ')' : ''}`);
}

async function runTests() {
  console.log('=== RUNNING ALCO SECURITY HARDENING REGRESSION TEST SUITE ===\n');

  // Test 1: Canonical Test Vectors (Byte-Identity)
  const vecRes = runCanonicalTestVectors();
  assert(1, 'Canonical JSON Test Vectors (Built-in Byte-Identity)', vecRes.passed, vecRes.failures.join('; '));

  // Test 2: Deeply Nested & UTF-16 Code-Unit Order
  const nested1 = { z: 1, a: { y: 2, b: 3 } };
  const nested2 = { a: { b: 3, y: 2 }, z: 1 };
  assert(2, 'Deterministic Sorting of Nested Objects', canonicalJsonStringify(nested1) === canonicalJsonStringify(nested2));

  // Test 3: Arrays with null and undefined
  const arrInput = [1, undefined, null, 'text'];
  assert(3, 'Array undefined serializes as null', canonicalJsonStringify(arrInput) === '[1,null,null,"text"]');

  // Test 4: Custom toJSON function resolution
  const customObj = {
    val: { toJSON: () => 'custom-value' },
    regular: 123
  };
  assert(4, 'Custom toJSON resolution in canonicalJsonStringify', canonicalJsonStringify(customObj) === '{"regular":123,"val":"custom-value"}');

  // Test 5: Unicode and escaping preserves byte-identity
  const unicodeObj = { title: 'Jalan Merdeka № 10 — Café ☕', path: 'C:\\Users\\ALCO' };
  const canonicalUnicode = canonicalJsonStringify(unicodeObj);
  assert(5, 'Unicode and escaping canonicalization', canonicalUnicode === '{"path":"C:\\\\Users\\\\ALCO","title":"Jalan Merdeka № 10 — Café ☕"}');

  // Generate Authority Keypair for subsequent tests
  const authorityKey = generateEd25519KeyPair();
  const testDeviceId = 'ALCO-DEV-9B4A-71E2-5D88';
  const testAppId = 'alco-content-engine';

  // Test 6: Valid Lifetime License - Generator -> Internal Verifier
  const { payload: lifetimePayload, canonicalPayload: lifetimeCanonical } = createLicensePayload({
    appId: testAppId,
    deviceId: testDeviceId,
    customerId: 'CUST-001',
    customerName: 'PT Nusantara Digital',
    plan: 'enterprise',
    features: ['gpu_accel', 'cloud_sync'],
    licenseType: 'lifetime',
    expiresAt: null
  });

  const lifetimeSig = signCanonicalPayload(lifetimeCanonical, authorityKey.privateKeyHex);
  const lifetimeKey = packageLicenseKey(lifetimeCanonical, lifetimeSig);

  const internalVerifyLifetime = verifyAlcoLicense({
    licenseKey: lifetimeKey,
    expectedAppId: testAppId,
    expectedDeviceId: testDeviceId,
    publicKeyHex: authorityKey.publicKeyHex
  });
  assert(6, 'Internal Verifier: Lifetime License Acceptance', internalVerifyLifetime.valid && internalVerifyLifetime.details.isLifetime, internalVerifyLifetime.reason);

  // Test 7: Valid Lifetime License - Generator -> Client Verifier (Parity)
  const clientVerifyLifetime = verifyClientLicenseStandalone(
    lifetimeKey,
    testDeviceId,
    authorityKey.publicKeyHex,
    testAppId
  );
  assert(7, 'Client Verifier: Lifetime License Acceptance (Identical Result)', clientVerifyLifetime.valid === true && clientVerifyLifetime.isLifetime === true, clientVerifyLifetime.reason);

  // Test 8: Valid Subscription License - Generator -> Internal Verifier
  const futureDate = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  const { payload: subPayload, canonicalPayload: subCanonical } = createLicensePayload({
    appId: testAppId,
    deviceId: testDeviceId,
    customerId: 'CUST-002',
    plan: 'pro',
    features: ['pro_export'],
    licenseType: 'subscription',
    expiresAt: futureDate
  });

  const subSig = signCanonicalPayload(subCanonical, authorityKey.privateKeyHex);
  const subKey = packageLicenseKey(subCanonical, subSig);

  const internalVerifySub = verifyAlcoLicense({
    licenseKey: subKey,
    expectedAppId: testAppId,
    expectedDeviceId: testDeviceId,
    publicKeyHex: authorityKey.publicKeyHex
  });
  assert(8, 'Internal Verifier: Subscription License Acceptance', internalVerifySub.valid && !internalVerifySub.details.isLifetime, internalVerifySub.reason);

  // Test 9: Valid Subscription License - Generator -> Client Verifier (Parity)
  const clientVerifySub = verifyClientLicenseStandalone(
    subKey,
    testDeviceId,
    authorityKey.publicKeyHex,
    testAppId
  );
  assert(9, 'Client Verifier: Subscription License Acceptance (Identical Result)', clientVerifySub.valid === true && clientVerifySub.isLifetime === false, clientVerifySub.reason);

  // Test 10: Fail-Closed on Schema: Invalid licenseVersion
  const malformedVersion = { ...lifetimePayload, licenseVersion: '2.0' };
  const schemaVerRes = validateLicensePayloadSchema(malformedVersion);
  assert(10, 'Schema Validation: Reject invalid licenseVersion', !schemaVerRes.valid);

  // Test 11: Fail-Closed on Schema: Unsupported Plan
  const malformedPlan = { ...lifetimePayload, plan: 'unsupported_tier' };
  const schemaPlanRes = validateLicensePayloadSchema(malformedPlan);
  assert(11, 'Schema Validation: Reject unsupported plan enum', !schemaPlanRes.valid);

  // Test 12: Fail-Closed on Schema: Non-string Features
  const malformedFeatures = { ...lifetimePayload, features: ['valid_flag', 999] };
  const schemaFeatRes = validateLicensePayloadSchema(malformedFeatures);
  assert(12, 'Schema Validation: Reject non-string features in array', !schemaFeatRes.valid);

  // Test 13: Fail-Closed on Schema: Lifetime with non-null expiresAt
  const malformedLifetimeExpire = { ...lifetimePayload, expiresAt: '2027-01-01T00:00:00Z' };
  const schemaLifeExpRes = validateLicensePayloadSchema(malformedLifetimeExpire);
  assert(13, 'Schema Validation: Reject lifetime license with non-null expiresAt', !schemaLifeExpRes.valid);

  // Test 14: Fail-Closed on Schema: Subscription with null expiresAt
  const malformedSubExpire = { ...subPayload, expiresAt: null };
  const schemaSubExpRes = validateLicensePayloadSchema(malformedSubExpire);
  assert(14, 'Schema Validation: Reject subscription license with null expiresAt', !schemaSubExpRes.valid);

  // Test 15: Fail-Closed on Schema: Invalid Device ID Format
  const malformedDeviceId = { ...lifetimePayload, deviceId: 'INVALID_DEVICE_FORMAT' };
  const schemaDeviceRes = validateLicensePayloadSchema(malformedDeviceId);
  assert(15, 'Schema Validation: Reject non-compliant device ID format', !schemaDeviceRes.valid);

  // Test 16: Client Verifier: Expired Subscription License Rejection
  const pastDate = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { payload: expiredPayload, canonicalPayload: expiredCanonical } = createLicensePayload({
    appId: testAppId,
    deviceId: testDeviceId,
    customerId: 'CUST-003',
    plan: 'starter',
    features: [],
    licenseType: 'subscription',
    expiresAt: pastDate
  });
  const expiredSig = signCanonicalPayload(expiredCanonical, authorityKey.privateKeyHex);
  const expiredKey = packageLicenseKey(expiredCanonical, expiredSig);
  const clientExpiredRes = verifyClientLicenseStandalone(expiredKey, testDeviceId, authorityKey.publicKeyHex, testAppId);
  assert(16, 'Client Verifier: Reject expired subscription license', clientExpiredRes.valid === false && (clientExpiredRes.reason?.includes('expired') || false), clientExpiredRes.reason);

  // Test 17: Client Verifier: Forged / Tampered Signature Rejection
  const forgedSig = '0'.repeat(128);
  const forgedKey = packageLicenseKey(lifetimeCanonical, forgedSig);
  const clientForgedRes = verifyClientLicenseStandalone(forgedKey, testDeviceId, authorityKey.publicKeyHex, testAppId);
  assert(17, 'Client Verifier: Reject forged signature', clientForgedRes.valid === false && clientForgedRes.reason?.includes('signature'));

  // Test 18: Backup Restore: Decryption & Transient Proof Generation (NO Private Key Leakage)
  const masterPassword = 'StrongMasterPassword_2026!';
  const { vault } = await initializeOwnerVault(masterPassword);
  const exportedBackupJson = exportVaultBackup();
  const parsedBackup = JSON.parse(exportedBackupJson);

  const verifyDecRes = await verifyBackupDecryption(parsedBackup, masterPassword);
  const hasNoPrivateKey = (verifyDecRes as any).decryptedPrivateKeyHex === undefined;
  const hasValidProof = verifyDecRes.success && !!verifyDecRes.proof && !!verifyDecRes.proof.proofId;
  assert(18, 'Backup Verification: Returns transient proof and NEVER leaks privateKeyHex', hasNoPrivateKey && hasValidProof);

  // Test 19: Backup Restore: Reject Raw / Unverified Backup (Missing Proof)
  const unverifiedCommit = commitRestoreBackup(null as any);
  assert(19, 'Backup Restore: Reject commit without cryptographic proof', !unverifiedCommit.success);

  // Test 20: Backup Restore: Reject Forged Proof
  const fakeProof: BackupVerificationProof = {
    proofId: 'fake-proof-id-0000000000',
    backupFingerprint: 'FAKE-FP',
    backupPublicKeyHex: '0'.repeat(64),
    recordCount: 0,
    issuedAt: Date.now(),
    expiresAt: Date.now() + 60000
  };
  const fakeProofCommit = commitRestoreBackup(fakeProof);
  assert(20, 'Backup Restore: Reject commit with forged/mismatched proof', !fakeProofCommit.success);

  // Test 21: Backup Restore: Successfully Commit with Valid Staged Proof
  if (verifyDecRes.proof) {
    const validCommit = commitRestoreBackup(verifyDecRes.proof);
    assert(21, 'Backup Restore: Successfully commit when valid proof matches staged backup', validCommit.success);
  } else {
    assert(21, 'Backup Restore: Successfully commit when valid proof matches staged backup', false, 'No proof returned');
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  console.log(`\n=== TEST SUITE COMPLETE: ${passedCount}/${results.length} PASSED ===`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
