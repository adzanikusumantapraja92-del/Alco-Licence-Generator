/**
 * ALCO License Payload Module
 * 
 * Creates, formats, and canonicalizes license payloads.
 * Ensures deterministic JSON representation so Ed25519 signature is strictly repeatable.
 */

import { AlcoLicensePayload, AlcoPlan, AlcoLicenseType } from './types';

/**
 * Deterministically sorts object keys recursively for canonical JSON serialization
 */
export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(item => canonicalJsonStringify(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    return JSON.stringify(key) + ':' + canonicalJsonStringify(obj[key]);
  });
  return '{' + pairs.join(',') + '}';
}

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

  const canonicalPayload = canonicalJsonStringify(payload);

  return {
    payload,
    canonicalPayload
  };
}
