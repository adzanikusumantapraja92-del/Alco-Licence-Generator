/**
 * ALCO License Generator
 * Aladzan Corpora Ecosystem - Owner Licensing Authority
 * 
 * Cryptographic Architecture:
 * - Ed25519 Asymmetric Digital Signatures
 * - Encrypted Owner Vault (AES-256-GCM, PBKDF2-SHA-256)
 * - Zero Plaintext Private Keys in Storage or React State
 * - Electron Main Process Authority Boundary
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LicenseHistoryView } from './components/LicenseHistoryView';
import { AppRegistryView } from './components/AppRegistryView';
import { VerifierSimulatorView } from './components/VerifierSimulatorView';
import { SettingsView } from './components/SettingsView';
import { VaultSetupModal } from './components/VaultSetupModal';
import { VaultUnlockModal } from './components/VaultUnlockModal';

import { 
  OwnerKeyPair, 
  AlcoLicenseRecord, 
  AlcoAppDefinition, 
  VaultStatus 
} from './modules/types';
import { authorityClient } from './modules/authority-client';
import { DEFAULT_ALCO_APPS } from './modules/application-registry';

function mergeRegisteredApps(customApps: AlcoAppDefinition[]): AlcoAppDefinition[] {
  return [
    ...DEFAULT_ALCO_APPS,
    ...customApps.filter(app => !DEFAULT_ALCO_APPS.some(systemApp => systemApp.id === app.id))
  ];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('generator');
  
  // Vault & Cryptographic States (NO inMemoryPrivateKey in React state!)
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('uninitialized');

  // Public key metadata (safe to display and embed into client builds)
  const [keyPair, setKeyPair] = useState<OwnerKeyPair | null>(null);

  // Modal Dialog states
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(false);
  const [isUnlockOpen, setIsUnlockOpen] = useState<boolean>(false);
  const [unlockReason, setUnlockReason] = useState<string>('Sign ALCO License Key');
  const [pendingUnlockCallback, setPendingUnlockCallback] = useState<(() => void) | null>(null);

  // Storage states
  const [registeredApps, setRegisteredApps] = useState<AlcoAppDefinition[]>(() => mergeRegisteredApps([]));
  const [history, setHistory] = useState<AlcoLicenseRecord[]>([]);

  // Simulator jump state
  const [simulatorPrefill, setSimulatorPrefill] = useState<{
    licenseKey: string;
    appId: string;
    deviceId: string;
  } | null>(null);

  // Sync initial status with authority service
  useEffect(() => {
    authorityClient.getVaultStatus().then((res) => {
      setVaultStatus(res.status);
      if (res.publicKeyHex && res.fingerprint) {
        setKeyPair({
          publicKeyHex: res.publicKeyHex,
          fingerprint: res.fingerprint,
          createdAt: res.createdAt || new Date().toISOString()
        });
      }
      if (res.status === 'uninitialized') {
        setIsSetupOpen(true);
      }
    });
    authorityClient.getCustomApps().then((apps) => setRegisteredApps(mergeRegisteredApps(apps)));
    authorityClient.getHistory().then(setHistory);
  }, []);

  const handleLockVault = useCallback(async () => {
    await authorityClient.lockVault();
    setVaultStatus('locked');
  }, []);

  // Auto-lock on inactivity timer
  useEffect(() => {
    if (vaultStatus !== 'unlocked') return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    authorityClient.getSettings().then((settings) => {
      const lockMinutes = settings.autoLockMinutes || 15;
      if (lockMinutes <= 0) return;

      timer = setTimeout(() => {
        handleLockVault();
      }, lockMinutes * 60 * 1000);
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [vaultStatus, handleLockVault]);

  const refreshAllData = useCallback(() => {
    authorityClient.getVaultStatus().then((res) => {
      setVaultStatus(res.status);
      if (res.publicKeyHex && res.fingerprint) {
        setKeyPair({
          publicKeyHex: res.publicKeyHex,
          fingerprint: res.fingerprint,
          createdAt: res.createdAt || new Date().toISOString()
        });
      }
    });
    authorityClient.getCustomApps().then((apps) => setRegisteredApps(mergeRegisteredApps(apps)));
    authorityClient.getHistory().then(setHistory);
  }, []);

  const handleRequestUnlock = useCallback((callback?: () => void, reason = 'Sign ALCO License Key') => {
    if (vaultStatus === 'unlocked') {
      callback?.();
      return;
    }
    setUnlockReason(reason);
    setPendingUnlockCallback(() => callback || null);
    setIsUnlockOpen(true);
  }, [vaultStatus]);

  const handleUnlockSuccess = useCallback((meta?: { publicKeyHex?: string; fingerprint?: string }) => {
    setVaultStatus('unlocked');
    if (meta?.publicKeyHex && meta?.fingerprint) {
      setKeyPair(prev => ({
        publicKeyHex: meta.publicKeyHex!,
        fingerprint: meta.fingerprint!,
        createdAt: prev?.createdAt || new Date().toISOString()
      }));
    }
    setIsUnlockOpen(false);

    if (pendingUnlockCallback) {
      pendingUnlockCallback();
      setPendingUnlockCallback(null);
    }
  }, [pendingUnlockCallback]);

  const handleSetupComplete = useCallback((meta: { publicKeyHex: string; fingerprint: string }) => {
    setKeyPair({
      publicKeyHex: meta.publicKeyHex,
      fingerprint: meta.fingerprint,
      createdAt: new Date().toISOString()
    });
    setVaultStatus('unlocked');
    setIsSetupOpen(false);
  }, []);

  const handleSaveLicense = async (record: AlcoLicenseRecord) => {
    await authorityClient.saveLicenseRecord(record);
    setHistory(await authorityClient.getHistory());
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'revoked') => {
    await authorityClient.updateLicenseStatus(id, status);
    setHistory(await authorityClient.getHistory());
  };

  const handleDeleteRecord = async (id: string) => {
    await authorityClient.deleteLicenseRecord(id);
    setHistory(await authorityClient.getHistory());
  };

  const handleSaveApp = async (app: AlcoAppDefinition) => {
    const currentCustomApps = (await authorityClient.getCustomApps()).filter(item => item.id !== app.id);
    await authorityClient.saveCustomApps([...currentCustomApps, { ...app, isSystem: false }]);
    setRegisteredApps(mergeRegisteredApps(await authorityClient.getCustomApps()));
  };

  const handleDeleteApp = async (appId: string) => {
    const currentCustomApps = (await authorityClient.getCustomApps()).filter(item => item.id !== appId);
    await authorityClient.saveCustomApps(currentCustomApps);
    setRegisteredApps(mergeRegisteredApps(await authorityClient.getCustomApps()));
  };

  const handleNavigateToSimulator = (licenseKey: string, appId: string, deviceId: string) => {
    setSimulatorPrefill({ licenseKey, appId, deviceId });
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        keyPair={keyPair}
        historyCount={history.length}
        vaultStatus={vaultStatus}
        onUnlockClick={() => handleRequestUnlock(undefined, 'Access Vault Controls')}
        onLockClick={handleLockVault}
        onSetupClick={() => setIsSetupOpen(true)}
      />

      <main className="flex-1 pb-16">
        {activeTab === 'generator' && (
          <DashboardView
            keyPair={keyPair}
            registeredApps={registeredApps}
            onSaveLicense={handleSaveLicense}
            onNavigateToSimulator={handleNavigateToSimulator}
            vaultStatus={vaultStatus}
            onRequestUnlock={(onSuccess) => handleRequestUnlock(onSuccess, 'Sign ALCO License Key')}
            onRequestSetup={() => setIsSetupOpen(true)}
          />
        )}

        {activeTab === 'history' && (
          <LicenseHistoryView
            history={history}
            registeredApps={registeredApps}
            onUpdateStatus={handleUpdateStatus}
            onDeleteRecord={handleDeleteRecord}
            onNavigateToSimulator={handleNavigateToSimulator}
          />
        )}

        {activeTab === 'registry' && (
          <AppRegistryView
            registeredApps={registeredApps}
            onSaveApp={handleSaveApp}
            onDeleteApp={handleDeleteApp}
          />
        )}

        {activeTab === 'simulator' && (
          <VerifierSimulatorView
            keyPair={keyPair}
            registeredApps={registeredApps}
            initialLicenseKey={simulatorPrefill?.licenseKey || ''}
            initialAppId={simulatorPrefill?.appId || registeredApps[0]?.id}
            initialDeviceId={simulatorPrefill?.deviceId || ''}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            keyPair={keyPair}
            vaultStatus={vaultStatus}
            onLockVault={handleLockVault}
            onRequestUnlock={(onSuccess) => handleRequestUnlock(onSuccess, 'Access Keypair Settings')}
            onRequestSetup={() => setIsSetupOpen(true)}
            onRefreshData={refreshAllData}
          />
        )}
      </main>

      {/* Persistent footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">ALCO License Authority</span>
          <span>•</span>
          <span>Hardware-Bound Offline Architecture</span>
          <span>•</span>
          <span>AES-256-GCM Vault</span>
          <span>•</span>
          <span>Ed25519</span>
        </div>
        <div>
          <span>Aladzan Corpora Ecosystem (ALCO) &copy; {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* Setup Modal */}
      <VaultSetupModal
        isOpen={isSetupOpen}
        onSetupComplete={handleSetupComplete}
      />

      {/* Unlock Modal */}
      <VaultUnlockModal
        isOpen={isUnlockOpen}
        onClose={() => {
          setIsUnlockOpen(false);
          setPendingUnlockCallback(null);
        }}
        onUnlockSuccess={handleUnlockSuccess}
        actionReason={unlockReason}
      />
    </div>
  );
}
