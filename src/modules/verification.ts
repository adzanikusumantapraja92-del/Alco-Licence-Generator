/**
 * ALCO License Verification Module
 * 
 * Used by ALCO Customer Applications (or testing simulators) to verify:
 * 1. Digital signature valid against embedded Ed25519 Public Key
 * 2. Strict schema and format compliance (fail-closed)
 * 3. appId matches this specific application
 * 4. deviceId matches current customer machine hardware
 * 5. License is not expired (lifetime vs subscription)
 * 6. License format and version is supported
 */

import { AlcoVerificationResult, AlcoLicensePayload } from './types';
import { unpackLicenseKey, verifySignature } from './signing';
import { canonicalJsonStringify } from './canonical';
import { validateLicensePayloadSchema } from './license-payload';

export interface VerifyLicenseOptions {
  licenseKey: string;
  expectedAppId: string;
  expectedDeviceId: string;
  publicKeyHex: string;
  currentDate?: Date;
}

/**
 * Full verification pipeline for ALCO applications
 */
export function verifyAlcoLicense(options: VerifyLicenseOptions): AlcoVerificationResult {
  const {
    licenseKey,
    expectedAppId,
    expectedDeviceId,
    publicKeyHex,
    currentDate = new Date()
  } = options;

  // Initialize checks
  const checks = {
    signatureValid: false,
    appIdMatches: false,
    deviceIdMatches: false,
    notExpired: false,
    versionSupported: false
  };

  const defaultDetails = {
    daysRemaining: null as number | null,
    isLifetime: false,
    appId: '',
    deviceId: '',
    plan: '',
    features: [] as string[],
    expiresAtFormatted: 'N/A'
  };

  // Step 1: Unpack format and validate cryptographic packaging
  const unpacked = unpackLicenseKey(licenseKey);
  if (!unpacked.success || !unpacked.canonicalPayload || !unpacked.signatureHex) {
    return {
      valid: false,
      reason: unpacked.error || 'Invalid license format or unsupported version',
      checks,
      details: defaultDetails
    };
  }

  checks.versionSupported = unpacked.version === '1.0';

  // Step 2: Parse raw JSON
  let rawParsed: unknown;
  try {
    rawParsed = JSON.parse(unpacked.canonicalPayload);
  } catch {
    return {
      valid: false,
      reason: 'Corrupted license data: failed to parse JSON',
      checks,
      details: defaultDetails
    };
  }

  // Step 3: Strict Schema Validation (Fail-Closed)
  const schemaResult = validateLicensePayloadSchema(rawParsed);
  if (!schemaResult.valid || !schemaResult.payload) {
    return {
      valid: false,
      reason: `Malformed license payload (fail-closed): ${schemaResult.error}`,
      checks,
      details: defaultDetails
    };
  }

  const payload: AlcoLicensePayload = schemaResult.payload;

  // Strict Lifetime vs Subscription determination
  const isLifetime = payload.licenseType === 'lifetime' && payload.expiresAt === null;

  // Populate basic details
  defaultDetails.appId = payload.appId;
  defaultDetails.deviceId = payload.deviceId;
  defaultDetails.plan = payload.plan;
  defaultDetails.features = payload.features || [];
  defaultDetails.isLifetime = isLifetime;

  // Step 4: Verify Ed25519 digital signature
  // Re-serialize the validated payload canonically using the unified serializer
  const canonicalCheck = canonicalJsonStringify(payload);
  const signatureOk = verifySignature(canonicalCheck, unpacked.signatureHex, publicKeyHex);
  checks.signatureValid = signatureOk;

  if (!signatureOk) {
    return {
      valid: false,
      reason: 'Cryptographic signature is INVALID. The license was forged, tampered with, or signed with an unrecognized key.',
      payload,
      checks,
      details: defaultDetails
    };
  }

  // Step 5: Verify App ID
  const appIdOk = payload.appId.toLowerCase() === expectedAppId.trim().toLowerCase();
  checks.appIdMatches = appIdOk;
  if (!appIdOk) {
    return {
      valid: false,
      reason: `App ID mismatch: This license is for "${payload.appId}", but this application is "${expectedAppId}".`,
      payload,
      checks,
      details: defaultDetails
    };
  }

  // Step 6: Verify Device ID
  const deviceIdOk = payload.deviceId.trim().toUpperCase() === expectedDeviceId.trim().toUpperCase();
  checks.deviceIdMatches = deviceIdOk;
  if (!deviceIdOk) {
    return {
      valid: false,
      reason: `Device ID mismatch: This license is locked to hardware "${payload.deviceId}", but this machine is "${expectedDeviceId}".`,
      payload,
      checks,
      details: defaultDetails
    };
  }

  // Step 7: Verify Expiration
  if (isLifetime) {
    checks.notExpired = true;
    defaultDetails.expiresAtFormatted = 'Lifetime (Never Expires)';
    defaultDetails.daysRemaining = null;
  } else {
    // Subscription license
    const expireTime = new Date(payload.expiresAt!).getTime();
    const nowTime = currentDate.getTime();
    const diffMs = expireTime - nowTime;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    defaultDetails.expiresAtFormatted = new Date(payload.expiresAt!).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    defaultDetails.daysRemaining = diffDays;

    if (diffMs > 0) {
      checks.notExpired = true;
    } else {
      checks.notExpired = false;
      return {
        valid: false,
        reason: `License expired on ${defaultDetails.expiresAtFormatted} (${Math.abs(diffDays)} day(s) ago).`,
        payload,
        checks,
        details: defaultDetails
      };
    }
  }

  const allPassed = Object.values(checks).every(Boolean);

  return {
    valid: allPassed,
    reason: allPassed ? undefined : 'Validation checks did not pass',
    payload,
    checks,
    details: defaultDetails
  };
}

