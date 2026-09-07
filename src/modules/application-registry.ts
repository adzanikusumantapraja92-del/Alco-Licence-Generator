/**
 * ALCO Application Registry Module
 * 
 * Manages registered applications in the ALCO Ecosystem.
 * Allows owner to register new ALCO apps without modifying core licensing logic.
 */

import { AlcoAppDefinition } from './types';

export const DEFAULT_ALCO_APPS: AlcoAppDefinition[] = [
  {
    id: 'alco-content-engine',
    name: 'ALCO Content Engine',
    description: 'AI-driven content generation, copywriting pipeline, and multi-channel publication engine.',
    category: 'content',
    iconName: 'FileText',
    availablePlans: ['starter', 'pro', 'enterprise'],
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    features: [
      { id: 'ai_scripting', label: 'AI Scripting Studio', description: 'Long-form script synthesis and hooks', plans: ['starter', 'pro', 'enterprise'] },
      { id: 'bulk_export', label: 'Bulk Batch Export', description: 'Export hundreds of copies to CSV/JSON', plans: ['pro', 'enterprise'] },
      { id: 'seo_optimizer', label: 'SEO & Algorithmic Scoring', description: 'Live SEO density and read time analyzer', plans: ['pro', 'enterprise'] },
      { id: 'multi_brand', label: 'Multi-Brand Workspaces', description: 'Unlimited brand tone voices and profiles', plans: ['enterprise'] },
      { id: 'api_webhooks', label: 'Local API Webhooks', description: 'Desktop webhook triggers for local automation', plans: ['enterprise'] }
    ]
  },
  {
    id: 'alco-creative-system',
    name: 'ALCO Creative System',
    description: 'Automated graphic creation, smart layer manipulation, and high-volume visual asset rendering.',
    category: 'creative',
    iconName: 'Palette',
    availablePlans: ['starter', 'pro', 'enterprise'],
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    features: [
      { id: 'smart_templates', label: 'Smart PSD & Vector Engine', description: 'Dynamic layer replacement with smart data', plans: ['starter', 'pro', 'enterprise'] },
      { id: 'batch_rendering', label: 'Batch Asset Pipeline', description: 'High-speed parallel image generation', plans: ['pro', 'enterprise'] },
      { id: 'font_manager', label: 'Typography Vault', description: 'Auto font licensing and glyph verification', plans: ['pro', 'enterprise'] },
      { id: '4k_export', label: 'Ultra HD 4K/8K Output', description: 'Lossless graphic rendering engine', plans: ['enterprise'] },
      { id: 'design_tokens', label: 'Design Token Sync', description: 'Figma and ALCO design token sync', plans: ['enterprise'] }
    ]
  },
  {
    id: 'alco-auto-motion',
    name: 'ALCO Auto Motion',
    description: 'Timeline automation, kinetic typography, audio-reactive visualizer, and auto video captions.',
    category: 'motion',
    iconName: 'Video',
    availablePlans: ['starter', 'pro', 'enterprise'],
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    features: [
      { id: 'motion_presets', label: 'Core Motion Presets', description: '60+ smooth ease-in kinetic typography presets', plans: ['starter', 'pro', 'enterprise'] },
      { id: 'auto_subtitles', label: 'Auto Subtitle Transcriber', description: 'Offline Whisper AI speech-to-caption engine', plans: ['pro', 'enterprise'] },
      { id: 'audio_reactive', label: 'Audio-Reactive FX', description: 'BPM sync and audio frequency visualizers', plans: ['pro', 'enterprise'] },
      { id: 'gpu_acceleration', label: 'NVENC GPU Hardware Acceleration', description: 'Blazing-fast video timeline rendering', plans: ['enterprise'] },
      { id: 'codec_pro', label: 'ProRes & Alpha Channel Support', description: 'Lossless transparency video export', plans: ['enterprise'] }
    ]
  },
  {
    id: 'alco-meta-ads-analyst',
    name: 'ALCO Meta Ads Analyst',
    description: 'Desktop ad intelligence, creative fatigue telemetry, ROAS predictive modeling, and budget rebalancer.',
    category: 'marketing',
    iconName: 'TrendingUp',
    availablePlans: ['starter', 'pro', 'enterprise'],
    isSystem: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    features: [
      { id: 'roas_tracker', label: 'Real-time ROAS & CPA Audit', description: 'Hourly campaign performance tracking', plans: ['starter', 'pro', 'enterprise'] },
      { id: 'fatigue_detection', label: 'Creative Fatigue Radar', description: 'Frequency and CTR degradation alerts', plans: ['pro', 'enterprise'] },
      { id: 'budget_rebalancer', label: 'Algorithmic Budget Rebalancer', description: 'Auto-suggestions for budget reallocation', plans: ['enterprise'] },
      { id: 'creative_audit', label: 'Ad Copy & Angle Deconstruction', description: 'Dissects winning ad hooks and angles', plans: ['pro', 'enterprise'] },
      { id: 'webhook_alerts', label: 'Telegram/Discord Alert Dispatcher', description: 'Local notification bot for urgent threshold alerts', plans: ['enterprise'] }
    ]
  }
];

const STORAGE_KEY_CUSTOM_APPS = 'alco_custom_apps_registry_v1';

export function getRegisteredApps(): AlcoAppDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_APPS);
    if (!raw) return DEFAULT_ALCO_APPS;
    const customApps: AlcoAppDefinition[] = JSON.parse(raw);
    
    // Combine defaults and custom apps
    const map = new Map<string, AlcoAppDefinition>();
    DEFAULT_ALCO_APPS.forEach(app => map.set(app.id, app));
    customApps.forEach(app => map.set(app.id, app));
    
    return Array.from(map.values());
  } catch {
    return DEFAULT_ALCO_APPS;
  }
}

export function saveCustomApp(app: AlcoAppDefinition): void {
  const current = getRegisteredApps();
  const existingIdx = current.findIndex(a => a.id === app.id);
  
  let updated: AlcoAppDefinition[];
  if (existingIdx >= 0) {
    updated = current.map((a, i) => i === existingIdx ? app : a);
  } else {
    updated = [...current, app];
  }

  // Filter out pure defaults from custom storage, or save customized overrides
  const customOnly = updated.filter(a => !a.isSystem || a.id !== DEFAULT_ALCO_APPS.find(d => d.id === a.id)?.id);
  localStorage.setItem(STORAGE_KEY_CUSTOM_APPS, JSON.stringify(updated.filter(a => !a.isSystem)));
}

export function deleteCustomApp(appId: string): boolean {
  const isDefault = DEFAULT_ALCO_APPS.some(d => d.id === appId);
  if (isDefault) {
    return false; // Cannot delete default core ecosystem apps
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_APPS);
    if (!raw) return true;
    const customApps: AlcoAppDefinition[] = JSON.parse(raw);
    const filtered = customApps.filter(a => a.id !== appId);
    localStorage.setItem(STORAGE_KEY_CUSTOM_APPS, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function findAppById(appId: string): AlcoAppDefinition | undefined {
  const apps = getRegisteredApps();
  return apps.find(a => a.id.toLowerCase() === appId.trim().toLowerCase());
}
