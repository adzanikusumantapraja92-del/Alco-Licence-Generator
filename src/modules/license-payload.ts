/**
 * ALCO License Payload Module
 * 
 * Creates, formats, and canonicalizes license payloads.
 * Ensures deterministic JSON representation so Ed25519 signature is strictly repeatable.
 * 
 * Strict Schema Validation:
 * - Fail-closed schema verification
 * - Enforces lifetime (expiresAt === null) vs subscription (expiresAt is valid ISO string)
 * - Validates hardware device ID format
 */

import { AlcoLicensePayload, AlcoPlan, AlcoLicenseType } from './types';
import { canonicalJsonStringify } from './canonical';
import { isValidDeviceId } from './device-fingerprint';

// Re-export canonicalJsonStringify as core standard
export { canonicalJsonStringify };

/**
 * Generates a unique, standardized License ID
 * Example: LIC-ALCO-2026-9B4A-K8L2
 */
export function generateLicenseId(appId: string): string {
  const year = new Date().getFullYear();
  const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const appCode = appId.replace(/^alco-/, '').slice(0, 4).toUpperCase();
  return `LIC-${appCode}-${year}-${rand1}-${rand2}`;
}

export interface BuildLicensePayloadOptions {
  appId: string;
  deviceId: string;
  customerId: string;
  customerName?: string;
  plan: AlcoPlan;
  licenseType: AlcoLicenseType;
  features: string[];
  expiresAt: string | null;
  issuedAt?: string;
  metadata?: {
    issuedBy?: string;
    appName?: string;
    notes?: string;
  };
}

/**
 * Strict schema validation for parsed license payloads.
 * Returns { valid: true, payload } or { valid: false, error }
 * Fail-closed on any malformed or unexpected data.
 */
export function validateLicensePayloadSchema(raw: unknown): {
  valid: boolean;
  payload?: AlcoLicensePayload;
  error?: string;
} {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, error: 'License payload must be a non-null JSON object' };
  }

  const obj = raw as Record<string, unknown>;

  // 1. licenseVersion
  if (typeof obj.licenseVersion !== 'string' || !obj.licenseVersion.trim()) {
    return { valid: false, error: 'Missing or invalid "licenseVersion" (must be non-empty string)' };
  }
  if (obj.licenseVersion !== '1.0') {
    return { valid: false, error: `Unsupported license version "${obj.licenseVersion}" (expected "1.0")` };
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
    return { valid: false, error: `Invalid hardware device ID format: "${obj.deviceId}". Expected format "ALCO-DEV-XXXX-XXXX-XXXX"` };
  }

  // 5. customerId
  if (typeof obj.customerId !== 'string' || !obj.customerId.trim() || obj.customerId.length > 100) {
    return { valid: false, error: 'Missing or invalid "customerId" (must be 1-100 characters)' };
  }

  // 6. plan
  const validPlans: AlcoPlan[] = ['starter', 'pro', 'enterprise', 'custom'];
  if (typeof obj.plan !== 'string' || !validPlans.includes(obj.plan as AlcoPlan)) {
    return { valid: false, error: `Invalid plan "${obj.plan}". Expected one of: ${validPlans.join(', ')}` };
  }

  // 7. features
  if (!Array.isArray(obj.features)) {
    return { valid: false, error: 'Invalid "features" attribute (must be an array of feature flags)' };
  }
  for (let i = 0; i < obj.features.length; i++) {
    if (typeof obj.features[i] !== 'string') {
      return { valid: false, error: `Invalid feature item at index ${i} (must be string)` };
    }
  }

  // 8. licenseType
  if (obj.licenseType !== 'lifetime' && obj.licenseType !== 'subscription') {
    return { valid: false, error: `Invalid licenseType "${obj.licenseType}". Must be either "lifetime" or "subscription"` };
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
  let customerName: string | undefined = undefined;
  if (obj.customerName !== undefined) {
    if (typeof obj.customerName !== 'string') {
      return { valid: false, error: 'Invalid "customerName" (must be string if provided)' };
    }
    customerName = obj.customerName.trim() || undefined;
  }

  // 12. Optional metadata
  let metadata: { issuedBy?: string; appName?: string; notes?: string } | undefined = undefined;
  if (obj.metadata !== undefined) {
    if (typeof obj.metadata !== 'object' || obj.metadata === null || Array.isArray(obj.metadata)) {
      return { valid: false, error: 'Invalid "metadata" (must be an object if provided)' };
    }
    const meta = obj.metadata as Record<string, unknown>;
    metadata = {
      issuedBy: typeof meta.issuedBy === 'string' ? meta.issuedBy : undefined,
      appName: typeof meta.appName === 'string' ? meta.appName : undefined,
      notes: typeof meta.notes === 'string' ? meta.notes : undefined
    };
  }

  const validatedPayload: AlcoLicensePayload = {
    licenseVersion: obj.licenseVersion,
    licenseId: obj.licenseId,
    appId: obj.appId,
    deviceId: obj.deviceId,
    customerId: obj.customerId,
    customerName,
    plan: obj.plan as AlcoPlan,
    licenseType: obj.licenseType as AlcoLicenseType,
    features: obj.features as string[],
    issuedAt: obj.issuedAt,
    expiresAt: obj.expiresAt as (string | null),
    metadata
  };

  return {
    valid: true,
    payload: validatedPayload
  };
}

/**
 * Builds the canonical license payload ready for digital signing
 */
export function createLicensePayload(options: BuildLicensePayloadOptions): {
  payload: AlcoLicensePayload;
  canonicalPayload: string;
} {
  const licenseId = generateLicenseId(options.appId);
  const issuedAt = options.issuedAt || new Date().toISOString();

  // Deduplicate and sort features for consistency
  const sortedFeatures = Array.from(new Set(options.features)).sort();

  const payload: AlcoLicensePayload = {
    licenseVersion: '1.0',
    licenseId,
    appId: options.appId.trim(),
    deviceId: options.deviceId.trim(),
    customerId: options.customerId.trim(),
    customerName: options.customerName?.trim() || undefined,
    plan: options.plan,
    licenseType: options.licenseType,
    features: sortedFeatures,
    issuedAt,
    expiresAt: options.licenseType === 'lifetime' ? null : (options.expiresAt ? new Date(options.expiresAt).toISOString() : null),
    metadata: options.metadata
  };

  // Run self schema check to guarantee correctness before canonicalizing
  const validation = validateLicensePayloadSchema(payload);
  if (!validation.valid) {
    throw new Error(`Failed to create license payload: ${validation.error}`);
  }

  const canonicalPayload = canonicalJsonStringify(payload);

  return {
    payload,
    canonicalPayload
  };
}