/**
 * Standalone Client Verification Code for ALCO Electron apps.
 * Implements the IDENTICAL canonicalization and strict schema validation as the generator.
 */
export const CLIENT_VERIFICATION_SNIPPET = `
// ALCO Client SDK - Verification Module
// Install dependency in customer app: npm install tweetnacl
import nacl from 'tweetnacl';

// 1. EMBED OWNER PUBLIC KEY (Safe to distribute inside client app bundle)
export const ALCO_PUBLIC_KEY = 'YOUR_OWNER_PUBLIC_KEY_HEX_HERE';
export const CURRENT_APP_ID = 'alco-content-engine';

/**
 * UNIFIED CANONICAL JSON SERIALIZER (100% Byte-Identical to ALCO License Authority)
 */
function canonicalJsonStringify(val) {
  if (val === null) {
    return 'null';
  }

  const t = typeof val;

  if (t === 'boolean') {
    return val ? 'true' : 'false';
  }

  if (t === 'number') {
    if (!Number.isFinite(val)) {
      throw new TypeError('Canonical JSON: Cannot serialize non-finite numbers (NaN or Infinity)');
    }
    return JSON.stringify(val);
  }

  if (t === 'string') {
    return JSON.stringify(val);
  }

  if (Array.isArray(val)) {
    const items = val.map(item => {
      // JSON spec: undefined in array serializes as null
      if (item === undefined || typeof item === 'symbol' || typeof item === 'function') {
        return 'null';
      }
      return canonicalJsonStringify(item);
    });
    return '[' + items.join(',') + ']';
  }

  if (t === 'object') {
    // If object defines custom toJSON, resolve it first
    const target = typeof val.toJSON === 'function' 
      ? val.toJSON() 
      : val;

    if (target === null) {
      return 'null';
    }

    if (typeof target !== 'object' || Array.isArray(target)) {
      return canonicalJsonStringify(target);
    }

    const keys = Object.keys(target).sort();
    const pairs = [];

    for (const key of keys) {
      const v = target[key];
      // JSON spec: omit undefined, functions, and symbols in objects
      if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
        continue;
      }
      pairs.push(JSON.stringify(key) + ':' + canonicalJsonStringify(v));
    }

    return '{' + pairs.join(',') + '}';
  }

  // Unsupported types (functions, symbols, undefined at root)
  throw new TypeError('Canonical JSON: Unsupported type ' + t);
}

/**
 * Validates hardware device ID format
 */
function isValidDeviceId(deviceId) {
  return /^ALCO-DEV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test((deviceId || '').trim());
}

/**
 * Strict schema validation for license payloads (Identical to ALCO Authority)
 * Fail-closed on any invalid type, missing field, or format error.
 */
function validateClientLicensePayloadSchema(raw) {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'License payload must be a non-null JSON object' };
  }

  const obj = raw;

  // 1. licenseVersion
  if (typeof obj.licenseVersion !== 'string' || !obj.licenseVersion.trim()) {
    return { valid: false, error: 'Missing or invalid "licenseVersion" (must be non-empty string)' };
  }
  if (obj.licenseVersion !== '1.0') {
    return { valid: false, error: 'Unsupported license version "' + obj.licenseVersion + '" (expected "1.0")' };
  }

  // 2. licenseId
  if (typeof obj.licenseId !== 'string' || !obj.licenseId.trim() || obj.licenseId.length > 100) {
    return { valid: false, error: 'Missing or invalid "licenseId" (must be 1-100 characters)' };
  }

  // 3. appId
  if (typeof obj.appId !== 'string' || !obj.appId.trim() || obj.appId.length > 100) {
    return { valid: false, error: 'Missing or invalid "appId" (must be 1-100 characters)' };
  }

  // 4. deviceId
  if (typeof obj.deviceId !== 'string' || !obj.deviceId.trim()) {
    return { valid: false, error: 'Missing "deviceId" string' };
  }
  if (!isValidDeviceId(obj.deviceId)) {
    return { valid: false, error: 'Invalid hardware device ID format: "' + obj.deviceId + '". Expected format "ALCO-DEV-XXXX-XXXX-XXXX"' };
  }

  // 5. customerId
  if (typeof obj.customerId !== 'string' || !obj.customerId.trim() || obj.customerId.length > 100) {
    return { valid: false, error: 'Missing or invalid "customerId" (must be 1-100 characters)' };
  }

  // 6. plan (official supported enum)
  const validPlans = ['starter', 'pro', 'enterprise', 'custom'];
  if (typeof obj.plan !== 'string' || !validPlans.includes(obj.plan)) {
    return { valid: false, error: 'Invalid plan "' + obj.plan + '". Expected one of: ' + validPlans.join(', ') };
  }

  // 7. features
  if (!Array.isArray(obj.features)) {
    return { valid: false, error: 'Invalid "features" attribute (must be an array of feature flags)' };
  }
  for (let i = 0; i < obj.features.length; i++) {
    if (typeof obj.features[i] !== 'string') {
      return { valid: false, error: 'Invalid feature item at index ' + i + ' (must be string)' };
    }
  }

  // 8. licenseType
  if (obj.licenseType !== 'lifetime' && obj.licenseType !== 'subscription') {
    return { valid: false, error: 'Invalid licenseType "' + obj.licenseType + '". Must be either "lifetime" or "subscription"' };
  }

  // 9. issuedAt
  if (typeof obj.issuedAt !== 'string' || !obj.issuedAt.trim()) {
    return { valid: false, error: 'Missing "issuedAt" timestamp' };
  }
  const issuedTime = Date.parse(obj.issuedAt);
  if (isNaN(issuedTime)) {
    return { valid: false, error: 'Invalid "issuedAt" format: must be valid ISO 8601 date string' };
  }

  // 10. expiresAt (Strict Lifetime vs Subscription logic)
  if (obj.licenseType === 'lifetime') {
    if (obj.expiresAt !== null) {
      return { 
        valid: false, 
        error: 'Schema violation: Lifetime licenses MUST have "expiresAt" set strictly to null' 
      };
    }
  } else if (obj.licenseType === 'subscription') {
    if (obj.expiresAt === null || typeof obj.expiresAt !== 'string' || !obj.expiresAt.trim()) {
      return { 
        valid: false, 
        error: 'Schema violation: Subscription licenses MUST have a non-null ISO "expiresAt" date' 
      };
    }
    const expireTime = Date.parse(obj.expiresAt);
    if (isNaN(expireTime)) {
      return { 
        valid: false, 
        error: 'Invalid "expiresAt" format: must be valid ISO 8601 date string' 
      };
    }
  }

  // 11. Optional customerName
  let customerName = undefined;
  if (obj.customerName !== undefined) {
    if (typeof obj.customerName !== 'string') {
      return { valid: false, error: 'Invalid "customerName" (must be string if provided)' };
    }
    customerName = obj.customerName.trim() || undefined;
  }

  // 12. Optional metadata
  let metadata = undefined;
  if (obj.metadata !== undefined) {
    if (typeof obj.metadata !== 'object' || obj.metadata === null || Array.isArray(obj.metadata)) {
      return { valid: false, error: 'Invalid "metadata" (must be an object if provided)' };
    }
    metadata = {
      issuedBy: typeof obj.metadata.issuedBy === 'string' ? obj.metadata.issuedBy : undefined,
      appName: typeof obj.metadata.appName === 'string' ? obj.metadata.appName : undefined,
      notes: typeof obj.metadata.notes === 'string' ? obj.metadata.notes : undefined
    };
  }

  return {
    valid: true,
    payload: {
      licenseVersion: obj.licenseVersion,
      licenseId: obj.licenseId,
      appId: obj.appId,
      deviceId: obj.deviceId,
      customerId: obj.customerId,
      customerName,
      plan: obj.plan,
      licenseType: obj.licenseType,
      features: obj.features,
      issuedAt: obj.issuedAt,
      expiresAt: obj.expiresAt,
      metadata
    }
  };
}

/**
 * Strict hex string to Uint8Array converter
 */
function hexToBytes(hex) {
  const trimmed = (hex || '').trim();
  if (trimmed.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(trimmed)) {
    throw new Error('Invalid hexadecimal string');
  }
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < trimmed.length; i += 2) {
    bytes[i / 2] = parseInt(trimmed.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Base64URL string decoder
 */
function decodeBase64Url(str) {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) {
    throw new Error('Invalid Base64URL characters');
  }
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Verifies ALCO license key against machine hardware ID and embedded public key
 */
export function verifyClientLicense(licenseKey, currentDeviceId) {
  try {
    const cleanKey = (licenseKey || '').trim();
    if (cleanKey.length > 32768) {
      return { valid: false, reason: 'License key exceeds maximum length limit' };
    }
    if (!cleanKey.startsWith('ALCO-LIC-v1.')) {
      return { valid: false, reason: 'Invalid license format or unsupported version prefix' };
    }

    const parts = cleanKey.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Malformed license structure (expected 3 dot-separated segments)' };
    }

    const [, b64Payload, signatureHex] = parts;
    if (signatureHex.length !== 128 || !/^[0-9a-fA-F]{128}$/.test(signatureHex)) {
      return { valid: false, reason: 'Invalid signature format (must be 128 hexadecimal characters)' };
    }

    const jsonStr = decodeBase64Url(b64Payload);
    let rawParsed;
    try {
      rawParsed = JSON.parse(jsonStr);
    } catch {
      return { valid: false, reason: 'Corrupted license data: JSON parsing failed' };
    }

    // 1. Strict Schema Validation (Identical to ALCO Authority)
    const schemaValidation = validateClientLicensePayloadSchema(rawParsed);
    if (!schemaValidation.valid || !schemaValidation.payload) {
      return { valid: false, reason: 'Malformed license payload (fail-closed): ' + schemaValidation.error };
    }

    const payload = schemaValidation.payload;

    // 2. Strict Lifetime vs Subscription verification
    const isLifetime = payload.licenseType === 'lifetime' && payload.expiresAt === null;
    if (!isLifetime) {
      const expireTime = Date.parse(payload.expiresAt);
      if (expireTime < Date.now()) {
        return { valid: false, reason: 'License expired on ' + payload.expiresAt };
      }
    }

    // 3. Check App ID
    if (payload.appId.toLowerCase() !== CURRENT_APP_ID.toLowerCase()) {
      return { valid: false, reason: 'App ID mismatch: License is for "' + payload.appId + '", but this app is "' + CURRENT_APP_ID + '"' };
    }

    // 4. Check Device Lock
    if (payload.deviceId.trim().toUpperCase() !== (currentDeviceId || '').trim().toUpperCase()) {
      return { valid: false, reason: 'Device ID mismatch: License is bound to "' + payload.deviceId + '", but current hardware is "' + currentDeviceId + '"' };
    }

    // 5. Cryptographic Ed25519 Signature Verification
    const canonicalStr = canonicalJsonStringify(payload);
    const msgBytes = new TextEncoder().encode(canonicalStr);
    const sigBytes = hexToBytes(signatureHex);
    const pubBytes = hexToBytes(ALCO_PUBLIC_KEY);

    const isSigValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
    if (!isSigValid) {
      return { valid: false, reason: 'Cryptographic signature is invalid or forged' };
    }

    return {
      valid: true,
      plan: payload.plan,
      features: payload.features || [],
      expiresAt: payload.expiresAt,
      isLifetime
    };
  } catch (err) {
    return { valid: false, reason: err && err.message ? err.message : 'License verification failed' };
  }
}
`.trim();

