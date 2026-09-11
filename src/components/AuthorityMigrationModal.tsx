import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Upload, 
  KeyRound, 
  CheckCircle2, 
  X, 
  Lock, 
  RefreshCw, 
  Database, 
  Users, 
  History, 
  Layers, 
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { authorityClient } from '../modules/authority-client';
import { 
  MigrationProof, 
  MigrationStageResult, 
  RuntimeDiagnostics 
} from '../../electron/types';

interface AuthorityMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMigrationComplete: (diagnostics: RuntimeDiagnostics) => void;
}

type MigrationStep = 'input' | 'inspect' | 'migrating' | 'success';

export const AuthorityMigrationModal: React.FC<AuthorityMigrationModalProps> = ({
  isOpen,
  onClose,
  onMigrationComplete
}) => {
  const [step, setStep] = useState<MigrationStep>('input');
  const [backupJson, setBackupJson] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Staged inspection data
  const [stageResult, setStageResult] = useState<MigrationStageResult | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  // Completed diagnostics
  const [diagnostics, setDiagnostics] = useState<RuntimeDiagnostics | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    authorityClient.cancelAuthorityMigration().catch(() => {});
    setStep('input');
    setBackupJson('');
    setPassword('');
    setFileName(null);
    setError(null);
    setIsLoading(false);
    setStageResult(null);
    setConfirmOverwrite(false);
    setDiagnostics(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('Backup file exceeds maximum allowed size (5MB).');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBackupJson(content || '');
    };
    reader.onerror = () => {
      setError('Failed to read the selected backup file.');
    };
    reader.readAsText(file);
  };

  // Step 1 -> Step 2: Validate Schema and Decrypt to Inspect Before Migration
  const handleInspectBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!backupJson.trim()) {
      setError('Please provide backup JSON content or upload an ALCO backup file.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Please enter the Master Password used to encrypt this backup (min. 8 characters).');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authorityClient.stageAuthorityMigration(backupJson, password);
      if (!result.success || !result.proof) {
        throw new Error(result.error || 'Failed to decrypt and verify backup.');
      }

      setStageResult(result);
      setConfirmOverwrite(false);
      setStep('inspect');
    } catch (err: any) {
      setError(err?.message || 'Failed to inspect authority backup.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> Step 3 -> Step 4: Commit Migration with Double Read-Back Verification
  const handleCommitMigration = async () => {
    if (!stageResult || !stageResult.proof) return;

    if (stageResult.hasExistingVault && !confirmOverwrite) {
      setError('Please confirm that you wish to replace the existing authority on this device.');
      return;
    }

    setError(null);
    setIsLoading(true);
    setStep('migrating');

    try {
      // Delay slightly for visual transition
      await new Promise(r => setTimeout(r, 400));

      const commitResult = await authorityClient.commitAuthorityMigration({
        proof: stageResult.proof,
        overwriteExisting: confirmOverwrite
      });

      if (!commitResult.success || !commitResult.diagnostics) {
        throw new Error(commitResult.error || 'Migration verification failed.');
      }

      setDiagnostics(commitResult.diagnostics);
      setStep('success');
    } catch (err: any) {
      setError(err?.message || 'Migration aborted: verification failure.');
      setStep('inspect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = () => {
    if (diagnostics) {
      onMigrationComplete(diagnostics);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 text-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-950 border border-indigo-400/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Import Existing ALCO Authority</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Ed25519 Parity
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Safe migration with before-and-after cryptographic identity verification.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="Cancel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-mono text-[11px] leading-relaxed">
              <strong className="font-semibold text-red-300 block mb-0.5">Migration Check Failed:</strong>
              {error}
            </div>
          </div>
        )}

        {/* STEP 1: Input Backup & Password */}
        {step === 'input' && (
          <form onSubmit={handleInspectBackup} className="space-y-5">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 flex items-start gap-2.5">
              <KeyRound className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-slate-300">
                <strong className="font-semibold text-indigo-300 block">Strict Identity Preservation Rule:</strong>
                <span>
                  The imported Ed25519 authority fingerprint and public key will be derived directly from the decrypted private key.
                  If the derived identity does not match the backup metadata, migration fails closed immediately.
                </span>
              </div>
            </div>

            {/* File Upload / Paste JSON */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Existing Encrypted Backup (v2.0-encrypted)</span>
                <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-normal text-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{fileName ? `File: ${fileName}` : 'Choose File...'}</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                value={backupJson}
                onChange={(e) => setBackupJson(e.target.value)}
                rows={6}
                placeholder="Paste the contents of your exported ALCO backup JSON here (alcoVaultVersion: '2.0-encrypted')..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Backup Master Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Backup Master Password</span>
                <span className="text-[10px] text-slate-400">Required to decrypt authority vault</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the Master Password for this backup..."
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !backupJson.trim() || !password}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition disabled:opacity-50 shadow-md shadow-indigo-950"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Decrypting & Verifying Key...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify & Inspect Authority</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Inspect Before Migration */}
        {step === 'inspect' && stageResult && (
          <div className="space-y-5">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Pre-migration validation passed. The Ed25519 private key was successfully decrypted and strictly matches the public key and fingerprint.
              </span>
            </div>

            {/* Pre-Migration Authority Metadata */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                <span className="text-xs font-semibold text-slate-300">Authority Metadata to Migrate</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Cryptographically Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">Authority Fingerprint</span>
                  <span className="font-mono text-indigo-300 font-bold text-xs bg-slate-900 px-2 py-1 rounded border border-slate-800 block">
                    {stageResult.backupFingerprint}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 block text-[11px]">Public Key (Ed25519)</span>
                  <span className="font-mono text-slate-300 text-[10px] break-all bg-slate-900 p-1.5 rounded border border-slate-800 block">
                    {stageResult.backupPublicKeyHex}
                  </span>
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-850 text-center">
                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <Users className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">Customers</span>
                  <strong className="text-xs font-mono text-white">{stageResult.customerCount ?? 0}</strong>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <History className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">License History</span>
                  <strong className="text-xs font-mono text-white">{stageResult.historyCount ?? 0}</strong>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                  <Layers className="w-3.5 h-3.5 text-indigo-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">Custom Apps</span>
                  <strong className="text-xs font-mono text-white">{stageResult.customAppsCount ?? 0}</strong>
                </div>
              </div>
            </div>

            {/* Overwrite Warning if Electron already has a vault */}
            {stageResult.hasExistingVault && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-start gap-2 text-xs text-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-amber-300 block">Existing Authority Detected:</strong>
                    This desktop installation already has an active authority (Fingerprint: <span className="font-mono text-amber-100">{stageResult.existingFingerprint || 'Unknown'}</span>).
                    Migrating this backup will overwrite the current authority identity and records.
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={confirmOverwrite}
                    onChange={(e) => setConfirmOverwrite(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>I confirm that I want to replace the current authority on this device with the imported authority.</span>
                </label>
              </div>
            )}

            {/* Commit or Cancel */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
              >
                ← Back to Input
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommitMigration}
                  disabled={isLoading || (stageResult.hasExistingVault && !confirmOverwrite)}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition disabled:opacity-50 shadow-md shadow-emerald-950"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm & Execute Authority Migration</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Executing Migration & Double Verification */}
        {step === 'migrating' && (
          <div className="py-8 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Performing Atomic Authority Migration...</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Writing encrypted vault to local disk, executing read-back verification, and confirming post-migration Ed25519 identity parity.
              </p>
            </div>
          </div>
        )}

        {/* STEP 4: Success & Runtime Diagnostics */}
        {step === 'success' && diagnostics && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Existing ALCO Authority Successfully Migrated!
              </h3>
              <p className="text-xs text-emerald-300 max-w-lg mx-auto">
                100% Cryptographic Parity Confirmed. Pre-migration fingerprint matches post-migration derived fingerprint bit-for-bit.
              </p>
            </div>

            {/* Diagnostics Report */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <span className="text-xs font-semibold text-slate-300 block border-b border-slate-850 pb-2">
                Non-Destructive Runtime Diagnostics
              </span>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">Vault Storage</span>
                  <span className="font-mono text-slate-200">{diagnostics.storageLocation}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Vault Status</span>
                  <span className="font-mono text-emerald-400 font-semibold uppercase">{diagnostics.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Authority Fingerprint</span>
                  <span className="font-mono text-indigo-300 font-semibold">{diagnostics.fingerprint}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Identity Equality</span>
                  <span className="font-mono text-emerald-400 font-semibold">MATCHED (100% Equal)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-850 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Preserved Entities:</span>
                <span className="font-mono text-slate-300">
                  {diagnostics.customersCount} Customers · {diagnostics.historyCount} Records · {diagnostics.customAppsCount} Custom Apps
                </span>
              </div>

              <p className="text-[10px] text-slate-500 pt-1">
                Zero private keys are ever displayed or exposed to the Renderer process.
              </p>
            </div>

            {/* Action Button */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition shadow-md shadow-indigo-950"
              >
                Complete & Open License Generator
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
