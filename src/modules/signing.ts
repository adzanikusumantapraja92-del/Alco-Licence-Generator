/**
 * ALCO Ed25519 Cryptographic Signing Module
 * 
 * Uses tweetnacl for standard, robust Ed25519 asymmetric digital signatures.
 * - Private Key: strictly held by Owner inside ALCO License Generator (in-memory while unlocked)
 * - Public Key: safely embedded inside client ALCO desktop applications
 * 
 * Hardened Input Parsing:
 * - Strict hex validation (no stripping of invalid chars, reject non-hex)
 * - Strict length checking (64 hex chars for public key, 128 hex chars for signature and secret key)
 * - Strict Base64URL character set validation
 * - Maximum size constraints against oversized input/DoS
 */

import nacl from 'tweetnacl';

export const MAX_LICENSE_KEY_LENGTH = 32768; // 32KB max input
export const ED25519_SIGNATURE_HEX_LENGTH = 128; // 64 bytes = 128 hex chars
export const ED25519_PUBLIC_KEY_HEX_LENGTH = 64;  // 32 bytes = 64 hex chars
export const ED25519_SECRET_KEY_HEX_LENGTH = 128; // 64 bytes = 128 hex chars

/**
 * Strict check for hex string
 */
export function isStrictHex(str: string): boolean {
  return /^[0-9a-fA-F]*$/.test(str);
}

/**
 * Strict check for Base64URL character set
 */
export function isStrictBase64Url(str: string): boolean {
  return /^[A-Za-z0-9_-]*$/.test(str);
}

/**
 * Validates Ed25519 signature hex string (strictly 128 hex characters)
 */
export function isValidSignatureHex(sigHex: string): boolean {
  const trimmed = sigHex.trim();
  return trimmed.length === ED25519_SIGNATURE_HEX_LENGTH && /^[0-9a-fA-F]{128}$/.test(trimmed);
}

/**
 * Validates Ed25519 public key hex string (strictly 64 hex characters)
 */
export function isValidPublicKeyHex(pubHex: string): boolean {
  const trimmed = pubHex.trim();
  return trimmed.length === ED25519_PUBLIC_KEY_HEX_LENGTH && /^[0-9a-fA-F]{64}$/.test(trimmed);
}

/**
 * Validates Ed25519 secret key hex string (strictly 128 hex characters)
 */
export function isValidSecretKeyHex(secretHex: string): boolean {
  const trimmed = secretHex.trim();
  return trimmed.length === ED25519_SECRET_KEY_HEX_LENGTH && /^[0-9a-fA-F]{128}$/.test(trimmed);
}

/**
 * Uint8Array to Hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex string to Uint8Array.
 * STRICT: Does NOT strip invalid characters. Rejects any non-hex or odd-length strings.
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const trimmed = hex.trim();
  if (trimmed.length === 0) {
    return new Uint8Array(0);
  }

  if (trimmed.length % 2 !== 0) {
    throw new Error(`Invalid hex string: length must be even (got ${trimmed.length})`);
  }

  if (!isStrictHex(trimmed)) {
    throw new Error('Invalid hex string: contains non-hexadecimal characters');
  }

  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < trimmed.length; i += 2) {
    bytes[i / 2] = parseInt(trimmed.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * String to Base64Url
 */
export function stringToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Base64Url to String.
 * STRICT: Enforces Base64URL character set and rejects malformed characters.
 */
export function base64UrlToString(base64url: string): string {
  const trimmed = base64url.trim();
  if (!trimmed) {
    return '';
  }

  if (!isStrictBase64Url(trimmed)) {
    throw new Error('Invalid Base64URL encoding: contains characters outside the Base64URL character set');
  }

  let base64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (err: any) {
    throw new Error(`Failed to decode Base64 string: ${err?.message || 'Invalid encoding'}`);
  }
}

/**
 * Generates a new fresh Ed25519 Key Pair
 */
export function generateEd25519KeyPair(): {
  publicKeyHex: string;
  privateKeyHex: string;
  fingerprint: string;
} {
  const keyPair = nacl.sign.keyPair();
  const pubHex = uint8ArrayToHex(keyPair.publicKey);
  const privHex = uint8ArrayToHex(keyPair.secretKey);
  
  // Create short fingerprint (first 8 chars + last 8 chars)
  const fingerprint = `${pubHex.slice(0, 8)}...${pubHex.slice(-8)}`.toUpperCase();

  return {
    publicKeyHex: pubHex,
    privateKeyHex: privHex,
    fingerprint
  };
}

