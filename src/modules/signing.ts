/**
 * ALCO Ed25519 Cryptographic Signing Module
 * 
 * Uses tweetnacl for standard, robust Ed25519 asymmetric digital signatures.
 * - Private Key: strictly held by Owner inside ALCO License Generator
 * - Public Key: safely embedded inside client ALCO desktop applications
 */

import nacl from 'tweetnacl';

/**
 * Uint8Array to Hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hex string to Uint8Array
 */
export function hexToUint8Array(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Invalid hex string length');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
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
 * Base64Url to String
 */
export function base64UrlToString(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
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
 * Digitally signs a canonical payload string using owner's Ed25519 private key
 */
export function signCanonicalPayload(
  canonicalPayload: string,
  privateKeyHex: string
): string {
  const messageBytes = new TextEncoder().encode(canonicalPayload);
  const secretKeyBytes = hexToUint8Array(privateKeyHex);
  
  if (secretKeyBytes.length !== 64) {
    throw new Error(`Invalid secret key length: expected 64 bytes, got ${secretKeyBytes.length}`);
  }

  const signatureBytes = nacl.sign.detached(messageBytes, secretKeyBytes);
  return uint8ArrayToHex(signatureBytes);
}

/**
 * Verifies an Ed25519 signature against a canonical payload using public key
 */
export function verifySignature(
  canonicalPayload: string,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(canonicalPayload);
    const signatureBytes = hexToUint8Array(signatureHex);
    const publicKeyBytes = hexToUint8Array(publicKeyHex);

    if (signatureBytes.length !== 64) return false;
    if (publicKeyBytes.length !== 32) return false;

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
  const b64Payload = stringToBase64Url(canonicalPayload);
  return `ALCO-LIC-v1.${b64Payload}.${signatureHex}`;
}

/**
 * Unpacks an ALCO License Key into its canonical payload and signature
 */
export function unpackLicenseKey(licenseKey: string): {
  success: boolean;
  version?: string;
  canonicalPayload?: string;
  signatureHex?: string;
  error?: string;
} {
  const clean = licenseKey.trim();
  if (!clean.startsWith('ALCO-LIC-v1.')) {
    return { success: false, error: 'Unsupported license format or prefix' };
  }

  const parts = clean.split('.');
  if (parts.length !== 3) {
    return { success: false, error: 'Malformed license structure' };
  }

  try {
    const [, b64Payload, signatureHex] = parts;
    const canonicalPayload = base64UrlToString(b64Payload);
    return {
      success: true,
      version: '1.0',
      canonicalPayload,
      signatureHex
    };
  } catch (err: any) {
    return { success: false, error: `Failed to unpack license key: ${err?.message}` };
  }
}
