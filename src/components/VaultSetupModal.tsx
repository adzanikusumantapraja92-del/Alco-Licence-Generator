import React, { useState } from 'react';
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
  ShieldCheck 
} from 'lucide-react';
import { authorityClient } from '../modules/authority-client';

interface VaultSetupModalProps {
  isOpen: boolean;
  onSetupComplete: (meta: { publicKeyHex: string; fingerprint: string }) => void;
  onOpenMigration?: () => void;
}

export const VaultSetupModal: React.FC<VaultSetupModalProps> = ({
  isOpen,
  onSetupComplete,
  onOpenMigration
}) => {
  const [viewMode, setViewMode] = useState<'choice' | 'create'>('choice');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSetup = async (e: React.FormEvent) => {
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
      // Delay slightly to let UI render loading spinner
      await new Promise(r => setTimeout(r, 100));

      const res = await authorityClient.setupVault({
        masterPassword: password,
        vaultHint: hint
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to initialize encrypted vault.');
      }

      onSetupComplete({
        publicKeyHex: res.publicKeyHex,
        fingerprint: res.fingerprint
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize encrypted vault.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6 text-slate-100 relative max-h-[92vh] overflow-y-auto">
        
        {/* VIEW 1: CHOICE SCREEN (First Run UX) */}
        {viewMode === 'choice' ? (
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
                  Select how you want to configure your desktop cryptographic authority.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Option 1: IMPORT EXISTING ALCO AUTHORITY (RECOMMENDED) */}
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
                        Migrating from previous browser version
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

              {/* Option 2: CREATE NEW AUTHORITY (NEW INSTALLATIONS ONLY) */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">2. Create New Authority</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          NEW INSTALLATIONS ONLY
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Only for brand-new systems with no previous authority
                      </span>
                    </div>
                  </div>
                </div>

                {/* Strong Warning as required */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold text-amber-300 block mb-0.5">Strong Warning:</strong>
                    "Creating a new authority generates a new Ed25519 identity. Existing ALCO client applications trusting the previous public key may reject licenses signed by the new authority."
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
        ) : (
          /* VIEW 2: CREATE NEW AUTHORITY FORM */
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
                "Creating a new authority generates a new Ed25519 identity. Existing ALCO client applications trusting the previous public key may reject licenses signed by the new authority."
              </div>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
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
