/**
 * ALCO Device Fingerprint Module
 * 
 * In a real ALCO Electron application, device fingerprinting reads hardware markers:
 * - Windows: MachineGUID (`REG QUERY HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid`)
 * - macOS: `ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID`
 * - Linux: `/etc/machine-id` or `/var/lib/dbus/machine-id`
 * - CPU ID, Motherboard Serial, Primary Network MAC Address
 * 
 * These markers are hashed via SHA-256 and formatted as `ALCO-DEV-XXXX-XXXX-XXXX`.
 */

export function formatDeviceId(hashOrRaw: string): string {
  // Extract alphanumeric characters only
  const clean = hashOrRaw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length < 12) {
    const padded = clean.padEnd(12, '0');
    return `ALCO-DEV-${padded.slice(0, 4)}-${padded.slice(4, 8)}-${padded.slice(8, 12)}`;
  }
  return `ALCO-DEV-${clean.slice(0, 4)}-${clean.slice(4, 8)}-${clean.slice(8, 12)}`;
}

export function isValidDeviceId(deviceId: string): boolean {
  return /^ALCO-DEV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(deviceId.trim());
}

/**
 * Generates a realistic mock device ID for demonstration & testing
 */
export function generateMockDeviceId(seed?: string): string {
  if (seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(12, 'F');
    return formatDeviceId(hex);
  }

  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return formatDeviceId(hex);
}

/**
 * Reference implementation for ALCO Electron applications
 */
export const ELECTRON_DEVICE_FINGERPRINT_SNIPPET = `
// ALCO Electron Client Hardware Fingerprint Snippet
// Place in your Electron main process (preload or main.ts):
import crypto from 'crypto';
import os from 'os';
import { execSync } from 'child_process';

export function getHardwareFingerprint(): string {
  let hardwareId = '';
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      const reg = execSync('REG QUERY HKEY_LOCAL_MACHINE\\\\SOFTWARE\\\\Microsoft\\\\Cryptography /v MachineGuid').toString();
      const match = reg.match(/MachineGuid\\s+REG_SZ\\s+(.+)/i);
      hardwareId = match ? match[1].trim() : os.hostname();
    } else if (platform === 'darwin') {
      const ioreg = execSync('ioreg -rd1 -c IOPlatformExpertDevice').toString();
      const match = ioreg.match(/"IOPlatformUUID"\\s*=\\s*"([^"]+)"/i);
      hardwareId = match ? match[1].trim() : os.hostname();
    } else {
      hardwareId = execSync('cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id').toString().trim();
    }
  } catch {
    hardwareId = \`\${os.hostname()}-\${os.arch()}-\${os.cpus()[0]?.model || 'cpu'}\`;
  }

  const hash = crypto.createHash('sha256').update(\`ALCO-HW:\${hardwareId}:\${os.arch()}\`).digest('hex').toUpperCase();
  return \`ALCO-DEV-\${hash.slice(0, 4)}-\${hash.slice(4, 8)}-\${hash.slice(8, 12)}\`;
}
`.trim();
