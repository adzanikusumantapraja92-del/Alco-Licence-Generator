import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Copy, 
  Check, 
  Trash2, 
  Download, 
  ShieldAlert, 
  ShieldCheck, 
  Calendar, 
  ExternalLink, 
  ChevronRight, 
  X, 
  Layers 
} from 'lucide-react';
import { AlcoLicenseRecord, AlcoAppDefinition } from '../modules/types';

interface LicenseHistoryViewProps {
  history: AlcoLicenseRecord[];
  registeredApps: AlcoAppDefinition[];
  onUpdateStatus: (id: string, status: 'active' | 'revoked') => void;
  onDeleteRecord: (id: string) => void;
  onNavigateToSimulator: (licenseKey: string, appId: string, deviceId: string) => void;
}

export const LicenseHistoryView: React.FC<LicenseHistoryViewProps> = ({
  history,
  registeredApps,
  onUpdateStatus,
  onDeleteRecord,
  onNavigateToSimulator
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterApp, setFilterApp] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<AlcoLicenseRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter records
  const filteredRecords = history.filter(item => {
    const matchesSearch = 
      item.payload.licenseId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.payload.customerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.payload.customerName && item.payload.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.payload.deviceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.payload.appId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesApp = filterApp === 'all' || item.payload.appId === filterApp;
    const matchesPlan = filterPlan === 'all' || item.payload.plan === filterPlan;

    return matchesSearch && matchesApp && matchesPlan;
  });

  const handleCopyKey = (licenseKey: string, id: string) => {
    navigator.clipboard.writeText(licenseKey);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export history to JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `alco-license-history-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export history to CSV
  const handleExportCsv = () => {
    if (history.length === 0) return;
    const headers = ['License ID', 'App ID', 'Customer ID', 'Customer Name', 'Plan', 'Type', 'Issued At', 'Expires At', 'Status', 'License Key'];
    const rows = history.map(h => [
      `"${h.payload.licenseId}"`,
      `"${h.payload.appId}"`,
      `"${h.payload.customerId}"`,
      `"${h.payload.customerName || ''}"`,
      `"${h.payload.plan}"`,
      `"${h.payload.licenseType}"`,
      `"${h.payload.issuedAt}"`,
      `"${h.payload.expiresAt || 'Lifetime'}"`,
      `"${h.status}"`,
      `"${h.licenseKey}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodeURI(csvContent));
    downloadAnchor.setAttribute('download', `alco-license-history-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Generated License History</span>
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Audit trail of all cryptographic licenses issued by this ALCO Authority ({history.length} records).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={history.length === 0}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJson}
            disabled={history.length === 0}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by license ID, customer ID, device ID, or app..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterApp}
            onChange={(e) => setFilterApp(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Applications</option>
            {registeredApps.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>

          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Plans</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Table / List */}
      {filteredRecords.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-12 text-center">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-300">No License Records Found</p>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || filterApp !== 'all' || filterPlan !== 'all'
              ? 'Try clearing your search or filters.'
              : 'Generate your first license in the Generator tab.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono text-[11px]">
                <tr>
                  <th className="py-3 px-4">License ID</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Plan & Type</th>
                  <th className="py-3 px-4">Expiration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRecords.map(record => {
                  const isLifetime = record.payload.licenseType === 'lifetime';
                  const isExpired = !isLifetime && record.payload.expiresAt && new Date(record.payload.expiresAt).getTime() < Date.now();

                  return (
                    <tr key={record.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4 font-mono font-semibold text-indigo-300">
                        {record.payload.licenseId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-white block">
                          {record.payload.metadata?.appName || record.payload.appId}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {record.payload.appId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-slate-200 block">{record.payload.customerId}</span>
                        {record.payload.customerName && (
                          <span className="text-[10px] text-slate-400 block">{record.payload.customerName}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200 border border-slate-700 mr-1.5">
                          {record.payload.plan}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({record.payload.features.length} features)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {isLifetime ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                            Lifetime
                          </span>
                        ) : (
                          <span className={isExpired ? 'text-rose-400' : 'text-slate-300'}>
                            {record.payload.expiresAt?.split('T')[0]}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {record.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-rose-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Revoked
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            title="Copy License Key"
                            onClick={() => handleCopyKey(record.licenseKey, record.id)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          >
                            {copiedId === record.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            title="View Payload Details"
                            onClick={() => setSelectedRecord(record)}
                            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Delete from history"
                            onClick={() => {
                              if (confirm(`Delete license record ${record.payload.licenseId}?`)) {
                                onDeleteRecord(record.id);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">License Record Inspection</h3>
                <p className="text-xs text-slate-400 font-mono">{selectedRecord.payload.licenseId}</p>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950 p-4 rounded-lg border border-slate-850 font-mono">
              <div>
                <span className="text-slate-500 block">App ID:</span>
                <span className="text-white font-semibold">{selectedRecord.payload.appId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Locked Device ID:</span>
                <span className="text-indigo-300 font-semibold">{selectedRecord.payload.deviceId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Customer ID:</span>
                <span className="text-white">{selectedRecord.payload.customerId}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Plan:</span>
                <span className="text-emerald-400 uppercase font-bold">{selectedRecord.payload.plan}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Issued Timestamp:</span>
                <span className="text-slate-300">{new Date(selectedRecord.payload.issuedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Expiration:</span>
                <span className="text-amber-300">
                  {selectedRecord.payload.expiresAt ? new Date(selectedRecord.payload.expiresAt).toLocaleString() : 'Lifetime'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-300 block mb-1">
                Active Feature Flags ({selectedRecord.payload.features.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedRecord.payload.features.map(f => (
                  <span key={f} className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-300 block mb-1">Raw License Key:</span>
              <textarea
                readOnly
                rows={3}
                value={selectedRecord.licenseKey}
                className="w-full p-2.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 text-[11px] font-mono break-all focus:outline-none select-all"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  const newStatus = selectedRecord.status === 'active' ? 'revoked' : 'active';
                  onUpdateStatus(selectedRecord.id, newStatus);
                  setSelectedRecord({ ...selectedRecord, status: newStatus });
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium border ${
                  selectedRecord.status === 'active'
                    ? 'border-rose-800 bg-rose-950/40 text-rose-300 hover:bg-rose-950'
                    : 'border-emerald-800 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-950'
                }`}
              >
                {selectedRecord.status === 'active' ? 'Mark as Revoked' : 'Mark as Active'}
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onNavigateToSimulator(
                      selectedRecord.licenseKey,
                      selectedRecord.payload.appId,
                      selectedRecord.payload.deviceId
                    );
                    setSelectedRecord(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Test in Simulator</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedRecord.licenseKey);
                    alert('License key copied to clipboard');
                  }}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Key</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
