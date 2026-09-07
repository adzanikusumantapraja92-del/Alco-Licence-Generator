/**
 * ALCO Request Code Module
 * 
 * Handles generation and decoding of customer activation request codes.
 * Format: ALCO-REQ-v1.<Base64UrlData>.<Checksum>
 */

import { AlcoRequestCodePayload } from './types';
import { isValidDeviceId } from './device-fingerprint';

/**
 * Simple 16-bit CRC checksum for copy-paste integrity verification
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
 * Safe base64url decoding
 */
function fromBase64Url(base64url: string): string {
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
 * Encodes a customer request into a standardized Request Code string
 */
export function encodeRequestCode(payload: AlcoRequestCodePayload): string {
  const json = JSON.stringify({
    v: payload.version,
    app: payload.appId,
    dev: payload.deviceId,
    cust: payload.customerId,
    name: payload.customerName || '',
    req: payload.requestId,
    ts: payload.timestamp,
    notes: payload.notes || ''
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

  // Check prefix
  if (!trimmed.startsWith('ALCO-REQ-v1.')) {
    // Attempt relaxed parse if owner pasted raw JSON
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed.appId && parsed.deviceId && parsed.customerId) {
          return {
            success: true,
            data: {
              version: '1.0',
              appId: parsed.appId,
              deviceId: parsed.deviceId,
              customerId: parsed.customerId,
              customerName: parsed.customerName || '',
              requestId: parsed.requestId || `REQ-${Date.now().toString(36).toUpperCase()}`,
              timestamp: parsed.timestamp || new Date().toISOString(),
              notes: parsed.notes || ''
            }
          };
        }
      }
    } catch {
      // ignore
    }
    return { 
      success: false, 
      error: 'Invalid format. Expected "ALCO-REQ-v1.<DATA>.<CHECKSUM>"' 
    };
  }

  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { success: false, error: 'Malformed request code structure' };
  }

  const [, b64Data, checksum] = parts;

  // Verify checksum
  const expectedChk = calculateChecksum(b64Data);
  if (checksum.toUpperCase() !== expectedChk.toUpperCase()) {
    return { 
      success: false, 
      error: `Integrity check failed: checksum mismatch (expected ${expectedChk}, got ${checksum})` 
    };
  }

  // Parse JSON data
  try {
    const jsonStr = fromBase64Url(b64Data);
    const parsed = JSON.parse(jsonStr);

    if (!parsed.app || !parsed.dev || !parsed.cust) {
      return { 
        success: false, 
        error: 'Incomplete request code payload (missing appId, deviceId, or customerId)' 
      };
    }

    return {
      success: true,
      data: {
        version: parsed.v || '1.0',
        appId: parsed.app,
        deviceId: parsed.dev,
        customerId: parsed.cust,
        customerName: parsed.name || '',
        requestId: parsed.req || `REQ-${Date.now().toString(36).toUpperCase()}`,
        timestamp: parsed.ts || new Date().toISOString(),
        notes: parsed.notes || ''
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
