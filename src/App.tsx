/**
 * ALCO License Generator
 * Aladzan Corpora Ecosystem - Owner Licensing Authority
 */

import React, { useState, useEffect } from 'react';
import { Navbar, NavTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LicenseHistoryView } from './components/LicenseHistoryView';
import { AppRegistryView } from './components/AppRegistryView';
import { VerifierSimulatorView } from './components/VerifierSimulatorView';
import { SettingsView } from './components/SettingsView';

import { 
  OwnerKeyPair, 
  AlcoLicenseRecord, 
  AlcoAppDefinition 
} from './modules/types';
import { 
  getOrCreateOwnerKeyPair, 
  getLicenseHistory, 
  saveLicenseToHistory, 
  updateLicenseStatus, 
  deleteLicenseFromHistory 
} from './modules/storage';
import { 
  getRegisteredApps, 
  saveCustomApp, 
  deleteCustomApp 
} from './modules/application-registry';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('generator');
  
  // Storage states
  const [keyPair, setKeyPair] = useState<OwnerKeyPair>(() => getOrCreateOwnerKeyPair());
  const [registeredApps, setRegisteredApps] = useState<AlcoAppDefinition[]>(() => getRegisteredApps());
  const [history, setHistory] = useState<AlcoLicenseRecord[]>(() => getLicenseHistory());

  // Simulator jump state
  const [simulatorPrefill, setSimulatorPrefill] = useState<{
    licenseKey: string;
    appId: string;
    deviceId: string;
  } | null>(null);

  const refreshAllData = () => {
    setKeyPair(getOrCreateOwnerKeyPair());
    setRegisteredApps(getRegisteredApps());
    setHistory(getLicenseHistory());
  };

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
      />

      <main className="flex-1 pb-16">
        {activeTab === 'generator' && (
          <DashboardView
            keyPair={keyPair}
            registeredApps={registeredApps}
            onSaveLicense={handleSaveLicense}
            onNavigateToSimulator={handleNavigateToSimulator}
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
            onKeyPairUpdated={(newPair) => setKeyPair(newPair)}
            onRefreshData={refreshAllData}
          />
        )}
      </main>

      {/* Persistent footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-4 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">ALCO License Authority</span>
          <span>•</span>
          <span>Offline Cryptographic Licensing Core</span>
          <span>•</span>
          <span>Ed25519 Standalone</span>
        </div>
        <div>
          <span>Aladzan Corpora Ecosystem (ALCO) &copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
