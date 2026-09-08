/**
 * ALCO Request Code Module
 * 
 * Handles generation and decoding of customer activation request codes.
 * Format: ALCO-REQ-v1.<Base64UrlData>.<Checksum>
 * 
 * Cryptographic & Integrity Note:
 * The 16-bit CRC checksum in this Request Code is strictly an integrity check
 * to detect accidental copy-paste errors or network transmission corruption.
 * It is NOT a cryptographic authentication or signature (no HMAC/secret key is used).
 * Cryptographic authenticity and authorization are established exclusively when
 * the Owner signs the resulting License Key using the Ed25519 Authority Private Key.
 */

import { AlcoRequestCodePayload } from './types';
import { isValidDeviceId } from './device-fingerprint';
import { isStrictBase64Url } from './signing';

export const MAX_REQUEST_CODE_LENGTH = 16384; // 16KB max input to prevent DoS

/**
 * 16-bit CRC checksum for transmission / copy-paste corruption detection.
 * NOTE: Detects corruption only, NOT cryptographic authentication.
 */
function calculateChecksum(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i);
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc = crc >> 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Safe base64url encoding
 */
function toBase64Url(str: string): string {
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
 * Safe base64url decoding with strict character set validation
 */
function fromBase64Url(base64url: string): string {
  const trimmed = base64url.trim();
  if (!isStrictBase64Url(trimmed)) {
    throw new Error('Base64URL contains illegal characters');
  }

  let base64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
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
 * Encodes a customer request into a standardized Request Code string
 */
export function encodeRequestCode(payload: AlcoRequestCodePayload): string {
  if (!isValidDeviceId(payload.deviceId)) {
    throw new Error(`Cannot encode Request Code: invalid hardware device ID format "${payload.deviceId}"`);
  }

  const isV2 = payload.version === '2.0';
  if (isV2) {
    if (!payload.customerName?.trim()) throw new Error('Cannot encode Request Code: customer name is required');
    if (!payload.customerEmail?.trim()) throw new Error('Cannot encode Request Code: customer email is required');
  } else if (!payload.customerId?.trim()) {
    throw new Error('Cannot encode Request Code: customerId is required for v1');
  }

  const json = JSON.stringify({
    v: payload.version,
    app: payload.appId.trim(),
    dev: payload.deviceId.trim(),
    ...(isV2 ? { email: payload.customerEmail!.trim() } : { cust: payload.customerId!.trim() }),
    name: payload.customerName?.trim() || '',
    req: payload.requestId.trim(),
    ts: payload.timestamp,
    notes: payload.notes?.trim() || ''
  });

  const b64 = toBase64Url(json);
  const chk = calculateChecksum(b64);
  return `ALCO-REQ-v1.${b64}.${chk}`;
}

export interface RequestDecodeResult {
  success: boolean;
  data?: AlcoRequestCodePayload;
  error?: string;
}

/**
 * Decodes and validates an incoming Request Code
 */
export function decodeRequestCode(rawInput: string): RequestDecodeResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { success: false, error: 'Request code cannot be empty' };
  }

  if (trimmed.length > MAX_REQUEST_CODE_LENGTH) {
    return { 
      success: false, 
      error: `Request code exceeds maximum size limit of ${MAX_REQUEST_CODE_LENGTH} characters` 
    };
  }

  // Check prefix
  if (!trimmed.startsWith('ALCO-REQ-v1.') && !trimmed.startsWith('ALCO-REQ-v2.')) {
    // Attempt relaxed parse if owner pasted raw JSON for convenience
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.appId && parsed.deviceId && parsed.customerId) {
          if (!isValidDeviceId(parsed.deviceId)) {
            return {
              success: false,
              error: `Invalid hardware device ID format "${parsed.deviceId}". Expected format "ALCO-DEV-XXXX-XXXX-XXXX"`
            };
          }
          return {
            success: true,
            data: {
              version: '1.0',
              appId: String(parsed.appId).trim(),
              deviceId: String(parsed.deviceId).trim(),
              customerId: String(parsed.customerId).trim(),
              customerName: parsed.customerName ? String(parsed.customerName).trim() : '',
              requestId: parsed.requestId ? String(parsed.requestId).trim() : `REQ-${Date.now().toString(36).toUpperCase()}`,
              timestamp: parsed.timestamp ? String(parsed.timestamp).trim() : new Date().toISOString(),
              notes: parsed.notes ? String(parsed.notes).trim() : ''
            }
          };
        }
      }
    } catch {
      // ignore JSON parse fallback error
    }
    return {
      success: false, 
      error: 'Invalid format. Expected "ALCO-REQ-v1.<DATA>.<CHECKSUM>" or "ALCO-REQ-v2.<DATA>.<CHECKSUM>"'
    };
  }

  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { success: false, error: 'Malformed request code structure: expected exactly 3 dot-separated segments' };
  }

  const [prefix, b64Data, checksum] = parts;
  const requestVersion = prefix === 'ALCO-REQ-v2' ? '2.0' : '1.0';

  // Verify transmission corruption checksum
  const expectedChk = calculateChecksum(b64Data);
  if (checksum.toUpperCase() !== expectedChk.toUpperCase()) {
    return { 
      success: false, 
      error: `Data corruption detected: checksum mismatch (expected ${expectedChk}, got ${checksum}). The request code may have been truncated or altered during copy-paste.` 
    };
  }

  // Parse JSON data
  try {
    const jsonStr = fromBase64Url(b64Data);
    const parsed = JSON.parse(jsonStr);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Malformed request data: decoded payload is not a JSON object' };
    }

    if (!parsed.app || !parsed.dev || (requestVersion === '1.0' && !parsed.cust) || (requestVersion === '2.0' && (!parsed.name || !parsed.email))) {
      return { 
        success: false, 
        error: requestVersion === '2.0'
          ? 'Incomplete request code payload: missing required fields (appId, deviceId, name, or email)'
          : 'Incomplete request code payload: missing required fields (appId, deviceId, or customerId)'
      };
    }

    // Strict Device ID Validation
    const devId = String(parsed.dev).trim();
    if (!isValidDeviceId(devId)) {
      return {
        success: false,
        error: `Invalid hardware device ID format in request code: "${devId}". Expected "ALCO-DEV-XXXX-XXXX-XXXX"`
      };
    }

    return {
      success: true,
      data: {
        version: requestVersion,
        appId: String(parsed.app).trim(),
        deviceId: devId,
        customerId: parsed.cust ? String(parsed.cust).trim() : undefined,
        customerName: parsed.name ? String(parsed.name).trim() : '',
        customerEmail: parsed.email ? String(parsed.email).trim() : undefined,
        requestId: parsed.req ? String(parsed.req).trim() : `REQ-${Date.now().toString(36).toUpperCase()}`,
        timestamp: parsed.ts ? String(parsed.ts).trim() : new Date().toISOString(),
        notes: parsed.notes ? String(parsed.notes).trim() : ''
      }
    };
  } catch (err: any) {
    return { 
      success: false, 
      error: `Failed to decode request data: ${err?.message || 'Invalid base64 payload'}` 
    };
  }
}

/**
 * Helper to generate a sample mock Request Code for testing
 */
export function generateSampleRequestCode(appId: string = 'alco-content-engine'): string {
  const mockPayload: AlcoRequestCodePayload = {
    version: '1.0',
    appId,
    deviceId: 'ALCO-DEV-9B4A-71E2-5D88',
    customerId: 'CUST-ALCO-4029',
    customerName: 'Ahmad Fauzi (Studio Kreasi)',
    requestId: `REQ-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    notes: 'Requested via WhatsApp - ALCO Content Engine Pro'
  };
  return encodeRequestCode(mockPayload);
}
