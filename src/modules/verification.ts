/**
 * ALCO License Verification Module
 * 
 * Used by ALCO Customer Applications (or testing simulators) to verify:
 * 1. Digital signature valid against embedded Ed25519 Public Key
 * 2. appId matches this specific application
 * 3. deviceId matches current customer machine
 * 4. License is not expired (handling lifetime vs subscription)
 * 5. License format and version is supported
 */

import { AlcoVerificationResult, AlcoLicensePayload } from './types';
import { unpackLicenseKey, verifySignature } from './signing';
import { canonicalJsonStringify } from './license-payload';

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

  // Step 1: Unpack format
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

  // Step 2: Parse payload
  let payload: AlcoLicensePayload;
  try {
    payload = JSON.parse(unpacked.canonicalPayload);
  } catch {
    return {
      valid: false,
      reason: 'Corrupted license data: failed to parse JSON',
      checks,
      details: defaultDetails
    };
  }

  // Populate basic details
  const isLifetime = payload.licenseType === 'lifetime' || payload.expiresAt === null;
  defaultDetails.appId = payload.appId;
  defaultDetails.deviceId = payload.deviceId;
  defaultDetails.plan = payload.plan;
  defaultDetails.features = payload.features || [];
  defaultDetails.isLifetime = isLifetime;

  // Step 3: Verify Ed25519 digital signature
  // Note: We re-serialize the parsed payload canonically to ensure strict validation
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

  // Step 4: Verify App ID
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

  // Step 5: Verify Device ID
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

  // Step 6: Verify Expiration
  if (isLifetime) {
    checks.notExpired = true;
    defaultDetails.expiresAtFormatted = 'Lifetime (Never Expires)';
    defaultDetails.daysRemaining = null;
  } else {
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
 * Standalone Client Verification Code for ALCO Electron apps
 */
export const CLIENT_VERIFICATION_SNIPPET = `
// ALCO Client SDK - Verification Module
// Install dependency in customer app: npm install tweetnacl
import nacl from 'tweetnacl';

// 1. EMBED OWNER PUBLIC KEY (Safe to distribute inside client app bundle)
export const ALCO_PUBLIC_KEY = 'YOUR_OWNER_PUBLIC_KEY_HEX_HERE';
export const CURRENT_APP_ID = 'alco-content-engine';

export function verifyClientLicense(licenseKey: string, currentDeviceId: string): {
  valid: boolean;
  plan?: string;
  features?: string[];
  expiresAt?: string | null;
  reason?: string;
} {
  try {
    if (!licenseKey.startsWith('ALCO-LIC-v1.')) {
      return { valid: false, reason: 'Invalid license format' };
    }

    const parts = licenseKey.split('.');
    if (parts.length !== 3) return { valid: false, reason: 'Malformed license' };

    const [, b64Payload, signatureHex] = parts;
    
    // Decode base64url payload
    const jsonStr = atob(b64Payload.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);

    // 1. Check App ID
    if (payload.appId !== CURRENT_APP_ID) {
      return { valid: false, reason: 'License is for a different ALCO application' };
    }

    // 2. Check Device Lock
    if (payload.deviceId !== currentDeviceId) {
      return { valid: false, reason: 'License is bound to another computer' };
    }

    // 3. Check Expiration
    if (payload.licenseType !== 'lifetime' && payload.expiresAt) {
      if (new Date(payload.expiresAt).getTime() < Date.now()) {
        return { valid: false, reason: 'License has expired' };
      }
    }

    // 4. Verify Ed25519 Signature
    // Canonicalize keys
    const sortedKeys = Object.keys(payload).sort();
    const pairs = sortedKeys.map(k => JSON.stringify(k) + ':' + JSON.stringify(payload[k]));
    const canonicalStr = '{' + pairs.join(',') + '}';

    const msgBytes = new TextEncoder().encode(canonicalStr);
    const sigBytes = new Uint8Array(signatureHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
    const pubBytes = new Uint8Array(ALCO_PUBLIC_KEY.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

    const isSigValid = nacl.sign.detached.verify(msgBytes, sigBytes, pubBytes);
    if (!isSigValid) {
      return { valid: false, reason: 'Cryptographic signature is invalid or forged' };
    }

    return {
      valid: true,
      plan: payload.plan,
      features: payload.features,
      expiresAt: payload.expiresAt
    };
  } catch (err: any) {
    return { valid: false, reason: err.message };
  }
}
`.trim();
