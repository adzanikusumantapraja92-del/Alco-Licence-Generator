import { encodeRequestCode, decodeRequestCode } from '../src/modules/request-code';
import { getCustomerRegistry, upsertCustomerFromRequest } from '../src/modules/customer-registry';
import { createLicensePayload } from '../src/modules/license-payload';
import { generateEd25519KeyPair, signCanonicalPayload, packageLicenseKey } from '../src/modules/signing';
import { verifyAlcoLicense } from '../src/modules/verification';
import {
  commitRestoreBackup,
  exportVaultBackup,
  initializeOwnerVault,
  STORAGE_KEYS,
  validateBackupFileFormat,
  verifyBackupDecryption,
} from '../src/modules/storage';

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
};

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`[PASS] ${message}`);
}

function request(appId: string, email: string, name = 'Adzani Creative') {
  return encodeRequestCode({
    version: '2.0',
    appId,
    deviceId: 'ALCO-DEV-9B4A-71E2-5D88',
    customerName: name,
    customerEmail: email,
    requestId: `REQ-${appId}`,
    timestamp: '2026-09-08T00:00:00.000Z',
  });
}

function resolveCustomer(rawRequest: string) {
  const decoded = decodeRequestCode(rawRequest);
  assert(decoded.success && decoded.data, 'request code decodes');
  return upsertCustomerFromRequest({
    name: decoded.data!.customerName || '',
    email: decoded.data!.customerEmail || '',
  }).customer;
}

const customerA = resolveCustomer(request('alco-creative-system', 'User@Example.com'));
assert(/^CUS-ADZANICREA-[A-Z0-9]{6}$/.test(customerA.customerId), 'new customer gets stable readable ecosystem Customer ID');

const customerARepeat = resolveCustomer(request('alco-creative-system', ' user@example.com '));
assert(customerARepeat.customerId === customerA.customerId, 'same normalized email reuses Customer ID');

const customerSecondApp = resolveCustomer(request('alco-content-engine', 'USER@example.com'));
assert(customerSecondApp.customerId === customerA.customerId, 'second app reuses same ecosystem Customer ID');

const customerB = resolveCustomer(request('alco-creative-system', 'other@example.com', 'Other Customer'));
assert(customerB.customerId !== customerA.customerId, 'different email creates different Customer ID');

const keyPair = generateEd25519KeyPair();
const { payload, canonicalPayload } = createLicensePayload({
  appId: 'alco-creative-system',
  deviceId: 'ALCO-DEV-9B4A-71E2-5D88',
  customerId: customerA.customerId,
  customerName: customerA.name,
  plan: 'pro',
  licenseType: 'lifetime',
  features: ['copywriting'],
  expiresAt: null,
  issuedAt: '2026-09-08T00:00:00.000Z',
  metadata: { issuedBy: 'ALCO License Authority', appName: 'ALCO Creative System' },
});
const signature = signCanonicalPayload(canonicalPayload, keyPair.privateKeyHex);
const licenseKey = packageLicenseKey(canonicalPayload, signature);
const verified = verifyAlcoLicense({
  licenseKey,
  publicKeyHex: keyPair.publicKeyHex,
  expectedAppId: 'alco-creative-system',
  expectedDeviceId: 'ALCO-DEV-9B4A-71E2-5D88',
});
assert(verified.valid && verified.payload?.customerId === customerA.customerId, 'signed license carries registry Customer ID');

const tamperedRequest = request('alco-creative-system', 'tamper@example.com').replace(/.$/, 'A');
assert(!decodeRequestCode(tamperedRequest).success, 'tampered request code is rejected');

const tamperedLicense = licenseKey.replace(/.$/, licenseKey.endsWith('a') ? 'b' : 'a');
const tamperedVerified = verifyAlcoLicense({
  licenseKey: tamperedLicense,
  publicKeyHex: keyPair.publicKeyHex,
  expectedAppId: 'alco-creative-system',
  expectedDeviceId: 'ALCO-DEV-9B4A-71E2-5D88',
});
assert(!tamperedVerified.valid, 'tampered license is rejected');

const masterPassword = 'CustomerBackupPassword_2026!';
await initializeOwnerVault(masterPassword);
const backupJson = exportVaultBackup();
const backup = JSON.parse(backupJson);
assert(Array.isArray(backup.customers) && backup.customers.length >= 2, 'backup exports customer registry');

localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
assert(getCustomerRegistry().length === 0, 'customer registry can be cleared before restore');

const validation = validateBackupFileFormat(backupJson);
assert(validation.valid && validation.backup, 'backup with customers validates');
const verifiedBackup = await verifyBackupDecryption(validation.backup!, masterPassword);
assert(verifiedBackup.success && verifiedBackup.proof, 'backup with customers decrypts and produces restore proof');
const committed = commitRestoreBackup(verifiedBackup.proof!);
assert(committed.success, 'backup with customers restores successfully');

const restoredCustomer = resolveCustomer(request('alco-auto-motion', 'USER@example.com'));
assert(restoredCustomer.customerId === customerA.customerId, 'same normalized email retains same Customer ID after restore');

const oldV2Backup = { ...backup };
delete oldV2Backup.customers;
const oldV2Json = JSON.stringify(oldV2Backup);
const oldValidation = validateBackupFileFormat(oldV2Json);
assert(oldValidation.valid && oldValidation.backup, 'old encrypted v2 backup without customers still validates');
const oldVerified = await verifyBackupDecryption(oldValidation.backup!, masterPassword);
assert(oldVerified.success && oldVerified.proof, 'old encrypted v2 backup without customers still verifies');
const oldCommitted = commitRestoreBackup(oldVerified.proof!);
assert(oldCommitted.success, 'old encrypted v2 backup without customers still restores safely');
