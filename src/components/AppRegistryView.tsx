import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Check, 
  Trash2, 
  ShieldCheck, 
  FileText, 
  Palette, 
  Video, 
  TrendingUp, 
  Sliders, 
  X, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { AlcoAppDefinition, AlcoPlan } from '../modules/types';

interface AppRegistryViewProps {
  registeredApps: AlcoAppDefinition[];
  onSaveApp: (app: AlcoAppDefinition) => void;
  onDeleteApp: (appId: string) => void;
}

export const AppRegistryView: React.FC<AppRegistryViewProps> = ({
  registeredApps,
  onSaveApp,
  onDeleteApp
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingApp, setEditingApp] = useState<AlcoAppDefinition | null>(null);

  // Modal Form States
  const [appId, setAppId] = useState<string>('');
  const [appName, setAppName] = useState<string>('');
  const [appDescription, setAppDescription] = useState<string>('');
  const [appCategory, setAppCategory] = useState<'content' | 'creative' | 'motion' | 'marketing' | 'analytics' | 'utility'>('utility');
  const [appPlans, setAppPlans] = useState<AlcoPlan[]>(['starter', 'pro', 'enterprise']);
  
  // Custom features builder
  const [featuresList, setFeaturesList] = useState<{ id: string; label: string; description: string; plans: AlcoPlan[] }[]>([
    { id: 'core_access', label: 'Core Engine Access', description: 'Basic application runtime access', plans: ['starter', 'pro', 'enterprise'] }
  ]);
  const [newFeatureId, setNewFeatureId] = useState<string>('');
  const [newFeatureLabel, setNewFeatureLabel] = useState<string>('');
  const [newFeatureDesc, setNewFeatureDesc] = useState<string>('');

  const [formError, setFormError] = useState<string | null>(null);

  const openNewAppModal = () => {
    setEditingApp(null);
    setAppId('alco-');
    setAppName('');
    setAppDescription('');
    setAppCategory('utility');
    setAppPlans(['starter', 'pro', 'enterprise']);
    setFeaturesList([
      { id: 'core_access', label: 'Core Engine Access', description: 'Basic application runtime access', plans: ['starter', 'pro', 'enterprise'] }
    ]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddFeature = () => {
    const cleanId = newFeatureId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
    if (!cleanId || !newFeatureLabel.trim()) {
      alert('Feature ID and Label are required');
      return;
    }
    if (featuresList.some(f => f.id === cleanId)) {
      alert('Feature ID already exists for this app');
      return;
    }

    setFeaturesList(prev => [
      ...prev,
      {
        id: cleanId,
        label: newFeatureLabel.trim(),
        description: newFeatureDesc.trim() || newFeatureLabel.trim(),
        plans: ['pro', 'enterprise']
      }
    ]);
    setNewFeatureId('');
    setNewFeatureLabel('');
    setNewFeatureDesc('');
  };

  const handleRemoveFeature = (id: string) => {
    setFeaturesList(prev => prev.filter(f => f.id !== id));
  };

  const handleSaveApp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = appId.trim().toLowerCase().replace(/\s+/g, '-');
    
    if (!cleanId || cleanId === 'alco-') {
      setFormError('Valid App ID is required (e.g. alco-audio-synth)');
      return;
    }
    if (!appName.trim()) {
      setFormError('Application name is required');
      return;
    }

    // Check collision if new app
    if (!editingApp && registeredApps.some(a => a.id.toLowerCase() === cleanId)) {
      setFormError(`App with ID "${cleanId}" is already registered`);
      return;
    }

    const newApp: AlcoAppDefinition = {
      id: cleanId,
      name: appName.trim(),
      description: appDescription.trim() || 'Custom registered ALCO application.',
      category: appCategory,
      iconName: 'Layers',
      availablePlans: appPlans,
      features: featuresList,
      isSystem: false,
      createdAt: new Date().toISOString()
    };

    onSaveApp(newApp);
    setIsModalOpen(false);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'content': return <FileText className="w-4 h-4 text-sky-400" />;
      case 'creative': return <Palette className="w-4 h-4 text-purple-400" />;
      case 'motion': return <Video className="w-4 h-4 text-emerald-400" />;
      case 'marketing': return <TrendingUp className="w-4 h-4 text-amber-400" />;
      default: return <Sliders className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>ALCO Application Registry</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Register new ALCO apps dynamically. The core licensing and Ed25519 signature engine automatically adapts to all registered applications.
          </p>
        </div>

        <button
          id="btn-register-new-app"
          onClick={openNewAppModal}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register New ALCO App</span>
        </button>
      </div>

      {/* Grid of registered apps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {registeredApps.map(app => (
          <div 
            key={app.id} 
            className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  {getCategoryIcon(app.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">{app.name}</h3>
                    {app.isSystem ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        Core ALCO
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        Custom App
                      </span>
                    )}
                  </div>
                  <code className="text-xs text-indigo-400 font-mono block mt-0.5">
                    {app.id}
                  </code>
                </div>
              </div>

              {!app.isSystem && (
                <button
                  title="Delete Custom Application"
                  onClick={() => {
                    if (confirm(`Remove "${app.name}" (${app.id}) from registry?`)) {
                      onDeleteApp(app.id);
                    }
                  }}
                  className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {app.description}
            </p>

            {/* Features list */}
            <div className="pt-2 border-t border-slate-850">
              <span className="text-[11px] font-medium text-slate-400 block mb-2">
                Registered Entitlements & Features ({app.features.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {app.features.map(f => (
                  <span 
                    key={f.id} 
                    title={f.description}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-300 border border-slate-800"
                  >
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Plans */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Supported Plans:</span>
              <div className="flex gap-1.5">
                {app.availablePlans.map(p => (
                  <span key={p} className="uppercase font-semibold text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Register New App Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Register New ALCO Application</h3>
                <p className="text-xs text-slate-400">Expand the ecosystem without changing system core logic</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveApp} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    App ID (Unique Slug) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    placeholder="alco-super-agent"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-indigo-300 font-mono focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">e.g. alco-video-pipeline</span>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">
                    Application Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="ALCO Super Agent"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  placeholder="Describe the application's role in the ALCO ecosystem..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Category</label>
                <select
                  value={appCategory}
                  onChange={(e: any) => setAppCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="content">Content & Copywriting</option>
                  <option value="creative">Creative & Design</option>
                  <option value="motion">Video & Motion</option>
                  <option value="marketing">Marketing & Ads</option>
                  <option value="analytics">Analytics & Telemetry</option>
                  <option value="utility">Utility & Productivity</option>
                </select>
              </div>

              {/* Feature flags builder */}
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="block font-medium text-slate-300">
                  Feature Flags / Entitlements ({featuresList.length}):
                </span>
                
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {featuresList.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-200">{f.label}</span>
                        <code className="ml-2 text-indigo-400 font-mono text-[10px]">({f.id})</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(f.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="id (e.g. export_4k)"
                    value={newFeatureId}
                    onChange={(e) => setNewFeatureId(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-indigo-300 font-mono text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Label (e.g. 4K Video Export)"
                    value={newFeatureLabel}
                    onChange={(e) => setNewFeatureLabel(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-200 text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium"
                  >
                    + Add Feature
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-sm"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
