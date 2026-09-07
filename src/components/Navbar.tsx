import React from 'react';
import { 
  KeyRound, 
  History, 
  Layers, 
  ShieldCheck, 
  Settings, 
  Cpu, 
  CheckCircle2, 
  Terminal 
} from 'lucide-react';
import { OwnerKeyPair } from '../modules/types';

export type NavTab = 'generator' | 'history' | 'registry' | 'simulator' | 'settings';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  keyPair: OwnerKeyPair;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  keyPair,
  historyCount
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      {/* Top system status bar */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-950/80 border-b border-slate-850 text-xs">
        <div className="flex items-center gap-2">
          {/* Simulated desktop window controls */}
          <div className="flex items-center gap-1.5 mr-3">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span className="font-mono text-slate-400 font-semibold tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            ALCO ECOSYSTEM • ELECTRON CORE
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800 font-mono text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>OFFLINE VAULT</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800 font-mono text-[11px] text-indigo-300">
            <Cpu className="w-3 h-3 text-indigo-400" />
            <span>Ed25519: {keyPair.fingerprint || 'ACTIVE'}</span>
          </div>
        </div>
      </div>

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-950 border border-indigo-400/30">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white font-sans">
                ALCO License Generator
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                OWNER EDITION
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Aladzan Corpora Ecosystem Cryptographic License Authority
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800/80 gap-1 text-xs">
          <button
            id="nav-tab-generator"
            onClick={() => onTabChange('generator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium transition-all ${
              activeTab === 'generator'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Generator</span>
          </button>

          <button
            id="nav-tab-history"
            onClick={() => onTabChange('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>License History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                {historyCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-registry"
            onClick={() => onTabChange('registry')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium transition-all ${
              activeTab === 'registry'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>App Registry</span>
          </button>

          <button
            id="nav-tab-simulator"
            onClick={() => onTabChange('simulator')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium transition-all ${
              activeTab === 'simulator'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Client Simulator</span>
          </button>

          <button
            id="nav-tab-settings"
            onClick={() => onTabChange('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings & Vault</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