/**
 * Derives public key hex from 128-char secret key hex
 */
export function derivePublicKeyHexFromSecretKey(secretKeyHex: string): {
  publicKeyHex: string;
  fingerprint: string;
} {
  if (!isValidSecretKeyHex(secretKeyHex)) {
    throw new Error(`Invalid secret key format: expected 128 hex chars, got ${secretKeyHex.trim().length}`);
  }

  const secretKeyBytes = hexToUint8Array(secretKeyHex);
  const keyPair = nacl.sign.keyPair.fromSecretKey(secretKeyBytes);
  const pubHex = uint8ArrayToHex(keyPair.publicKey);
  const fingerprint = `${pubHex.slice(0, 8)}...${pubHex.slice(-8)}`.toUpperCase();

  return {
    publicKeyHex: pubHex,
    fingerprint
  };
}

/**
 * Digitally signs a canonical payload string using owner's Ed25519 private key
 */
export function signCanonicalPayload(
  canonicalPayload: string,
  privateKeyHex: string
): string {
  if (!isValidSecretKeyHex(privateKeyHex)) {
    throw new Error('Invalid secret key format: expected 128 hex characters (64 bytes)');
  }

  const messageBytes = new TextEncoder().encode(canonicalPayload);
  const secretKeyBytes = hexToUint8Array(privateKeyHex);

  const signatureBytes = nacl.sign.detached(messageBytes, secretKeyBytes);
  return uint8ArrayToHex(signatureBytes);
}

/**
 * Verifies an Ed25519 signature against a canonical payload using public key.
 * Strictly validates lengths before invoking tweetnacl.
 */
export function verifySignature(
  canonicalPayload: string,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    if (!isValidSignatureHex(signatureHex)) return false;
    if (!isValidPublicKeyHex(publicKeyHex)) return false;

    const messageBytes = new TextEncoder().encode(canonicalPayload);
    const signatureBytes = hexToUint8Array(signatureHex);
    const publicKeyBytes = hexToUint8Array(publicKeyHex);

    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

/**
 * Formats payload + signature into final, portable ALCO License Key
 * Structure: ALCO-LIC-v1.<Base64Url(canonicalPayload)>.<SignatureHex>
 */
export function packageLicenseKey(
  canonicalPayload: string,
  signatureHex: string
): string {
  if (!isValidSignatureHex(signatureHex)) {
    throw new Error('Cannot package license: signature is not a valid 128-char hex string');
  }

  const b64Payload = stringToBase64Url(canonicalPayload);
  return `ALCO-LIC-v1.${b64Payload}.${signatureHex.trim().toLowerCase()}`;
}

/**
 * Unpacks an ALCO License Key into its canonical payload and signature.
 * Enforces size limits and strict structure.
 */
export function unpackLicenseKey(licenseKey: string): {
  success: boolean;
  version?: string;
  canonicalPayload?: string;
  signatureHex?: string;
  error?: string;
} {
  const clean = licenseKey.trim();

  if (clean.length > MAX_LICENSE_KEY_LENGTH) {
    return { success: false, error: `License key exceeds maximum allowed size (${MAX_LICENSE_KEY_LENGTH} characters)` };
  }

  if (!clean.startsWith('ALCO-LIC-v1.')) {
    return { success: false, error: 'Unsupported license format or prefix. Expected "ALCO-LIC-v1..."' };
  }

  const parts = clean.split('.');
  if (parts.length !== 3) {
    return { success: false, error: 'Malformed license structure: expected exactly 3 dot-separated segments' };
  }

  try {
    const [, b64Payload, signatureHex] = parts;

    if (!isValidSignatureHex(signatureHex)) {
      return { success: false, error: 'Invalid signature component: must be 128 hexadecimal characters' };
    }

    const canonicalPayload = base64UrlToString(b64Payload);
    return {
      success: true,
      version: '1.0',
      canonicalPayload,
      signatureHex: signatureHex.trim().toLowerCase()
    };
  } catch (err: any) {
    return { success: false, error: `Failed to unpack license key: ${err?.message || 'Invalid encoding'}` };
  }
}