/**
 * Direct TypeScript export of the Client Verifier logic
 * Guarantees that automated tests execute the EXACT logic embedded in CLIENT_VERIFICATION_SNIPPET.
 */
export function verifyClientLicenseStandalone(
  licenseKey: string,
  currentDeviceId: string,
  publicKeyHex: string,
  currentAppId: string,
  currentDate: Date = new Date()
): { valid: boolean; reason?: string; plan?: string; features?: string[]; expiresAt?: string | null; isLifetime?: boolean } {
  try {
    const cleanKey = (licenseKey || '').trim();
    if (cleanKey.length > 32768) {
      return { valid: false, reason: 'License key exceeds maximum length limit' };
    }
    if (!cleanKey.startsWith('ALCO-LIC-v1.')) {
      return { valid: false, reason: 'Invalid license format or unsupported version prefix' };
    }

    const parts = cleanKey.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Malformed license structure (expected 3 dot-separated segments)' };
    }

    const [, b64Payload, signatureHex] = parts;
    if (signatureHex.length !== 128 || !/^[0-9a-fA-F]{128}$/.test(signatureHex)) {
      return { valid: false, reason: 'Invalid signature format (must be 128 hexadecimal characters)' };
    }

    // Base64URL decode
    let b64 = b64Payload.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const jsonStr = atob(b64);
    
    let rawParsed: any;
    try {
      rawParsed = JSON.parse(jsonStr);
    } catch {
      return { valid: false, reason: 'Corrupted license data: JSON parsing failed' };
    }

    // Strict schema check (identical to validateLicensePayloadSchema)
    const schemaValidation = validateLicensePayloadSchema(rawParsed);
    if (!schemaValidation.valid || !schemaValidation.payload) {
      return { valid: false, reason: 'Malformed license payload (fail-closed): ' + schemaValidation.error };
    }

    const payload = schemaValidation.payload;

    // Strict Lifetime vs Subscription verification
    const isLifetime = payload.licenseType === 'lifetime' && payload.expiresAt === null;
    if (!isLifetime) {
      const expireTime = Date.parse(payload.expiresAt as string);
      if (expireTime < currentDate.getTime()) {
        return { valid: false, reason: 'License expired on ' + payload.expiresAt };
      }
    }

    // App ID check
    if (payload.appId.toLowerCase() !== currentAppId.toLowerCase()) {
      return { valid: false, reason: 'App ID mismatch: License is for "' + payload.appId + '", but this app is "' + currentAppId + '"' };
    }

    // Device Lock check
    if (payload.deviceId.trim().toUpperCase() !== (currentDeviceId || '').trim().toUpperCase()) {
      return { valid: false, reason: 'Device ID mismatch: License is bound to "' + payload.deviceId + '", but current hardware is "' + currentDeviceId + '"' };
    }

    // Cryptographic Ed25519 signature check using unified canonical JSON
    const canonicalStr = canonicalJsonStringify(payload);
    const isSigValid = verifySignature(canonicalStr, signatureHex, publicKeyHex);
    if (!isSigValid) {
      return { valid: false, reason: 'Cryptographic signature is invalid or forged' };
    }

    return {
      valid: true,
      plan: payload.plan,
      features: payload.features || [],
      expiresAt: payload.expiresAt,
      isLifetime
    };
  } catch (err: any) {
    return { valid: false, reason: err && err.message ? err.message : 'License verification failed' };
  }
}
