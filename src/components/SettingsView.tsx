import React, { useState } from 'react';
import { 
  Settings, 
  KeyRound, 
  ShieldAlert, 
  Copy, 
  Check, 
  Download, 
  RotateCw, 
  FileCode, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Key, 
  ShieldCheck, 
  RefreshCw,
  UploadCloud,
  FileCheck
} from 'lucide-react';
import { OwnerKeyPair, VaultStatus } from '../modules/types';
import { 
  exportVaultBackup, 
  getEncryptedVault, 
  changeVaultMasterPassword, 
  rotateOwnerKeyPair,
  validateBackupFileFormat,
  verifyBackupDecryption,
  commitRestoreBackup,
  AlcoBackupPayload,
  BackupVerificationResult
} from '../modules/storage';
import { CLIENT_VERIFICATION_SNIPPET } from '../modules/verification';
import { ELECTRON_DEVICE_FINGERPRINT_SNIPPET } from '../modules/device-fingerprint';

interface SettingsViewProps {
  keyPair: OwnerKeyPair | null;
  vaultStatus: VaultStatus;
  onLockVault: () => void;
  onRequestUnlock: (onUnlocked: (privateKey: string) => void) => void;
  onRequestSetup: () => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  keyPair,
  vaultStatus,
  onLockVault,
  onRequestUnlock,
  onRequestSetup,
  onRefreshData
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [passwordHint, setPasswordHint] = useState<string>('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Hardened Backup & Restore State Machine
  const [importJson, setImportJson] = useState<string>('');
  const [restoreStep, setRestoreStep] = useState<'idle' | 'password_prompt' | 'authority_warning' | 'success'>('idle');
  const [validatedBackup, setValidatedBackup] = useState<AlcoBackupPayload | null>(null);
  const [restorePassword, setRestorePassword] = useState<string>('');
  const [isVerifyingBackup, setIsVerifyingBackup] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<BackupVerificationResult | null>(null);
  const [authorityAcknowledged, setAuthorityAcknowledged] = useState<boolean>(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
  
  // Rotate Key State
  const [showRotateConfirm, setShowRotateConfirm] = useState<boolean>(false);
  const [rotatePassword, setRotatePassword] = useState<string>('');
  const [rotateStatus, setRotateStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isRotating, setIsRotating] = useState<boolean>(false);

  const [activeCodeTab, setActiveCodeTab] = useState<'verification' | 'fingerprint'>('verification');

  const vault = getEncryptedVault();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadBackup = () => {
    const backupStr = exportVaultBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(backupStr);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `alco-encrypted-vault-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleChangeMasterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeStatus(null);

    if (newPassword.length < 8) {
      setPasswordChangeStatus({ success: false, message: 'New Master Password must be at least 8 characters long.' });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordChangeStatus({ success: false, message: 'New password confirmation does not match.' });
      return;
    }

    setIsChangingPassword(true);

    try {
      await changeVaultMasterPassword(currentPassword, newPassword, passwordHint || undefined);
      setPasswordChangeStatus({ success: true, message: 'Master Password successfully changed. Vault re-encrypted with fresh salt and IV.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordHint('');
      onRefreshData();
    } catch (err: any) {
      setPasswordChangeStatus({ success: false, message: err?.message || 'Failed to change password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Stage 1: Validate Backup Format
  const handleValidateBackup = () => {
    setRestoreError(null);
    setRestoreSuccessMessage(null);
    setVerificationResult(null);

    if (!importJson.trim()) {
      setRestoreError('Please paste backup JSON content first.');
      return;
    }

    const validation = validateBackupFileFormat(importJson);
    if (!validation.valid || !validation.backup) {
      setRestoreError(validation.error || 'Invalid backup structure.');
      return;
    }

    setValidatedBackup(validation.backup);
    setRestoreStep('password_prompt');
  };

  // Stage 2: Decrypt with Backup Master Password & Verify Keypair
  const handleDecryptAndVerifyBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatedBackup) return;

    if (!restorePassword) {
      setRestoreError('Please enter the Master Password for this backup.');
      return;
    }

    setIsVerifyingBackup(true);
    setRestoreError(null);

    try {
      const res = await verifyBackupDecryption(validatedBackup, restorePassword);
      if (!res.success) {
        setRestoreError(res.error || 'Failed to decrypt backup.');
        return;
      }

      setVerificationResult(res);

      if (res.isDifferentAuthority) {
        setRestoreStep('authority_warning');
      } else {
        // Same authority: ready to commit
        handleCommitRestore(validatedBackup);
      }
    } catch (err: any) {
      setRestoreError(err?.message || 'Decryption failed.');
    } finally {
      setIsVerifyingBackup(false);
    }
  };

  // Stage 3: Commit Restore
  const handleCommitRestore = (backupToRestore: AlcoBackupPayload) => {
    setRestoreError(null);
    const res = commitRestoreBackup(backupToRestore);
    if (res.success) {
      setRestoreSuccessMessage(res.message);
      setRestoreStep('success');
      setImportJson('');
      setRestorePassword('');
      setAuthorityAcknowledged(false);
      onLockVault();
      onRefreshData();
    } else {
      setRestoreError(res.message);
    }
  };

  const handleResetRestore = () => {
    setRestoreStep('idle');
    setValidatedBackup(null);
    setRestorePassword('');
    setVerificationResult(null);
    setAuthorityAcknowledged(false);
    setRestoreError(null);
  };

  const handleExecuteKeyRotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRotateStatus(null);
    setIsRotating(true);

    try {
      await rotateOwnerKeyPair(rotatePassword);
      setRotateStatus({ success: true, message: 'Owner Ed25519 Key Pair rotated successfully. Note that previous client builds must be updated with the new public key.' });
      setRotatePassword('');
      setShowRotateConfirm(false);
      onRefreshData();
    } catch (err: any) {
      setRotateStatus({ success: false, message: err?.message || 'Incorrect password for key rotation.' });
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-400" />
            <span>ALCO Authority Security &amp; Settings</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your hardware-bound offline Ed25519 Authority Keypair, AES-256-GCM Vault, and Client SDK.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {vaultStatus === 'unlocked' ? (
            <button
              onClick={onLockVault}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/80 flex items-center gap-2 transition shadow-sm"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span>Lock Vault Now</span>
            </button>
          ) : vaultStatus === 'locked' ? (
            <button
              onClick={() => onRequestUnlock(() => {})}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition shadow-sm"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Vault</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Owner Keypair & Vault Security */}
        <div className="lg:col-span-6 space-y-6">

          {/* Keypair Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Ed25519 Authority Identity
                </h3>
              </div>
              {vaultStatus === 'uninitialized' && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  NOT CONFIGURED
                </span>
              )}
              {vaultStatus === 'locked' && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  LOCKED (AES-256-GCM)
                </span>
              )}
              {vaultStatus === 'unlocked' && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  UNLOCKED IN VOLATILE RAM
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
                <span className="text-slate-400">Local Storage Security:</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  Zero Plaintext Keys in Storage
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
                <span className="text-slate-400">Encryption Standard:</span>
                <span className="text-indigo-300 font-mono">AES-256-GCM (PBKDF2-SHA-256)</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
                <span className="text-slate-400">PBKDF2 Iterations:</span>
                <span className="text-slate-200 font-mono">250,000 passes</span>
              </div>

              {keyPair?.createdAt && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
                  <span className="text-slate-400">Authority Created:</span>
                  <span className="text-slate-300 font-mono">{new Date(keyPair.createdAt).toLocaleDateString()}</span>
                </div>
              )}

              {vault?.vaultHint && (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 text-slate-400">
                  <span className="text-slate-500 block text-[11px]">Vault Password Hint:</span>
                  <span className="text-slate-300 italic">{vault.vaultHint}</span>
                </div>
              )}
            </div>

            {/* Unlock / Lock CTA */}
            <div className="pt-2 border-t border-slate-850 flex gap-2">
              {vaultStatus === 'uninitialized' && (
                <button
                  onClick={onRequestSetup}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Setup Encrypted Owner Vault</span>
                </button>
              )}

              {vaultStatus === 'locked' && (
                <button
                  onClick={() => onRequestUnlock(() => {})}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock with Master Password</span>
                </button>
              )}

              {vaultStatus === 'unlocked' && (
                <button
                  onClick={onLockVault}
                  className="w-full py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-slate-300 flex items-center justify-center gap-1.5 transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Purge Volatile Memory &amp; Lock</span>
                </button>
              )}
            </div>

            {/* Authority Fingerprint */}
            {keyPair && (
              <div className="space-y-1.5 pt-2 border-t border-slate-850">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-400">
                    Public Key Fingerprint:
                  </label>
                  <span className="text-[11px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-850">
                    {keyPair.fingerprint}
                  </span>
                </div>
              </div>
            )}

            {/* Public Key Display (Safe for embedding) */}
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ed25519 Public Key</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 font-mono">32 bytes / 64 hex</span>
                </label>
                {keyPair && (
                  <button
                    onClick={() => handleCopy(keyPair.publicKeyHex, 'pub')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                  >
                    {copiedKey === 'pub' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'pub' ? 'Copied' : 'Copy Public Key'}</span>
                  </button>
                )}
              </div>
              <textarea
                readOnly
                rows={2}
                value={keyPair?.publicKeyHex || ''}
                placeholder="Initialize vault to view public key..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 text-xs font-mono break-all focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                ✓ <strong>Public Key:</strong> Safely embedded into customer ALCO desktop apps. Used strictly for verifying digital signatures.
              </p>
            </div>

            {/* Private Key Status (HARDENED: Zero Private Key Inspection, Zero DOM Exposure) */}
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Private Signing Key Security</span>
              </label>

              {vaultStatus === 'locked' ? (
                <div className="p-3 rounded-lg bg-slate-950 border border-rose-950/80 text-xs text-slate-400 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Private key is currently encrypted in AES-256-GCM storage. Unlock with Master Password to enable license signing.
                  </span>
                </div>
              ) : vaultStatus === 'unlocked' ? (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-xs text-emerald-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Active in Transient Execution Memory</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    The Ed25519 signing key is held strictly in volatile RAM for authorized signing operations. In compliance with ALCO security hardening, private keys are never exposed in the UI, never placed in the DOM, and never stored in plaintext.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500">
                  Vault not initialized. Setup your Master Password to generate keys.
                </div>
              )}
            </div>

            {/* Explicit Key Rotation */}
            <div className="pt-3 border-t border-slate-850">
              {!showRotateConfirm ? (
                <button
                  onClick={() => setShowRotateConfirm(true)}
                  disabled={vaultStatus !== 'unlocked'}
                  className="w-full py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-amber-300 hover:bg-amber-950/20 border border-slate-800 hover:border-amber-800/40 flex items-center justify-center gap-1.5 transition disabled:opacity-40"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Rotate Owner Key Pair...</span>
                </button>
              ) : (
                <form onSubmit={handleExecuteKeyRotation} className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/60 space-y-3">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>Warning: Key Rotation is Irreversible</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Rotating generates a fresh Ed25519 keypair. All customer apps must be updated with the new Public Key to verify newly issued licenses!
                  </p>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Confirm with Master Password:
                    </label>
                    <input
                      type="password"
                      required
                      value={rotatePassword}
                      onChange={(e) => setRotatePassword(e.target.value)}
                      placeholder="Enter Master Password..."
                      className="w-full px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isRotating || !rotatePassword}
                      className="flex-1 py-1.5 rounded text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 transition"
                    >
                      {isRotating ? 'Rotating...' : 'Confirm Key Rotation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRotateConfirm(false)}
                      className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white bg-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {rotateStatus && (
                <div className={`p-2.5 rounded text-xs mt-3 ${
                  rotateStatus.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' : 'bg-rose-950/40 text-rose-300 border border-rose-800'
                }`}>
                  {rotateStatus.message}
                </div>
              )}
            </div>
          </div>

          {/* Change Master Password Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Change Master Password</span>
            </h3>
            <p className="text-xs text-slate-400">
              Re-encrypts the vault with a new Master Password using fresh PBKDF2 salt and AES-GCM IV.
            </p>

            <form onSubmit={handleChangeMasterPassword} className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Current Master Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    New Master Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Optional Password Hint
                </label>
                <input
                  type="text"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  placeholder="e.g. My primary studio master key"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {passwordChangeStatus && (
                <div className={`p-2.5 rounded text-xs ${
                  passwordChangeStatus.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' : 'bg-rose-950/40 text-rose-300 border border-rose-800'
                }`}>
                  {passwordChangeStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPassword || !currentPassword || !newPassword}
                className="w-full py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition"
              >
                {isChangingPassword ? 'Re-encrypting Vault...' : 'Update Master Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Encrypted Vault Backup & ALCO Client SDK Code */}
        <div className="lg:col-span-6 space-y-6">

          {/* Hardened Encrypted Vault Backup & Multi-Stage Restore */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Encrypted Vault Backup &amp; Hardened Restore</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export your entire database (AES-256-GCM encrypted vault, history, apps registry, and preferences). 
              <strong className="text-slate-300 ml-1">Zero plaintext private keys are ever exported</strong>. Restoring requires Master Password verification and keypair identity derivation checks.
            </p>

            <div>
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Encrypted Backup (.json)</span>
              </button>
            </div>

            {/* Hardened Restore Workflow */}
            <div className="pt-3 border-t border-slate-850 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 block">
                  Hardened Backup Restore Pipeline:
                </label>
                {restoreStep !== 'idle' && (
                  <button 
                    onClick={handleResetRestore}
                    className="text-[11px] text-slate-400 hover:text-white"
                  >
                    Cancel / Reset
                  </button>
                )}
              </div>

              {/* Step 1: Input JSON */}
              {restoreStep === 'idle' && (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    placeholder="Paste encrypted backup JSON content here to begin restore pipeline..."
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300"
                  />
                  <button
                    onClick={handleValidateBackup}
                    disabled={!importJson.trim()}
                    className="px-4 py-2 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Verify Backup Structure</span>
                  </button>
                </div>
              )}

              {/* Step 2: Password Prompt & Keypair Derivation Check */}
              {restoreStep === 'password_prompt' && validatedBackup && (
                <form onSubmit={handleDecryptAndVerifyBackup} className="p-3.5 rounded-lg bg-slate-950 border border-indigo-900/60 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                    <Key className="w-4 h-4 text-indigo-400" />
                    <span>Step 2: Enter Master Password for Backup</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900 p-2.5 rounded border border-slate-800">
                    <p>✓ Structure Validated: <span className="text-slate-200">v2.0-encrypted</span></p>
                    <p>✓ Export Date: <span className="text-slate-200">{new Date(validatedBackup.exportDate).toLocaleString()}</span></p>
                    <p>✓ Target Public Key: <span className="font-mono text-indigo-300">{validatedBackup.encryptedVault.fingerprint}</span></p>
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Master Password of this Backup:
                    </label>
                    <input
                      type="password"
                      required
                      value={restorePassword}
                      onChange={(e) => setRestorePassword(e.target.value)}
                      placeholder="Enter backup master password..."
                      className="w-full px-3 py-2 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isVerifyingBackup || !restorePassword}
                      className="flex-1 py-2 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition flex items-center justify-center gap-1.5"
                    >
                      {isVerifyingBackup ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Decrypting &amp; Verifying Keypair...</span>
                        </>
                      ) : (
                        <span>Decrypt &amp; Verify Identity</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetRestore}
                      className="px-3 py-2 rounded text-xs text-slate-400 hover:text-white bg-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Blocking Warning on Authority Identity Mismatch */}
              {restoreStep === 'authority_warning' && verificationResult && validatedBackup && (
                <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-900/80 space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Blocking Warning: Authority Identity Mismatch</span>
                  </div>

                  <p className="text-xs text-rose-200 leading-relaxed font-medium">
                    This backup belongs to a different ALCO License Authority.
                    Restoring it will change the signing identity and existing ALCO applications may reject newly generated licenses!
                  </p>

                  <div className="space-y-1.5 text-[11px] bg-slate-950 p-2.5 rounded border border-rose-950 font-mono">
                    <div className="text-slate-400">Current Active Fingerprint: <span className="text-emerald-400">{verificationResult.activeFingerprint || 'None'}</span></div>
                    <div className="text-slate-400">Backup Authority Fingerprint: <span className="text-amber-400">{verificationResult.backupFingerprint}</span></div>
                    <div className="text-slate-400">Records to restore: <span className="text-slate-200">{verificationResult.recordCount}</span></div>
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={authorityAcknowledged}
                      onChange={(e) => setAuthorityAcknowledged(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-xs text-slate-300 leading-normal">
                      I understand that restoring this backup changes the active signing authority and replaces the existing cryptographic keypair.
                    </span>
                  </label>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={!authorityAcknowledged}
                      onClick={() => handleCommitRestore(validatedBackup)}
                      className="flex-1 py-2 rounded text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 transition shadow"
                    >
                      Confirm Restore &amp; Replace Authority
                    </button>
                    <button
                      type="button"
                      onClick={handleResetRestore}
                      className="px-3 py-2 rounded text-xs text-slate-400 hover:text-white bg-slate-900"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Error Box */}
              {restoreError && (
                <div className="p-3 rounded text-xs bg-rose-950/50 text-rose-300 border border-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{restoreError}</span>
                </div>
              )}

              {/* Success Box */}
              {restoreSuccessMessage && (
                <div className="p-3 rounded text-xs bg-emerald-950/50 text-emerald-300 border border-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{restoreSuccessMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* ALCO Client SDK Code Snippets */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  ALCO Client Electron Integration SDK
                </h3>
              </div>

              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs gap-1">
                <button
                  onClick={() => setActiveCodeTab('verification')}
                  className={`px-2.5 py-1 rounded transition ${activeCodeTab === 'verification' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  License Verifier
                </button>
                <button
                  onClick={() => setActiveCodeTab('fingerprint')}
                  className={`px-2.5 py-1 rounded transition ${activeCodeTab === 'fingerprint' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Device Fingerprint
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              {activeCodeTab === 'verification'
                ? 'Drop this verification module into your ALCO client applications. Notice your Owner Public Key is pre-filled below:'
                : 'Drop this hardware hashing module into your Electron main process to read PC UUIDs reliably:'}
            </p>

            <div className="relative">
              <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-[440px] leading-relaxed">
                {activeCodeTab === 'verification'
                  ? CLIENT_VERIFICATION_SNIPPET.replace('YOUR_OWNER_PUBLIC_KEY_HEX_HERE', keyPair?.publicKeyHex || 'YOUR_OWNER_PUBLIC_KEY_HEX_HERE')
                  : ELECTRON_DEVICE_FINGERPRINT_SNIPPET}
              </pre>

              <button
                onClick={() => {
                  const snippet = activeCodeTab === 'verification'
                    ? CLIENT_VERIFICATION_SNIPPET.replace('YOUR_OWNER_PUBLIC_KEY_HEX_HERE', keyPair?.publicKeyHex || 'YOUR_OWNER_PUBLIC_KEY_HEX_HERE')
                    : ELECTRON_DEVICE_FINGERPRINT_SNIPPET;
                  handleCopy(snippet, 'snippet');
                }}
                className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded text-[11px] font-semibold bg-indigo-600/90 hover:bg-indigo-500 text-white flex items-center gap-1 transition shadow"
              >
                {copiedKey === 'snippet' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'snippet' ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 text-xs text-slate-400 space-y-1">
              <span className="font-semibold text-slate-300 block">Integration Step-by-Step:</span>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
                <li>Install <code className="text-indigo-300 font-mono">tweetnacl</code> in your ALCO client app.</li>
                <li>Embed the Public Key from above in the client verification file.</li>
                <li>Read the hardware device ID via the fingerprint snippet.</li>
                <li>Call <code className="text-indigo-300 font-mono">verifyClientLicense()</code> during app boot.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
