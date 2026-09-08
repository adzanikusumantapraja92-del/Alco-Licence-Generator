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
 * UNIFIED CANONICAL JSON SERIALIZER (Identical to ALCO License Authority)
 */
function canonicalJsonStringify(val) {
  if (val === null) return 'null';
  const t = typeof val;
  if (t === 'boolean') return val ? 'true' : 'false';
  if (t === 'number') {
    if (!Number.isFinite(val)) throw new TypeError('Cannot serialize non-finite numbers');
    return JSON.stringify(val);
  }
  if (t === 'string') return JSON.stringify(val);
  if (Array.isArray(val)) {
    return '[' + val.map(item => (item === undefined ? 'null' : canonicalJsonStringify(item))).join(',') + ']';
  }
  if (t === 'object') {
    const keys = Object.keys(val).sort();
    const pairs = [];
    for (const key of keys) {
      const v = val[key];
      if (v !== undefined && typeof v !== 'function' && typeof v !== 'symbol') {
        pairs.push(JSON.stringify(key) + ':' + canonicalJsonStringify(v));
      }
    }
    return '{' + pairs.join(',') + '}';
  }
  throw new TypeError('Unsupported type for canonical JSON');
}

/**
 * Strict hex string to Uint8Array converter
 */
function hexToBytes(hex) {
  const trimmed = hex.trim();
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
    const cleanKey = licenseKey.trim();
    if (!cleanKey.startsWith('ALCO-LIC-v1.')) {
      return { valid: false, reason: 'Invalid license format or prefix' };
    }

    const parts = cleanKey.split('.');
    if (parts.length !== 3) {
      return { valid: false, reason: 'Malformed license structure' };
    }

    const [, b64Payload, signatureHex] = parts;
    if (signatureHex.length !== 128 || !/^[0-9a-fA-F]{128}$/.test(signatureHex)) {
      return { valid: false, reason: 'Invalid signature format' };
    }

    const jsonStr = decodeBase64Url(b64Payload);
    const payload = JSON.parse(jsonStr);

    // 1. Strict Schema Validation (Fail-Closed)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { valid: false, reason: 'Malformed license payload' };
    }
    if (payload.licenseVersion !== '1.0' || !payload.appId || !payload.deviceId || !payload.customerId) {
      return { valid: false, reason: 'Missing mandatory license fields' };
    }
    if (payload.licenseType !== 'lifetime' && payload.licenseType !== 'subscription') {
      return { valid: false, reason: 'Invalid licenseType' };
    }

    // 2. Strict Lifetime vs Subscription
    if (payload.licenseType === 'lifetime') {
      if (payload.expiresAt !== null) {
        return { valid: false, reason: 'Lifetime license must have expiresAt set to null' };
      }
    } else {
      if (!payload.expiresAt || isNaN(Date.parse(payload.expiresAt))) {
        return { valid: false, reason: 'Subscription license must have valid ISO expiresAt date' };
      }
      if (new Date(payload.expiresAt).getTime() < Date.now()) {
        return { valid: false, reason: 'License has expired' };
      }
    }

    // 3. Check App ID
    if (payload.appId.toLowerCase() !== CURRENT_APP_ID.toLowerCase()) {
      return { valid: false, reason: 'License is for a different ALCO application' };
    }

    // 4. Check Device Lock
    if (payload.deviceId.trim().toUpperCase() !== currentDeviceId.trim().toUpperCase()) {
      return { valid: false, reason: 'License is bound to another computer' };
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
      isLifetime: payload.licenseType === 'lifetime'
    };
  } catch (err) {
    return { valid: false, reason: err && err.message ? err.message : 'License verification failed' };
  }
}
`.trim();
