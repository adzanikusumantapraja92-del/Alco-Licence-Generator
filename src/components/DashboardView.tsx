import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Save, 
  RotateCcw, 
  ExternalLink, 
  QrCode, 
  Calendar, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  Fingerprint, 
  Layers, 
  User, 
  FileCode2, 
  HelpCircle 
} from 'lucide-react';
import { 
  AlcoAppDefinition, 
  AlcoPlan, 
  AlcoLicenseType, 
  AlcoLicensePayload, 
  AlcoLicenseRecord, 
  OwnerKeyPair,
  VaultStatus 
} from '../modules/types';
import { decodeRequestCode, generateSampleRequestCode } from '../modules/request-code';
import { createLicensePayload } from '../modules/license-payload';
import { signCanonicalPayload, packageLicenseKey } from '../modules/signing';
import { generateMockDeviceId } from '../modules/device-fingerprint';
import {
  findCustomerByEmail,
  getLicensesForCustomer,
  upsertCustomerFromRequest,
} from '../modules/customer-registry';

interface DashboardViewProps {
  keyPair: OwnerKeyPair | null;
  registeredApps: AlcoAppDefinition[];
  onSaveLicense: (record: AlcoLicenseRecord) => void;
  onNavigateToSimulator: (licenseKey: string, appId: string, deviceId: string) => void;
  vaultStatus: VaultStatus;
  inMemoryPrivateKey: string | null;
  onRequestUnlock: (onUnlocked: (privateKey: string) => void) => void;
  onRequestSetup: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  keyPair,
  registeredApps,
  onSaveLicense,
  onNavigateToSimulator,
  vaultStatus,
  inMemoryPrivateKey,
  onRequestUnlock,
  onRequestSetup
}) => {
  // 1. Request Decoder State
  const [requestCodeInput, setRequestCodeInput] = useState<string>('');
  const [decodeStatus, setDecodeStatus] = useState<{
    success: boolean | null;
    message?: string;
  }>({ success: null });

  // 2. Customer Information
  const [customerId, setCustomerId] = useState<string>('CUST-ALCO-1001');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerRegistryStatus, setCustomerRegistryStatus] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // 3. Application Selection
  const [selectedAppId, setSelectedAppId] = useState<string>(registeredApps[0]?.id || 'alco-content-engine');

  // 4. License Type
  const [licenseType, setLicenseType] = useState<AlcoLicenseType>('subscription');

  // 5. Plan & Features
  const [plan, setPlan] = useState<AlcoPlan>('pro');
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>([]);

  // 6. Expiration
  const [expirationDate, setExpirationDate] = useState<string>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  });

  // 7 & 8. Generation & Result
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedLicense, setGeneratedLicense] = useState<{
    licenseKey: string;
    payload: AlcoLicensePayload;
    signature: string;
    canonicalString: string;
  } | null>(null);

  const [hasSaved, setHasSaved] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Sync selected app with features default
  const activeApp = registeredApps.find(a => a.id === selectedAppId) || registeredApps[0];

  useEffect(() => {
    if (activeApp) {
      // Auto-select features matching the current plan
      const planFeatures = activeApp.features
        .filter(f => f.plans.includes(plan))
        .map(f => f.id);
      setEnabledFeatures(planFeatures);
    }
  }, [selectedAppId, plan]);

  // Handle Request Code decoding
  const handleDecodeRequest = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setDecodeStatus({ success: null });
      return;
    }

    const res = decodeRequestCode(trimmed);
    if (res.success && res.data) {
      let resolvedCustomerId = res.data.customerId || '';
      let registryMessage = '';

      if (res.data.version === '2.0') {
        const existing = findCustomerByEmail(res.data.customerEmail || '');
        if (existing) {
          const licenses = getLicensesForCustomer(existing.customerId);
          resolvedCustomerId = existing.customerId;
          registryMessage = `EXISTING CUSTOMER: ${existing.customerId} (${licenses.length} existing ALCO license${licenses.length === 1 ? '' : 's'})`;
        } else {
          const created = upsertCustomerFromRequest({
            name: res.data.customerName || '',
            email: res.data.customerEmail || '',
          });
          resolvedCustomerId = created.customer.customerId;
          registryMessage = `NEW CUSTOMER: ${created.customer.customerId}`;
        }
      }

      setDecodeStatus({ success: true, message: `Valid Request Code decoded successfully${registryMessage ? ` — ${registryMessage}` : ''}` });
      setCustomerRegistryStatus(registryMessage);
      setCustomerId(resolvedCustomerId);
      setDeviceId(res.data.deviceId);
      setRequestId(res.data.requestId);
      if (res.data.customerName) setCustomerName(res.data.customerName);
      if (res.data.customerEmail) setCustomerEmail(res.data.customerEmail);
      if (res.data.notes) setNotes(res.data.notes);

      // Auto-match application if exists in registry
      const matched = registeredApps.find(a => a.id.toLowerCase() === res.data!.appId.toLowerCase());
      if (matched) {
        setSelectedAppId(matched.id);
      }
    } else {
      setCustomerRegistryStatus('');
      setDecodeStatus({ success: false, message: res.error || 'Failed to decode Request Code' });
    }
  };

  // Load sample request for test demonstration
  const handleLoadSampleRequest = () => {
    const sample = generateSampleRequestCode(selectedAppId);
    setRequestCodeInput(sample);
    handleDecodeRequest(sample);
  };

  // Quick expiration presets
  const handlePresetDays = (days: number) => {
    setLicenseType('subscription');
    const d = new Date();
    d.setDate(d.getDate() + days);
    setExpirationDate(d.toISOString().split('T')[0]);
  };

  // Toggle individual feature
  const handleToggleFeature = (featureId: string) => {
    setEnabledFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(f => f !== featureId) 
        : [...prev, featureId]
    );
  };

  // Select all or deselect all features
  const handleToggleAllFeatures = () => {
    if (!activeApp) return;
    if (enabledFeatures.length === activeApp.features.length) {
      setEnabledFeatures([]);
    } else {
      setEnabledFeatures(activeApp.features.map(f => f.id));
    }
  };

  // 7. Execute Signing using decrypted in-memory Ed25519 private key
  const executeSigning = (privateKeyHex: string) => {
    setIsGenerating(true);

    try {
      const { payload, canonicalPayload } = createLicensePayload({
        appId: selectedAppId,
        deviceId,
        customerId,
        customerName: customerName.trim() || undefined,
        plan,
        licenseType,
        features: enabledFeatures,
        expiresAt: licenseType === 'lifetime' ? null : expirationDate,
        metadata: {
          issuedBy: 'ALCO License Authority',
          appName: activeApp?.name || selectedAppId,
          notes: notes.trim() || undefined
        }
      });

      // Digitally sign canonical payload with decrypted Ed25519 private key
      const signatureHex = signCanonicalPayload(canonicalPayload, privateKeyHex);
      const licenseKey = packageLicenseKey(canonicalPayload, signatureHex);

      setGeneratedLicense({
        licenseKey,
        payload,
        signature: signatureHex,
        canonicalString: canonicalPayload
      });
      setHasSaved(false);
      setCopied(false);
    } catch (err: any) {
      alert(`License generation failed: ${err?.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Triggered on button click
  const handleGenerateLicense = () => {
    if (!selectedAppId || !deviceId || !customerId) {
      alert('Please ensure App ID, Device ID, and Customer ID are filled.');
      return;
    }

    if (vaultStatus === 'uninitialized') {
      onRequestSetup();
      return;
    }

    if (!inMemoryPrivateKey || vaultStatus === 'locked') {
      onRequestUnlock((unlockedPrivKey) => {
        executeSigning(unlockedPrivKey);
      });
      return;
    }

    executeSigning(inMemoryPrivateKey);
  };

  // Copy License
  const handleCopyLicense = () => {
    if (!generatedLicense) return;
    navigator.clipboard.writeText(generatedLicense.licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Save License
  const handleSaveLicense = () => {
    if (!generatedLicense) return;
    const record: AlcoLicenseRecord = {
      id: generatedLicense.payload.licenseId,
      licenseKey: generatedLicense.licenseKey,
      payload: generatedLicense.payload,
      signature: generatedLicense.signature,
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    onSaveLicense(record);
    setHasSaved(true);
  };

  // Generate New License (Reset form)
  const handleResetForNew = () => {
    setRequestCodeInput('');
    setDecodeStatus({ success: null });
    setCustomerId(`CUST-ALCO-${Math.floor(1000 + Math.random() * 9000)}`);
    setCustomerName('');
    setCustomerEmail('');
    setCustomerRegistryStatus('');
    setRequestId('');
    setDeviceId('');
    setNotes('');
    setGeneratedLicense(null);
    setHasSaved(false);
    setCopied(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Intro banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Offline Standalone Authority
            </span>
            <span className="text-xs text-slate-400 font-mono">Ed25519 Asymmetric Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            ALCO Ecosystem License Authority
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Input customer Activation Request Codes, configure entitlements, and sign cryptographic Ed25519 licenses valid exclusively for their hardware.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-sample-request"
            onClick={handleLoadSampleRequest}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 flex items-center gap-2 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load Sample Request</span>
          </button>
          <button
            id="btn-generate-new-top"
            onClick={handleResetForNew}
            className="px-3.5 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset / New</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Configuration (Sections 1-6) */}
        <div className="lg:col-span-7 space-y-6">

          {/* SECTION 1: REQUEST DECODER */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                  1
                </span>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  Request Decoder
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Customer sends from ALCO client app
              </span>
            </div>

            <div>
              <label htmlFor="input-request-code" className="block text-xs font-medium text-slate-300 mb-1.5">
                Paste Request Code (ALCO-REQ-v1...)
              </label>
              <textarea
                id="input-request-code"
                rows={2}
                value={requestCodeInput}
                onChange={(e) => {
                  setRequestCodeInput(e.target.value);
                  handleDecodeRequest(e.target.value);
                }}
                placeholder="ALCO-REQ-v1.eyJ2IjoiMS4wIiwiYXBwIjoiYWxjby1jb250ZW50LWVuZ2luZSIsImRldiI6... or paste JSON"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
              />
            </div>

            {/* Decode Status Feedback */}
            {decodeStatus.success !== null && (
              <div className={`p-2.5 rounded-lg border text-xs flex items-center gap-2 ${
                decodeStatus.success 
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}>
                {decodeStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{decodeStatus.message}</span>
              </div>
            )}
          </section>

          {/* SECTION 2: CUSTOMER INFORMATION */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                  2
                </span>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  Customer & Device Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeviceId(generateMockDeviceId())}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 transition underline flex items-center gap-1"
              >
                <Fingerprint className="w-3 h-3" />
                <span>Random Device ID</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-customer-id" className="block text-xs font-medium text-slate-300 mb-1">
                  Customer ID <span className="text-rose-400">*</span>
                </label>
                <input
                  id="input-customer-id"
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="CUST-ALCO-XXXX"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="input-customer-name" className="block text-xs font-medium text-slate-300 mb-1">
                  Customer / Business Name
                </label>
                <input
                  id="input-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe (Studio Media)"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="input-customer-email" className="block text-xs font-medium text-slate-300 mb-1">
                  Customer Email
                </label>
                <input
                  id="input-customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                />
                {customerRegistryStatus && (
                  <p className="text-[11px] text-emerald-300 mt-1">
                    {customerRegistryStatus}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="input-device-id" className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Hardware Device ID (Locked) <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-slate-400">Enforces 1 PC License binding</span>
                </label>
                <div className="relative">
                  <Fingerprint className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    id="input-device-id"
                    type="text"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                    placeholder="ALCO-DEV-XXXX-XXXX-XXXX"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono font-medium tracking-wide focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="input-notes" className="block text-xs font-medium text-slate-300 mb-1">
                  Internal Notes / Order Reference
                </label>
                <input
                  id="input-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Order #INV-9281 - Special early adopter plan"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: APPLICATION SELECTION */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                  3
                </span>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  Target Application
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {registeredApps.length} Ecosystem Apps Available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {registeredApps.map(app => {
                const isSelected = app.id === selectedAppId;
                return (
                  <button
                    key={app.id}
                    id={`app-select-${app.id}`}
                    type="button"
                    onClick={() => setSelectedAppId(app.id)}
                    className={`p-3 rounded-lg text-left border transition relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-white">{app.name}</span>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                        )}
                      </div>
                      <code className="text-[10px] text-indigo-400/90 font-mono block mb-1">
                        {app.id}
                      </code>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {app.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* SECTION 4: LICENSE TYPE (LIFETIME VS SUBSCRIPTION) */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                4
              </span>
              <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                License Type
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-license-type-subscription"
                type="button"
                onClick={() => setLicenseType('subscription')}
                className={`p-3.5 rounded-lg border text-left transition flex items-start gap-3 ${
                  licenseType === 'subscription'
                    ? 'bg-indigo-950/50 border-indigo-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Clock className={`w-5 h-5 shrink-0 ${licenseType === 'subscription' ? 'text-indigo-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-bold text-white">Subscription (Time-Bound)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Requires periodic renewal. Expires automatically.
                  </div>
                </div>
              </button>

              <button
                id="btn-license-type-lifetime"
                type="button"
                onClick={() => setLicenseType('lifetime')}
                className={`p-3.5 rounded-lg border text-left transition flex items-start gap-3 ${
                  licenseType === 'lifetime'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Sparkles className={`w-5 h-5 shrink-0 ${licenseType === 'lifetime' ? 'text-emerald-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-bold text-white">Lifetime (Perpetual)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Never expires. One-time permanent license.
                  </div>
                </div>
              </button>
            </div>
          </section>

          {/* SECTION 5: PLAN & FEATURES */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                  5
                </span>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  Plan & Features Matrix
                </h3>
              </div>
              <button
                type="button"
                onClick={handleToggleAllFeatures}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline"
              >
                {enabledFeatures.length === activeApp?.features.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Plan selector pills */}
            <div className="grid grid-cols-4 gap-2">
              {(['starter', 'pro', 'enterprise', 'custom'] as AlcoPlan[]).map(p => (
                <button
                  key={p}
                  id={`plan-select-${p}`}
                  type="button"
                  onClick={() => setPlan(p)}
                  className={`py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                    plan === p
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Feature checkboxes corresponding to active app */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-medium text-slate-300 block mb-1.5">
                Enabled Capabilities ({enabledFeatures.length}/{activeApp?.features.length || 0}):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeApp?.features.map(f => {
                  const isChecked = enabledFeatures.includes(f.id);
                  return (
                    <label
                      key={f.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-indigo-950/30 border-indigo-500/50 text-slate-200'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleFeature(f.id)}
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                      />
                      <div>
                        <div className="font-medium text-slate-200">{f.label}</div>
                        <div className="text-[10px] text-slate-400">{f.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SECTION 6: EXPIRATION */}
          <section className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                  6
                </span>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  Expiration Policy
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {licenseType === 'lifetime' ? 'Perpetual License' : 'Expiry Enforcement'}
              </span>
            </div>

            {licenseType === 'lifetime' ? (
              <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Perpetual Lifetime Active:</strong> No expiration date will be stamped. The customer can use this build forever.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 mr-1">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(30)}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition"
                  >
                    +30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(90)}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition"
                  >
                    +90 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(180)}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition"
                  >
                    +180 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(365)}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-indigo-300 hover:border-slate-700 transition font-medium"
                  >
                    +1 Year (365d)
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetDays(730)}
                    className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 transition"
                  >
                    +2 Years
                  </button>
                </div>

                <div>
                  <label htmlFor="input-expiry-date" className="block text-xs font-medium text-slate-300 mb-1">
                    Expiration Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    <input
                      id="input-expiry-date"
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 7: GENERATE LICENSE (CTA) */}
          <section className="pt-2">
            <button
              id="btn-generate-license"
              type="button"
              disabled={isGenerating || !deviceId || !customerId}
              onClick={handleGenerateLicense}
              className={`w-full py-4 rounded-xl font-bold text-sm text-white tracking-wide transition flex items-center justify-center gap-2 shadow-lg ${
                !deviceId || !customerId
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-950 border border-indigo-400/40 active:scale-[0.99]'
              }`}
            >
              <KeyRound className="w-4 h-4 text-white" />
              <span>
                {isGenerating 
                  ? 'Cryptographically Signing with Ed25519...' 
                  : vaultStatus === 'locked'
                  ? 'UNLOCK VAULT & GENERATE LICENSE'
                  : 'GENERATE ALCO LICENSE KEY'}
              </span>
            </button>
            {(!deviceId || !customerId) ? (
              <p className="text-center text-xs text-amber-400/80 mt-2">
                * Please provide Device ID and Customer ID above to sign the license.
              </p>
            ) : vaultStatus === 'locked' ? (
              <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
                <span>🔒</span>
                <span>Vault is locked. You will be prompted for your Master Password to sign in transient memory.</span>
              </p>
            ) : null}
          </section>
        </div>

        {/* Right Column: SECTION 8 (LICENSE RESULT) & CRYPTOGRAPHIC TELEMETRY */}
        <div className="lg:col-span-5 space-y-6">

          {/* SECTION 8: LICENSE RESULT */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm space-y-5 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center border border-purple-500/30">
                  8
                </span>
                <h3 className="text-sm font-semibold text-white tracking-wide uppercase">
                  License Result
                </h3>
              </div>
              {generatedLicense && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SIGNED
                </span>
              )}
            </div>

            {generatedLicense ? (
              <div className="space-y-4">
                {/* Result header */}
                <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>License ID:</span>
                    <span className="text-indigo-300 font-bold">{generatedLicense.payload.licenseId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Target App:</span>
                    <span className="text-white">{generatedLicense.payload.appId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Customer:</span>
                    <span className="text-white">{generatedLicense.payload.customerId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Plan:</span>
                    <span className="text-emerald-400 font-bold uppercase">{generatedLicense.payload.plan}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Validity:</span>
                    <span className="text-amber-300">
                      {generatedLicense.payload.licenseType === 'lifetime' ? 'Lifetime (Permanent)' : `Expires ${generatedLicense.payload.expiresAt?.split('T')[0]}`}
                    </span>
                  </div>
                </div>

                {/* Formatted License Key Box */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Exported License Key String:
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {generatedLicense.licenseKey.length} chars
                    </span>
                  </div>
                  <textarea
                    id="output-license-key"
                    readOnly
                    rows={4}
                    value={generatedLicense.licenseKey}
                    className="w-full p-3 rounded-lg bg-slate-950 border border-indigo-900/50 text-indigo-300 text-xs font-mono break-all focus:outline-none select-all"
                  />
                </div>

                {/* Action Buttons: Copy, Save, Generate New */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <button
                    id="btn-copy-license"
                    type="button"
                    onClick={handleCopyLicense}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 transition shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy License'}</span>
                  </button>

                  <button
                    id="btn-save-license"
                    type="button"
                    onClick={handleSaveLicense}
                    disabled={hasSaved}
                    className={`px-3 py-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                      hasSaved
                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-300 cursor-default'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                    }`}
                  >
                    {hasSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{hasSaved ? 'Saved in Vault' : 'Save License'}</span>
                  </button>

                  <button
                    id="btn-generate-new-bottom"
                    type="button"
                    onClick={handleResetForNew}
                    className="px-3 py-2.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>New Request</span>
                  </button>
                </div>

                {/* One-click test in Client Simulator */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    id="btn-test-in-simulator"
                    type="button"
                    onClick={() => {
                      onNavigateToSimulator(
                        generatedLicense.licenseKey,
                        generatedLicense.payload.appId,
                        generatedLicense.payload.deviceId
                      );
                    }}
                    className="w-full py-2 rounded-lg text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-slate-850 flex items-center justify-center gap-1.5 transition"
                  >
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Test License in Client Simulator &rarr;</span>
                  </button>
                </div>

                {/* Payload JSON Inspector */}
                <details className="text-xs bg-slate-950/70 border border-slate-850 rounded-lg p-3 group">
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-200 font-mono text-[11px] select-none flex items-center justify-between">
                    <span>Canonical Signed Payload</span>
                    <span className="text-[10px] text-indigo-400">View JSON</span>
                  </summary>
                  <pre className="mt-2.5 text-[10px] text-slate-300 font-mono overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800">
                    {JSON.stringify(generatedLicense.payload, null, 2)}
                  </pre>
                  <div className="mt-2 text-[10px] text-slate-500 font-mono break-all">
                    <strong>Ed25519 Sig:</strong> {generatedLicense.signature}
                  </div>
                </details>
              </div>
            ) : (
              <div className="py-12 px-4 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-600">
                  <KeyRound className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-300">
                  No License Generated Yet
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Fill in the request details or load a sample request on the left, then click "Generate ALCO License Key".
                </p>
              </div>
            )}

            {/* Cryptographic Key Summary Badge */}
            <div className="pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <Shield className="w-3 h-3 text-indigo-400" />
                  <span>Authority Vault Key:</span>
                </span>
                <span className="font-mono text-indigo-300 text-[10px]">
                  {keyPair.fingerprint}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Signing is completed locally on your machine. No private keys are sent online.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
