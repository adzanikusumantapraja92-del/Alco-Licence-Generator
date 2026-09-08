/**
 * ALCO Encrypted Owner Vault Cryptography
 * 
 * Hardware-grade, offline-first AES-256-GCM encryption with PBKDF2-SHA-256 key derivation.
 * - Key Derivation: PBKDF2 with SHA-256, 250,000 iterations, 16-byte random salt
 * - Encryption: AES-256-GCM with 12-byte random IV
 * - Zero plaintext private keys in storage
 * - Zero network transmissions
 */

import { uint8ArrayToHex, hexToUint8Array } from './signing';

export const PBKDF2_ITERATIONS = 250000;
export const SALT_BYTE_LENGTH = 16;
export const IV_BYTE_LENGTH = 12;

export interface EncryptedVaultData {
  ciphertextHex: string;
  saltHex: string;
  ivHex: string;
  iterations: number;
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA-256';
}

function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto as any;
  }
  throw new Error('Web Cryptography API is not available in this environment');
}

/**
 * Derives a 256-bit AES-GCM CryptoKey from master password and salt using PBKDF2
 */
async function deriveAesKey(password: string, saltBytes: Uint8Array, iterations: number = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const cryptoApi = getCrypto();
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);

  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    passwordBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoApi.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string (e.g. privateKeyHex or payload JSON) with a Master Password
 */
export async function encryptWithPassword(
  plaintext: string, 
  masterPassword: string
): Promise<EncryptedVaultData> {
  const cryptoApi = getCrypto();
  const saltBytes = cryptoApi.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const ivBytes = cryptoApi.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));

  const aesKey = await deriveAesKey(masterPassword, saltBytes, PBKDF2_ITERATIONS);

  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(plaintext);

  const encryptedBuffer = await cryptoApi.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes
    },
    aesKey,
    plaintextBytes
  );

  const ciphertextBytes = new Uint8Array(encryptedBuffer);

  return {
    ciphertextHex: uint8ArrayToHex(ciphertextBytes),
    saltHex: uint8ArrayToHex(saltBytes),
    ivHex: uint8ArrayToHex(ivBytes),
    iterations: PBKDF2_ITERATIONS,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA-256'
  };
}

/**
 * Decrypts encrypted vault data using the Master Password.
 * Throws error if password is wrong or ciphertext is tampered.
 */
export async function decryptWithPassword(
  encryptedData: {
    ciphertextHex: string;
    saltHex: string;
    ivHex: string;
    iterations?: number;
  },
  masterPassword: string
): Promise<string> {
  const cryptoApi = getCrypto();
  const saltBytes = hexToUint8Array(encryptedData.saltHex);
  const ivBytes = hexToUint8Array(encryptedData.ivHex);
  const ciphertextBytes = hexToUint8Array(encryptedData.ciphertextHex);
  const iterations = encryptedData.iterations || PBKDF2_ITERATIONS;

  const aesKey = await deriveAesKey(masterPassword, saltBytes, iterations);

  try {
    const decryptedBuffer = await cryptoApi.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBytes
      },
      aesKey,
      ciphertextBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error('Incorrect Master Password or corrupted vault payload.');
  }
}
