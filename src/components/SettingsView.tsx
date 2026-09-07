import React, { useState } from 'react';
import { 
  Settings, 
  KeyRound, 
  ShieldAlert, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  RotateCw, 
  Eye, 
  EyeOff, 
  FileCode, 
  Lock, 
  AlertTriangle, 
  Cpu, 
  Info 
} from 'lucide-react';
import { OwnerKeyPair } from '../modules/types';
import { exportVaultBackup, importVaultBackup, saveOwnerKeyPair } from '../modules/storage';
import { generateEd25519KeyPair } from '../modules/signing';
import { CLIENT_VERIFICATION_SNIPPET } from '../modules/verification';
import { ELECTRON_DEVICE_FINGERPRINT_SNIPPET } from '../modules/device-fingerprint';

interface SettingsViewProps {
  keyPair: OwnerKeyPair;
  onKeyPairUpdated: (newPair: OwnerKeyPair) => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  keyPair,
  onKeyPairUpdated,
  onRefreshData
}) => {
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [importJson, setImportJson] = useState<string>('');
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'verification' | 'fingerprint'>('verification');

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
    downloadAnchor.setAttribute('download', `alco-vault-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRegenerateKeyPair = () => {
    if (confirm('CRITICAL WARNING: Generating a new Ed25519 key pair will invalidate existing client applications unless you update their embedded public key. Are you sure you want to proceed?')) {
      const generated = generateEd25519KeyPair();
      const newPair: OwnerKeyPair = {
        publicKeyHex: generated.publicKeyHex,
        privateKeyHex: generated.privateKeyHex,
        fingerprint: generated.fingerprint,
        createdAt: new Date().toISOString()
      };
      saveOwnerKeyPair(newPair);
      onKeyPairUpdated(newPair);
      alert('New Ed25519 Key Pair successfully generated and stored locally.');
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" />
          <span>Security Vault & Client SDK Integration</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Manage your Ed25519 cryptographic authority keypair and integrate the client verification engine into ALCO Electron applications.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Key Management */}
        <div className="lg:col-span-6 space-y-6">
          {/* KeyPair Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Ed25519 Authority Key Pair
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>

            {/* Public Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span>Public Key (Client Safe)</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-slate-800 text-slate-400">32 bytes</span>
                </label>
                <button
                  onClick={() => handleCopy(keyPair.publicKeyHex, 'pub')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
                >
                  {copiedKey === 'pub' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'pub' ? 'Copied' : 'Copy Hex'}</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={2}
                value={keyPair.publicKeyHex}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 text-xs font-mono break-all focus:outline-none"
              />
              <p className="text-[11px] text-slate-400">
                ✓ <strong>Safe to embed:</strong> Hardcode this public key into customer desktop applications. It only verifies signatures and cannot generate licenses.
              </p>
            </div>

            {/* Private Key */}
            <div className="space-y-1.5 pt-2 border-t border-slate-850">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Private Secret Key (Owner Only)</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-950/60 text-rose-400 border border-rose-900/50">STRICTLY CONFIDENTIAL</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {showPrivateKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showPrivateKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                  <button
                    onClick={() => handleCopy(keyPair.privateKeyHex, 'priv')}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    {copiedKey === 'priv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={2}
                value={showPrivateKey ? keyPair.privateKeyHex : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-rose-950/80 text-rose-300 text-xs font-mono break-all focus:outline-none"
              />

              <div className="p-2.5 rounded bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-300/90 leading-relaxed">
                ⚠️ <strong>NEVER DISTRIBUTE:</strong> Keep this private key safe on your local generator. Do NOT commit this key to public Git repositories or client builds.
              </div>
            </div>

            {/* Key Metadata */}
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950 p-3 rounded-lg border border-slate-850 text-slate-400">
              <div>
                <span className="text-slate-500 block">Fingerprint:</span>
                <span className="text-indigo-300 font-semibold">{keyPair.fingerprint}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Generated On:</span>
                <span>{new Date(keyPair.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Regenerate Action */}
            <div className="pt-2 border-t border-slate-850 flex justify-end">
              <button
                onClick={handleRegenerateKeyPair}
                className="px-3 py-1.5 rounded text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/50 transition flex items-center gap-1.5"
              >
                <RotateCw className="w-3 h-3" />
                <span>Regenerate Key Pair</span>
              </button>
            </div>
          </div>

          {/* Backup & Restore Vault */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Vault Backup & Restore</span>
            </h3>
            <p className="text-xs text-slate-400">
              Export your key pair, registered applications, and issued license history into an encrypted or offline JSON backup file.
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadBackup}
                className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Complete Backup (.json)</span>
              </button>
            </div>

            <div className="pt-3 border-t border-slate-850 space-y-2">
              <label className="text-xs font-medium text-slate-300 block">
                Restore From Backup JSON:
              </label>
              <textarea
                rows={2}
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder="Paste backup JSON content here to restore..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300"
              />
              <button
                onClick={handleImportBackup}
                disabled={!importJson.trim()}
                className="px-3.5 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50 transition"
              >
                Restore Vault
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
        </div>

        {/* Right Column: ALCO Client SDK Code Snippets */}
        <div className="lg:col-span-6 space-y-6">
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
              <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono overflow-x-auto max-h-[480px] leading-relaxed">
                {activeCodeTab === 'verification'
                  ? CLIENT_VERIFICATION_SNIPPET.replace('YOUR_OWNER_PUBLIC_KEY_HEX_HERE', keyPair.publicKeyHex)
                  : ELECTRON_DEVICE_FINGERPRINT_SNIPPET}
              </pre>

              <button
                onClick={() => {
                  const snippet = activeCodeTab === 'verification'
                    ? CLIENT_VERIFICATION_SNIPPET.replace('YOUR_OWNER_PUBLIC_KEY_HEX_HERE', keyPair.publicKeyHex)
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
