/**
 * ALCO License Generator
 * Aladzan Corpora Ecosystem - Owner Licensing Authority
 * 
 * Cryptographic Architecture:
 * - Ed25519 Asymmetric Digital Signatures (tweetnacl)
 * - Encrypted Owner Vault (AES-256-GCM, PBKDF2-SHA-256 250k iterations)
 * - Zero Plaintext Private Keys in Storage
 * - Purely In-Memory Decryption for Signing Operations
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
  VaultStatus,
  EncryptedOwnerVault 
} from './modules/types';
import { 
  hasOwnerVault,
  getOwnerPublicMeta,
  getLicenseHistory, 
  saveLicenseToHistory, 
  updateLicenseStatus, 
  deleteLicenseFromHistory,
  getOwnerSettings
} from './modules/storage';
import { 
  getRegisteredApps, 
  saveCustomApp, 
  deleteCustomApp 
} from './modules/application-registry';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('generator');
  
  // Vault & Cryptographic States
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>(() => {
    return hasOwnerVault() ? 'locked' : 'uninitialized';
  });
  
  // STRICTLY VOLATILE: decrypted private key exists ONLY in React memory state while unlocked.
  // NEVER persisted to localStorage or sessionStorage!
  const [inMemoryPrivateKey, setInMemoryPrivateKey] = useState<string | null>(null);

  // Public key metadata (safe to display and embed into client builds)
  const [keyPair, setKeyPair] = useState<OwnerKeyPair | null>(() => getOwnerPublicMeta());

  // Modal Dialog states
  const [isSetupOpen, setIsSetupOpen] = useState<boolean>(() => !hasOwnerVault());
  const [isUnlockOpen, setIsUnlockOpen] = useState<boolean>(false);
  const [unlockReason, setUnlockReason] = useState<string>('Sign ALCO License Key');
  const [pendingUnlockCallback, setPendingUnlockCallback] = useState<((privKey: string) => void) | null>(null);

  // Storage states
  const [registeredApps, setRegisteredApps] = useState<AlcoAppDefinition[]>(() => getRegisteredApps());
  const [history, setHistory] = useState<AlcoLicenseRecord[]>(() => getLicenseHistory());

  // Simulator jump state
  const [simulatorPrefill, setSimulatorPrefill] = useState<{
    licenseKey: string;
    appId: string;
    deviceId: string;
  } | null>(null);

  // Auto-lock on inactivity timer
  useEffect(() => {
    if (vaultStatus !== 'unlocked') return;

    const settings = getOwnerSettings();
    const lockMinutes = settings.autoLockMinutes || 15;
    if (lockMinutes <= 0) return;

    const timeoutMs = lockMinutes * 60 * 1000;
    const timer = setTimeout(() => {
      handleLockVault();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [vaultStatus, inMemoryPrivateKey]);

  const refreshAllData = useCallback(() => {
    const publicMeta = getOwnerPublicMeta();
    setKeyPair(publicMeta);
    setRegisteredApps(getRegisteredApps());
    setHistory(getLicenseHistory());
    if (!hasOwnerVault()) {
      setVaultStatus('uninitialized');
      setInMemoryPrivateKey(null);
    }
  }, []);

  const handleLockVault = useCallback(() => {
    setInMemoryPrivateKey(null);
    setVaultStatus('locked');
  }, []);

  const handleRequestUnlock = useCallback((callback?: (privKey: string) => void, reason = 'Sign ALCO License Key') => {
    if (inMemoryPrivateKey && vaultStatus === 'unlocked') {
      callback?.(inMemoryPrivateKey);
      return;
    }
    setUnlockReason(reason);
    setPendingUnlockCallback(() => callback || null);
    setIsUnlockOpen(true);
  }, [inMemoryPrivateKey, vaultStatus]);

  const handleUnlockSuccess = useCallback((decryptedPrivateKey: string) => {
    setInMemoryPrivateKey(decryptedPrivateKey);
    setVaultStatus('unlocked');
    setIsUnlockOpen(false);

    if (pendingUnlockCallback) {
      pendingUnlockCallback(decryptedPrivateKey);
      setPendingUnlockCallback(null);
    }
  }, [pendingUnlockCallback]);

  const handleSetupComplete = useCallback((vault: EncryptedOwnerVault, initialPrivateKey: string) => {
    setKeyPair({
      publicKeyHex: vault.publicKeyHex,
      fingerprint: vault.fingerprint,
      createdAt: vault.createdAt
    });
    setInMemoryPrivateKey(initialPrivateKey);
    setVaultStatus('unlocked');
    setIsSetupOpen(false);
  }, []);

  const handleSaveLicense = (record: AlcoLicenseRecord) => {
    saveLicenseToHistory(record);
    setHistory(getLicenseHistory());
  };

  const handleUpdateStatus = (id: string, status: 'active' | 'revoked') => {
    updateLicenseStatus(id, status);
    setHistory(getLicenseHistory());
  };

  const handleDeleteRecord = (id: string) => {
    deleteLicenseFromHistory(id);
    setHistory(getLicenseHistory());
  };

  const handleSaveApp = (app: AlcoAppDefinition) => {
    saveCustomApp(app);
    setRegisteredApps(getRegisteredApps());
  };

  const handleDeleteApp = (appId: string) => {
    deleteCustomApp(appId);
    setRegisteredApps(getRegisteredApps());
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
            inMemoryPrivateKey={inMemoryPrivateKey}
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
            inMemoryPrivateKey={inMemoryPrivateKey}
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
