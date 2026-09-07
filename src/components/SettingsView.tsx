import React, { useState } from 'react';
import { 
  Settings, 
  KeyRound, 
  ShieldAlert, 
  Copy, 
  Check, 
  Download, 
  RotateCw, 
  Eye, 
  EyeOff, 
  FileCode, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  Cpu, 
  Key, 
  ShieldCheck, 
  RefreshCw 
} from 'lucide-react';
import { OwnerKeyPair, VaultStatus, EncryptedOwnerVault } from '../modules/types';
import { 
  exportVaultBackup, 
  importVaultBackup, 
  getEncryptedVault, 
  changeVaultMasterPassword, 
  rotateOwnerKeyPair 
} from '../modules/storage';
import { CLIENT_VERIFICATION_SNIPPET } from '../modules/verification';
import { ELECTRON_DEVICE_FINGERPRINT_SNIPPET } from '../modules/device-fingerprint';

interface SettingsViewProps {
  keyPair: OwnerKeyPair | null;
  vaultStatus: VaultStatus;
  inMemoryPrivateKey: string | null;
  onLockVault: () => void;
  onRequestUnlock: (onUnlocked: (privateKey: string) => void) => void;
  onRequestSetup: () => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  keyPair,
  vaultStatus,
  inMemoryPrivateKey,
  onLockVault,
  onRequestUnlock,
  onRequestSetup,
  onRefreshData
}) => {
  const [showTransientPrivateKey, setShowTransientPrivateKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [passwordHint, setPasswordHint] = useState<string>('');
  const [passwordChangeStatus, setPasswordChangeStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Backup & Restore State
  const [importJson, setImportJson] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  
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

  const handleImportBackup = () => {
    if (!importJson.trim()) return;
    const res = importVaultBackup(importJson);
    setImportStatus(res);
    if (res.success) {
      onRefreshData();
      setImportJson('');
    }
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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Security Vault & Client SDK Integration</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Cryptographic authority key protection, AES-256-GCM vault lifecycle, and ALCO client Electron integration.
        </p>
      </div>

      {/* Mandatory Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px] block">
            Peringatan Keamanan Kritis Otoritas ALCO
          </span>
          <p className="leading-relaxed text-slate-200 font-medium text-xs">
            "Jika private key dan backup hilang, lisensi baru tidak dapat ditandatangani menggunakan identitas ALCO lama."
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Vault Status, Key Details, Password Management */}
        <div className="lg:col-span-6 space-y-6">

          {/* Vault Security Status Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Owner Vault Status
                </h3>
              </div>
              
              {vaultStatus === 'uninitialized' && (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  NOT INITIALIZED
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
                  UNLOCKED IN MEMORY
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-850">
                <span className="text-slate-400">Local Storage Security:</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  No Plaintext Private Key Stored
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
                  <span>Unlock Vault with Master Password</span>
                </button>
              )}

              {vaultStatus === 'unlocked' && (
                <button
                  onClick={onLockVault}
                  className="w-full py-2.5 rounded-lg text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-900/50 flex items-center justify-center gap-1.5 transition"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Vault (Purge Decrypted Key From Memory)</span>
                </button>
              )}
            </div>
          </div>

          {/* Cryptographic Key Pair Inspection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Ed25519 Authority Key
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {keyPair?.fingerprint || 'NOT READY'}
              </span>
            </div>

            {/* Public Key (Safe to embed) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>Public Key (Client Safe)</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400 font-mono">32 bytes</span>
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
                ✓ <strong>Public Key:</strong> Safely embedded into customer ALCO desktop apps. Used strictly for verifying signatures.
              </p>
            </div>

            {/* Private Key Status */}
            <div className="space-y-2 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Private Signing Key Status</span>
                </label>
                {inMemoryPrivateKey && (
                  <button
                    onClick={() => setShowTransientPrivateKey(!showTransientPrivateKey)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showTransientPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showTransientPrivateKey ? 'Hide' : 'Inspect in Memory'}</span>
                  </button>
                )}
              </div>

              {vaultStatus === 'locked' ? (
                <div className="p-3 rounded-lg bg-slate-950 border border-rose-950/80 text-xs text-slate-400 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    Private key is currently encrypted in AES-256-GCM storage. Unlock with Master Password to access in volatile memory.
                  </span>
                </div>
              ) : inMemoryPrivateKey ? (
                <div className="space-y-1.5">
                  <textarea
                    readOnly
                    rows={2}
                    value={showTransientPrivateKey ? inMemoryPrivateKey : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    className="w-full p-2.5 rounded-lg bg-slate-950 border border-rose-950/80 text-rose-300 text-xs font-mono break-all focus:outline-none"
                  />
                  <div className="p-2.5 rounded bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-300/90 leading-relaxed">
                    ⚠️ <strong>TRANSIENT IN-MEMORY ONLY:</strong> This key is only held in volatile session memory while unlocked. It is never logged and never saved plaintext to browser storage.
                  </div>
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
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Need to rotate authority keys?</span>
                  <button
                    onClick={() => setShowRotateConfirm(true)}
                    className="px-3 py-1.5 rounded text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition flex items-center gap-1.5"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Rotate Key Pair</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleExecuteKeyRotation} className="space-y-3 p-3 rounded-lg bg-rose-950/20 border border-rose-900/40">
                  <div className="text-xs text-rose-300 font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>High Risk Operation: Rotate Authority Key Pair</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    This will permanently replace your Ed25519 identity. Licenses signed with the new key will NOT be recognized by existing client apps unless their embedded public key is updated.
                  </p>
                  <div>
                    <label className="text-[11px] text-slate-300 block mb-1">
                      Enter Current Master Password to Confirm:
                    </label>
                    <input
                      type="password"
                      required
                      value={rotatePassword}
                      onChange={(e) => setRotatePassword(e.target.value)}
                      placeholder="Master Password..."
                      className="w-full px-3 py-1.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>

                  {rotateStatus && (
                    <div className={`p-2 rounded text-xs ${rotateStatus.success ? 'bg-emerald-950/40 text-emerald-300' : 'bg-rose-950/40 text-rose-300'}`}>
                      {rotateStatus.message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRotateConfirm(false)}
                      className="px-3 py-1 rounded text-xs text-slate-400 hover:text-white bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isRotating || !rotatePassword}
                      className="px-3 py-1 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
                    >
                      {isRotating ? 'Rotating...' : 'Confirm Key Rotation'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Change Master Password Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Change Master Password</span>
            </h3>
            <p className="text-xs text-slate-400">
              Re-encrypts the private key with a new Master Password, generating fresh cryptographic salt and IV.
            </p>

            <form onSubmit={handleChangeMasterPassword} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Current Master Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">
                    New Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                    placeholder="Confirm new password..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  New Password Hint (Optional)
                </label>
                <input
                  type="text"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  placeholder="e.g. Work phrase and favorite year"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition shadow"
              >
                {isChangingPassword ? 'Re-encrypting Vault...' : 'Update Master Password'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Encrypted Vault Backup & ALCO Client SDK Code */}
        <div className="lg:col-span-6 space-y-6">

          {/* Encrypted Vault Backup & Restore */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Encrypted Vault Backup & Restore</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export your entire database (AES-256-GCM encrypted vault, history, apps registry, and preferences). 
              <strong className="text-slate-300 ml-1">The backup contains zero plaintext private keys</strong> and requires your Master Password to decrypt.
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

            <div className="pt-3 border-t border-slate-850 space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Restore Encrypted Backup JSON:
              </label>
              <textarea
                rows={3}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste encrypted backup JSON content here to restore..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300"
              />
              <button
                onClick={handleImportBackup}
                disabled={!importJson.trim()}
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition"
              >
                Restore Encrypted Vault
              </button>

              {importStatus && (
                <div className={`p-2.5 rounded text-xs mt-2 ${
                  importStatus.success ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800' : 'bg-rose-950/40 text-rose-300 border border-rose-800'
                }`}>
                  {importStatus.message}
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
