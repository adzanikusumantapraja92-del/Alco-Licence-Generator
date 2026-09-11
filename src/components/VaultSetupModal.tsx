import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  KeyRound, 
  AlertTriangle, 
  Eye, 
  EyeOff, 
  Download, 
  PlusCircle, 
  ArrowRight, 
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Fingerprint
} from 'lucide-react';
import { authorityClient } from '../modules/authority-client';
import { AuthorityFirstRunState, LegacyAuthorityInfo } from '../../electron/types';
import { VaultStatus } from '../modules/types';

interface VaultSetupModalProps {
  isOpen: boolean;
  onSetupComplete: (meta: { publicKeyHex: string; fingerprint: string; status?: VaultStatus }) => void;
  onOpenMigration?: () => void;
  firstRunState?: AuthorityFirstRunState;
  legacyAuthority?: LegacyAuthorityInfo;
}

export const VaultSetupModal: React.FC<VaultSetupModalProps> = ({
  isOpen,
  onSetupComplete,
  onOpenMigration,
  firstRunState: initialFirstRunState,
  legacyAuthority: initialLegacyAuthority
}) => {
  const [viewMode, setViewMode] = useState<'choice' | 'create' | 'recover'>('choice');
  const [firstRunState, setFirstRunState] = useState<AuthorityFirstRunState>(initialFirstRunState || 'no_authority');
  const [legacyAuthority, setLegacyAuthority] = useState<LegacyAuthorityInfo | undefined>(initialLegacyAuthority);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync latest authority status whenever modal opens
  useEffect(() => {
    if (isOpen) {
      authorityClient.getVaultStatus().then((res) => {
        if (res.firstRunState) {
          setFirstRunState(res.firstRunState);
        }
        if (res.legacyAuthority) {
          setLegacyAuthority(res.legacyAuthority);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isLegacyDetected = firstRunState === 'legacy_authority_detected' && !!legacyAuthority;

  const handleCreateSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Master Password must be at least 8 characters long for adequate PBKDF2 entropy.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(r => setTimeout(r, 80));

      const res = await authorityClient.setupVault({
        masterPassword: password,
        vaultHint: hint,
        forceNewAuthority: true
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to initialize encrypted vault.');
      }

      onSetupComplete({
        publicKeyHex: res.publicKeyHex,
        fingerprint: res.fingerprint,
        status: res.status
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize encrypted vault.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Master Password must be at least 8 characters long for adequate PBKDF2 entropy.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);

    try {
      await new Promise(r => setTimeout(r, 80));

      const recoveryFn = authorityClient.recoverLegacyAuthority 
        ? authorityClient.recoverLegacyAuthority.bind(authorityClient)
        : authorityClient.setupVault.bind(authorityClient);

      const res = await recoveryFn({
        masterPassword: password,
        vaultHint: hint
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to recover legacy authority.');
      }

      // Successful recovery completes and vault is locked
      onSetupComplete({
        publicKeyHex: res.publicKeyHex,
        fingerprint: res.fingerprint,
        status: 'locked'
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to recover legacy authority.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 text-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* VIEW 1: CHOICE SCREEN (First Run UX) */}
        {viewMode === 'choice' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-950 border border-indigo-400/30">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>ALCO Licensing Authority Setup</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Select how you want to configure your cryptographic authority.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* PRIMARY CHOICE */}
              {isLegacyDetected ? (
                /* OPTION 1 FOR LEGACY DETECTED: RECOVER EXISTING BROWSER AUTHORITY */
                <div className="p-4 rounded-xl bg-emerald-950/40 border-2 border-emerald-500/50 hover:border-emerald-400 transition space-y-3 relative overflow-hidden group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">Recover Existing Browser Authority</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            RECOMMENDED
                          </span>
                        </div>
                        <span className="text-[11px] text-emerald-200 block mt-0.5">
                          Preserve your existing ALCO signing identity and secure it with a Master Password.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Fingerprint & Public Key Preview (No private key exposed!) */}
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                        <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                        Existing Fingerprint:
                      </span>
                      <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                        {legacyAuthority.fingerprint}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Public Key Preview:</span>
                      <span className="font-mono text-slate-300 text-[11px]">
                        {legacyAuthority.publicKeyHex.slice(0, 16)}...{legacyAuthority.publicKeyHex.slice(-16)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Preserves exact Ed25519 identity parity so all client applications currently trusting your authority remain valid. Upgrades your private key into an encrypted AES-256-GCM vault with PBKDF2-SHA-256 key stretching.
                  </p>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setViewMode('recover')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition shadow-md shadow-emerald-950"
                    >
                      <span>Recover Existing Browser Authority</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* OPTION 1 FOR CLEAN SYSTEM: IMPORT EXISTING ALCO AUTHORITY */
                <div className="p-4 rounded-xl bg-indigo-950/40 border-2 border-indigo-500/50 hover:border-indigo-400 transition space-y-3 relative overflow-hidden group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">1. Import Existing ALCO Authority</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            RECOMMENDED
                          </span>
                        </div>
                        <span className="text-[11px] text-indigo-200 block mt-0.5">
                          Migrating from backup file or previous installation
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Imports your existing ALCO encrypted v2 backup with bit-for-bit Ed25519 identity parity.
                    Guarantees that your established authority fingerprint, public key, and all client applications continue working seamlessly.
                  </p>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenMigration) {
                          onOpenMigration();
                        }
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-md shadow-indigo-950"
                    >
                      <span>Import Existing ALCO Authority</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* SECONDARY CHOICE: CREATE NEW AUTHORITY (STRONGLY WARNED) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {isLegacyDetected ? 'Create New Authority (Overwrite)' : '2. Create New Authority'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {isLegacyDetected ? 'NOT RECOMMENDED' : 'NEW INSTALLATIONS ONLY'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {isLegacyDetected 
                          ? 'Generates a new Ed25519 keypair and replaces previous authority' 
                          : 'Only for brand-new systems with no previous authority'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strong Warning as required */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-amber-300 block mb-0.5">Strong Warning:</strong>
                    Creating a new authority generates a new Ed25519 identity. Existing ALCO client applications trusting the previous public key will reject licenses signed by the new authority.
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setViewMode('create')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition border border-slate-700"
                  >
                    <span>Create New Authority</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: RECOVER EXISTING AUTHORITY FORM */}
        {viewMode === 'recover' && isLegacyDetected && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-950 border border-emerald-400/30">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Recover Existing Browser Authority</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Identity Preserved
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Preserve your existing ALCO signing identity and secure it with a Master Password.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('choice')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {/* Existing Authority Fingerprint & Preview Banner */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200/95 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-emerald-400" />
                  Existing Fingerprint:
                </span>
                <span className="font-mono font-bold text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                  {legacyAuthority.fingerprint}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Existing Public Key:</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {legacyAuthority.publicKeyHex.slice(0, 16)}...{legacyAuthority.publicKeyHex.slice(-16)}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 border-t border-emerald-800/40 pt-2 mt-1">
                Your private key will be encrypted using PBKDF2-SHA-256 (250,000 iterations) and AES-256-GCM. The plaintext legacy key is deleted only after successful verification.
              </p>
            </div>

            <form onSubmit={handleRecoverSetup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Create Master Password</span>
                  <span className="text-[10px] text-slate-400">Min. 8 characters</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter Master Password to protect your authority..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Confirm Master Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Master Password..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Password Hint (Optional)</span>
                  <span className="text-[10px] text-slate-400">Stored locally in vault metadata</span>
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. Favorite password hint"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-850 focus:border-emerald-500 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMode('choice')}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  ← Back to choices
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Encrypting & Verifying Authority...</span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Secure & Recover Authority</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VIEW 3: CREATE NEW AUTHORITY FORM */}
        {viewMode === 'create' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-950 border border-indigo-400/30">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                    <span>Create New Authority Vault</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      AES-256-GCM
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Establish a brand new Ed25519 signing identity.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewMode('choice')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            {/* Mandatory Warning Banner */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/95 flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-amber-300 block mb-0.5">Critical Notice:</strong>
                Creating a new authority generates a new Ed25519 identity. Existing ALCO client applications trusting the previous public key will reject licenses signed by the new authority.
              </div>
            </div>

            <form onSubmit={handleCreateSetup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Master Password</span>
                  <span className="text-[10px] text-slate-400">Min. 8 characters</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter a strong Master Password..."
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Confirm Master Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your Master Password..."
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Password Hint (Optional)</span>
                  <span className="text-[10px] text-slate-400">Stored locally in vault metadata</span>
                </label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. Favorite book and birth year"
                  className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-850 focus:border-indigo-500 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-850 text-[11px] text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">Vault Security Architecture:</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                  <li>PBKDF2-SHA-256 with 250,000 iterations & 16-byte random salt</li>
                  <li>AES-256-GCM authenticated hardware-grade encryption</li>
                  <li>Private key is never saved plaintext in browser storage</li>
                </ul>
              </div>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setViewMode('choice')}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white rounded-lg transition"
                >
                  ← Back to choices
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !password || !confirmPassword}
                  className="py-2.5 px-5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-950 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <span>Deriving PBKDF2 Key & Encrypting...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Initialize Encrypted Vault</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
