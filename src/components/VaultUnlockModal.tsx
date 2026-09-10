import React, { useEffect, useState } from 'react';
import { Lock, Unlock, ShieldAlert, AlertTriangle, Eye, EyeOff, X } from 'lucide-react';
import { authorityClient } from '../modules/authority-client';

interface VaultUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: (meta?: { publicKeyHex?: string; fingerprint?: string }) => void;
  actionReason?: string;
}

export const VaultUnlockModal: React.FC<VaultUnlockModalProps> = ({
  isOpen,
  onClose,
  onUnlockSuccess,
  actionReason = 'Sign ALCO License Key'
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultMeta, setVaultMeta] = useState<{ fingerprint?: string; vaultHint?: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    authorityClient.getVaultStatus().then((status) => {
      setVaultMeta({
        fingerprint: status.fingerprint,
        vaultHint: status.vaultHint
      });
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setError(null);
    setIsLoading(true);

    try {
      // Small pause for visual feedback
      await new Promise(r => setTimeout(r, 60));
      const res = await authorityClient.unlockVault({ masterPassword: password });
      if (!res.success) {
        throw new Error(res.error || 'Incorrect Master Password.');
      }
      setPassword('');
      onUnlockSuccess({
        publicKeyHex: res.publicKeyHex,
        fingerprint: res.fingerprint
      });
    } catch (err: any) {
      setError(err?.message || 'Incorrect Master Password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>Owner Vault Locked</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AES-256
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Required to: <span className="text-indigo-300 font-medium">{actionReason}</span>
            </p>
          </div>
        </div>

        {/* Warning Reminder */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90 flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            "Jika private key dan backup hilang, lisensi baru tidak dapat ditandatangani menggunakan identitas ALCO lama."
          </div>
        </div>

        {/* Vault Fingerprint badge */}
        {vaultMeta?.fingerprint && (
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950 border border-slate-850 text-xs font-mono">
            <span className="text-slate-400">Authority Fingerprint:</span>
            <span className="text-indigo-400 font-semibold">{vaultMeta.fingerprint}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">
                Master Password
              </label>
              {vaultMeta?.vaultHint && (
                <span className="text-[11px] text-slate-400">
                  Hint: <span className="text-slate-300 italic">{vaultMeta.vaultHint}</span>
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Master Password..."
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

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password}
              className="flex-1 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
            >
              {isLoading ? (
                <span>Decrypting...</span>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Unlock Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
