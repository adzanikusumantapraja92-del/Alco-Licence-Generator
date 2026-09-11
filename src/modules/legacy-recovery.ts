/**
 * ALCO License Generator - Safe Legacy Browser Authority Recovery
 * 
 * Provides fail-closed validation and atomic recovery routines
 * for migrating unencrypted browser legacy keys (alco_owner_keypair_v1)
 * into v2 AES-256-GCM encrypted vaults with 100% Ed25519 identity parity.
 */

import {
  derivePublicKeyHexFromSecretKey,
  isValidPublicKeyHex,
  isValidSecretKeyHex
} from './signing';

export interface ValidatedLegacyKeyPair {
  publicKeyHex: string;
  privateKeyHex: string;
  fingerprint: string;
}

/**
 * Strictly validates an unencrypted legacy keypair candidate.
 * 
 * Enforces:
 * 1. Object structure presence
 * 2. Strict Ed25519 secret key hex format (128 hex characters)
 * 3. Strict Ed25519 public key hex format (64 hex characters)
 * 4. Cryptographic derivation of public key from secret key
 * 5. Bit-for-bit equality between derived public key and stored public key
 * 6. Bit-for-bit equality between derived fingerprint and stored fingerprint (if present)
 * 
 * Fails closed on any corruption, mismatch, or truncation.
 */
export function validateLegacyKeyPair(candidate: unknown): ValidatedLegacyKeyPair {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Corrupted legacy keypair: payload must be a non-null JSON object.');
  }

  const raw = candidate as Record<string, unknown>;
  const privateKeyHex = typeof raw.privateKeyHex === 'string' ? raw.privateKeyHex.trim() : '';
  const publicKeyHex = typeof raw.publicKeyHex === 'string' ? raw.publicKeyHex.trim() : '';

  if (!isValidSecretKeyHex(privateKeyHex)) {
    throw new Error(`Corrupted legacy keypair: invalid Ed25519 secret key format (expected 128 hex chars, got ${privateKeyHex.length}).`);
  }

  if (!isValidPublicKeyHex(publicKeyHex)) {
    throw new Error(`Corrupted legacy keypair: invalid Ed25519 public key format (expected 64 hex chars, got ${publicKeyHex.length}).`);
  }

  // Derive public key from secret key
  const derived = derivePublicKeyHexFromSecretKey(privateKeyHex);

  if (derived.publicKeyHex.toLowerCase() !== publicKeyHex.toLowerCase()) {
    throw new Error(
      `Corrupted legacy keypair: derived public key (${derived.publicKeyHex}) does not match stored public key (${publicKeyHex}).`
    );
  }

  // Validate fingerprint if candidate contains one
  if (typeof raw.fingerprint === 'string' && raw.fingerprint.trim().length > 0) {
    const storedFingerprint = raw.fingerprint.trim().toUpperCase();
    if (derived.fingerprint.toUpperCase() !== storedFingerprint) {
      throw new Error(
        `Corrupted legacy keypair: derived fingerprint (${derived.fingerprint}) does not match stored fingerprint (${storedFingerprint}).`
      );
    }
  }

  return {
    privateKeyHex: privateKeyHex.toLowerCase(),
    publicKeyHex: derived.publicKeyHex.toLowerCase(),
    fingerprint: derived.fingerprint
  };
}
