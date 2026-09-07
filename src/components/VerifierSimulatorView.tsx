import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Fingerprint, 
  Layers, 
  KeyRound, 
  RotateCw, 
  Sparkles, 
  Terminal, 
  AlertTriangle 
} from 'lucide-react';
import { AlcoAppDefinition, OwnerKeyPair, AlcoVerificationResult } from '../modules/types';
import { verifyAlcoLicense } from '../modules/verification';

interface VerifierSimulatorViewProps {
  keyPair: OwnerKeyPair;
  registeredApps: AlcoAppDefinition[];
  initialLicenseKey?: string;
  initialAppId?: string;
  initialDeviceId?: string;
}

export const VerifierSimulatorView: React.FC<VerifierSimulatorViewProps> = ({
  keyPair,
  registeredApps,
  initialLicenseKey = '',
  initialAppId = 'alco-content-engine',
  initialDeviceId = ''
}) => {
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>(initialLicenseKey);
  const [testAppId, setTestAppId] = useState<string>(initialAppId);
  const [testDeviceId, setTestDeviceId] = useState<string>(initialDeviceId || 'ALCO-DEV-9B4A-71E2-5D88');
  const [testDateOffset, setTestDateOffset] = useState<number>(0); // days in future
  
  const [result, setResult] = useState<AlcoVerificationResult | null>(null);

  const handleRunVerification = () => {
    if (!licenseKeyInput.trim()) {
      alert('Please enter a license key to verify.');
      return;
    }

    const testDate = new Date();
    testDate.setDate(testDate.getDate() + testDateOffset);

    const verificationResult = verifyAlcoLicense({
      licenseKey: licenseKeyInput,
      expectedAppId: testAppId,
      expectedDeviceId: testDeviceId,
      publicKeyHex: keyPair.publicKeyHex,
      currentDate: testDate
    });

    setResult(verificationResult);
  };

  // Quick tamper test
  const handleTamperKey = () => {
    if (!licenseKeyInput) return;
    // Alter one character in signature
    const tampered = licenseKeyInput.slice(0, -2) + (licenseKeyInput.slice(-2) === 'aa' ? 'bb' : 'aa');
    setLicenseKeyInput(tampered);
    alert('License key altered by 1 byte! Run verification to test cryptographic tamper detection.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              ALCO Client SDK Simulator
            </span>
            <span className="text-xs text-slate-400">Offline Electron Preload Simulation</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Customer Application Verification Sandbox
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Simulate how customer applications (e.g. ALCO Content Engine) verify an activated license using your embedded Ed25519 Public Key.
          </p>
        </div>

        <button
          onClick={handleRunVerification}
          className="px-4 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition shadow-md shadow-indigo-950"
        >
          <RotateCw className="w-4 h-4" />
          <span>Run Verification Check</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Parameters (Simulator environment) */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>Simulated Customer Machine Environment</span>
            </h3>

            {/* License Key input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Customer License Key String
                </label>
                <button
                  type="button"
                  onClick={handleTamperKey}
                  className="text-[11px] text-amber-400 hover:text-amber-300 underline"
                >
                  Tamper 1-byte (Test Fraud Detection)
                </button>
              </div>
              <textarea
                rows={3}
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                placeholder="ALCO-LIC-v1..."
                className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-indigo-300 text-xs font-mono break-all focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Target App */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Current Client Application ID (where user opens app)
              </label>
              <select
                value={testAppId}
                onChange={(e) => setTestAppId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:ring-1 focus:ring-indigo-500 font-mono"
              >
                {registeredApps.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                ))}
              </select>
            </div>

            {/* Device ID */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Current PC Hardware Fingerprint</span>
                <span className="text-[10px] text-slate-500">Electron main process hardware read</span>
              </label>
              <div className="relative">
                <Fingerprint className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={testDeviceId}
                  onChange={(e) => setTestDeviceId(e.target.value)}
                  placeholder="ALCO-DEV-XXXX-XXXX-XXXX"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                />
              </div>
            </div>

            {/* Time Warp (Test Expiration) */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                <span>Time Warp (Test Future Expiration)</span>
                <span className="font-mono text-indigo-300">
                  {testDateOffset === 0 ? 'Current Real Time' : `+${testDateOffset} Days in the Future`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={750}
                step={30}
                value={testDateOffset}
                onChange={(e) => setTestDateOffset(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>Today</span>
                <span>+6 Months</span>
                <span>+1 Year</span>
                <span>+2 Years</span>
              </div>
            </div>

            {/* Embedded Public Key Info */}
            <div className="pt-2 border-t border-slate-850 text-xs space-y-1">
              <span className="text-slate-400 block font-medium">Embedded Owner Public Key (in Client Code):</span>
              <code className="text-[10px] text-indigo-300/80 font-mono break-all block p-2 bg-slate-950 rounded border border-slate-800">
                {keyPair.publicKeyHex}
              </code>
            </div>

            <button
              onClick={handleRunVerification}
              className="w-full py-3 rounded-lg font-semibold text-xs text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-sm"
            >
              Verify License Now
            </button>
          </div>
        </div>

        {/* Verification Report */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verification Diagnostics Report</span>
              </h3>

              {result && (
                <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                  result.valid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {result.valid ? 'AUTHORIZED / UNLOCKED' : 'ACCESS DENIED'}
                </span>
              )}
            </div>

            {result ? (
              <div className="space-y-4">
                {/* Master summary banner */}
                <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                  result.valid 
                    ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300' 
                    : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                }`}>
                  {result.valid ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm">
                      {result.valid ? 'Valid ALCO License Verified' : 'License Verification Failed'}
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90">
                      {result.valid 
                        ? `Application unlocked for customer ${result.payload?.customerId}. Features are enabled.` 
                        : result.reason}
                    </p>
                  </div>
                </div>

                {/* The 5 mandatory verification checks */}
                <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-850 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono block mb-2">
                    5-Point Security Checklist:
                  </span>

                  {/* 1. Format */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-900">
                    <span className="text-slate-300">1. Format & Version Supported</span>
                    {result.checks.versionSupported ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASSED (v1.0)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> FAILED
                      </span>
                    )}
                  </div>

                  {/* 2. Signature */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-900">
                    <span className="text-slate-300">2. Ed25519 Cryptographic Signature</span>
                    {result.checks.signatureValid ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> AUTHENTIC
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> INVALID / TAMPERED
                      </span>
                    )}
                  </div>

                  {/* 3. App ID */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-900">
                    <span className="text-slate-300">3. App ID Match</span>
                    {result.checks.appIdMatches ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> MATCHES ({result.details.appId})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> MISMATCH
                      </span>
                    )}
                  </div>

                  {/* 4. Device ID */}
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-900">
                    <span className="text-slate-300">4. Device Fingerprint Hardware Lock</span>
                    {result.checks.deviceIdMatches ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> BOUND TO PC
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> HARDWARE MISMATCH
                      </span>
                    )}
                  </div>

                  {/* 5. Expiration */}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-slate-300">5. Expiration Status</span>
                    {result.checks.notExpired ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE ({result.details.expiresAtFormatted})
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                        <XCircle className="w-3.5 h-3.5" /> EXPIRED
                      </span>
                    )}
                  </div>
                </div>

                {/* Unlocked plan & features preview */}
                {result.valid && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Unlocked Plan Tier:</span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-indigo-600 text-white">
                        {result.details.plan}
                      </span>
                    </div>

                    <div>
                      <span className="text-xs font-medium text-slate-400 block mb-1.5">
                        Activated Feature Capabilities ({result.details.features.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {result.details.features.map(f => (
                          <span key={f} className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/50 text-indigo-300 border border-indigo-800/40">
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-600" />
                <p className="text-sm font-medium text-slate-300">Awaiting Simulator Input</p>
                <p className="text-xs max-w-xs mx-auto">
                  Click "Run Verification Check" to test the license against the simulated client environment.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
