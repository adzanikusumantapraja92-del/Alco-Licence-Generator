/**
 * ALCO (Aladzan Corpora Ecosystem) Licensing Types
 */

export interface AlcoRequestCodePayload {
  version: '1.0';
  appId: string;
  deviceId: string;
  customerId: string;
  customerName?: string;
  requestId: string;
  timestamp: string; // ISO string
  notes?: string;
}

export type AlcoPlan = 'starter' | 'pro' | 'enterprise' | 'custom';
export type AlcoLicenseType = 'lifetime' | 'subscription';

export interface AlcoLicensePayload {
  licenseVersion: string; // e.g. "1.0"
  licenseId: string;      // e.g. "ALCO-LIC-20260907-XXXX"
  appId: string;          // e.g. "alco-content-engine"
  deviceId: string;       // e.g. "ALCO-DEV-XXXX-XXXX-XXXX"
  customerId: string;     // e.g. "CUST-XXXX"
  customerName?: string;  // Customer name/business
  plan: AlcoPlan;
  licenseType: AlcoLicenseType;
  features: string[];     // Array of feature flags
  issuedAt: string;       // ISO 8601 string
  expiresAt: string | null; // ISO 8601 string or null for lifetime
  metadata?: {
    issuedBy?: string;
    appName?: string;
    notes?: string;
  };
}

export interface AlcoLicenseRecord {
  id: string;
  licenseKey: string;
  payload: AlcoLicensePayload;
  signature: string;
  createdAt: string;
  status: 'active' | 'revoked';
}

export interface AlcoAppDefinition {
  id: string; // appId, e.g. "alco-content-engine"
  name: string; // e.g. "ALCO Content Engine"
  description: string;
  category: 'content' | 'creative' | 'motion' | 'marketing' | 'analytics' | 'utility';
  iconName: string;
  availablePlans: AlcoPlan[];
  features: {
    id: string;
    label: string;
    description: string;
    plans: AlcoPlan[];
  }[];
  isSystem?: boolean; // built-in ALCO apps vs custom registered
  createdAt: string;
}

export interface AlcoVerificationResult {
  valid: boolean;
  reason?: string;
  payload?: AlcoLicensePayload;
  checks: {
    signatureValid: boolean;
    appIdMatches: boolean;
    deviceIdMatches: boolean;
    notExpired: boolean;
    versionSupported: boolean;
  };
  details: {
    daysRemaining: number | null; // null if lifetime, negative if expired
    isLifetime: boolean;
    appId: string;
    deviceId: string;
    plan: string;
    features: string[];
    expiresAtFormatted: string;
  };
}

export interface OwnerKeyPair {
  publicKeyHex: string;
  privateKeyHex?: string; // Optional: Only present in transient in-memory state, never in storage
  createdAt: string;
  fingerprint: string;
}

export interface EncryptedOwnerVault {
  version: '2.0-aes-gcm';
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
  iterations: number;
  saltHex: string;
  ivHex: string;
  ciphertextHex: string;
  publicKeyHex: string; // Stored in plaintext for public verification
  fingerprint: string;  // Public key fingerprint
  createdAt: string;
  updatedAt: string;
  vaultHint?: string;
}

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';
