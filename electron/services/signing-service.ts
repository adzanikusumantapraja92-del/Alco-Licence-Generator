/**
 * ALCO License Generator - Main Process Signing Authority Service
 * 
 * Executes cryptographic license generation exclusively in the Main Process.
 * Receives parameters -> Canonicalizes -> Signs with Main-owned Ed25519 key -> Returns packaged key.
 */

import { 
  signCanonicalPayload, 
  packageLicenseKey 
} from '../../src/modules/signing';
import { createLicensePayload } from '../../src/modules/license-payload';
import { AlcoLicenseRecord } from '../../src/modules/types';
import { MainVaultService } from './vault-service';
import { ElectronFileStorageService } from './storage-service';
import { GenerateLicenseInput, GenerateLicenseResult } from '../types';

export class MainSigningService {
  private readonly vaultService: MainVaultService;
  private readonly storage: ElectronFileStorageService;

  constructor(vaultService: MainVaultService, storage: ElectronFileStorageService) {
    this.vaultService = vaultService;
    this.storage = storage;
  }

  async generateLicense(input: GenerateLicenseInput): Promise<GenerateLicenseResult> {
    try {
      if (!this.vaultService.isUnlocked()) {
        return {
          success: false,
          error: 'Authority Vault is locked. Master Password unlock required.'
        };
      }

      if (!input.appId || !input.deviceId || !input.customerId) {
        return {
          success: false,
          error: 'Missing required parameters: appId, deviceId, customerId.'
        };
      }

      // Retrieve internal private key (guaranteed to be strictly in Main Process memory)
      const privateKeyHex = this.vaultService.getActivePrivateKeyForSigning();

      // Canonical payload assembly
      const { payload, canonicalPayload } = createLicensePayload({
        appId: input.appId,
        deviceId: input.deviceId,
        customerId: input.customerId,
        customerName: input.customerName?.trim() || undefined,
        plan: input.plan,
        licenseType: input.licenseType,
        features: input.features || [],
        expiresAt: input.licenseType === 'lifetime' ? null : input.expiresAt,
        metadata: input.metadata
      });

      // Pure Ed25519 asymmetric signature using Main-owned key
      const signatureHex = signCanonicalPayload(canonicalPayload, privateKeyHex);
      const licenseKey = packageLicenseKey(canonicalPayload, signatureHex);

      const record: AlcoLicenseRecord = {
        id: payload.licenseId,
        licenseKey,
        payload,
        signature: signatureHex,
        createdAt: payload.issuedAt,
        status: 'active'
      };

      // Check auto-save preference
      const settings = await this.storage.getOwnerSettings();
      if (settings.autoSaveHistory) {
        await this.storage.appendLicenseRecord(record);
      }

      return {
        success: true,
        licenseKey,
        payload,
        signature: signatureHex,
        canonicalString: canonicalPayload
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to sign license payload.'
      };
    }
  }
}
