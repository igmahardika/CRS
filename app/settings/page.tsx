'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Upload,
  Image as ImageIcon,
  Server,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Save,
  RotateCcw,
  Layers,
  ArrowLeft,
  KeyRound,
  FileCode,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

interface AppConfigState {
  mrtgBaseUrl: string;
  mrtgUsername: string;
  mrtgPassword?: string;
  mrtgAuthType: string;
  prtgBaseUrl: string;
  prtgUsername: string;
  prtgPassword?: string;
  prtgAuthType: string;
  coverMrtgPath: string;
  coverSlaPath: string;
  pageBgPath: string;
  defaultTargetSla: number;
  documentNumberPrefix: string;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfigState>({
    mrtgBaseUrl: 'http://cacti.internal.net',
    mrtgUsername: '',
    mrtgPassword: '',
    mrtgAuthType: 'BASIC',
    prtgBaseUrl: 'http://prtg.internal.net',
    prtgUsername: '',
    prtgPassword: '',
    prtgAuthType: 'PASSWORD',
    coverMrtgPath: '/assets/templates/cover_mrtg.png',
    coverSlaPath: '/assets/templates/cover_sla.png',
    pageBgPath: '/assets/templates/page_bg.png',
    defaultTargetSla: 99.5,
    documentNumberPrefix: 'IMUN.01',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: string }>({});

  // MRTG Test Connection
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // PRTG Test Connection
  const [testingPrtgConnection, setTestingPrtgConnection] = useState(false);
  const [prtgTestResult, setPrtgTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Timestamps to bypass browser caching when templates are re-uploaded
  const [cacheBuster, setCacheBuster] = useState<number | string>('');

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.config) {
          setConfig(prev => ({
            ...prev,
            ...data.config,
            prtgBaseUrl: data.config.prtgBaseUrl || 'http://prtg.internal.net',
            prtgAuthType: data.config.prtgAuthType || 'PASSWORD',
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadTemplate = async (targetType: string, file: File) => {
    setUploadStatus(prev => ({ ...prev, [targetType]: 'Uploading...' }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('targetType', targetType);

      const res = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadStatus(prev => ({ ...prev, [targetType]: 'Upload successful!' }));
        setCacheBuster(Date.now());
        setTimeout(() => {
          setUploadStatus(prev => {
            const next = { ...prev };
            delete next[targetType];
            return next;
          });
        }, 3000);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadStatus(prev => ({ ...prev, [targetType]: `Failed: ${msg}` }));
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/cacti/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphId: '2180',
          month: 10,
          year: 2026,
          configOverride: config,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setTestResult({
          type: 'success',
          message: `Connection successful! Reached MRTG/Cacti at ${config.mrtgBaseUrl}.`,
        });
      } else {
        setTestResult({
          type: 'error',
          message: data.error || 'Failed to connect to MRTG/Cacti.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        type: 'error',
        message: `Connection error: ${msg}`,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleTestPrtgConnection = async () => {
    setTestingPrtgConnection(true);
    setPrtgTestResult(null);
    try {
      const res = await fetch('/api/prtg/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensorId: '1',
          month: 10,
          year: 2026,
          configOverride: config,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setPrtgTestResult({
          type: 'success',
          message: `Connection successful! Reached PRTG Network Monitor at ${config.prtgBaseUrl}.`,
        });
      } else {
        setPrtgTestResult({
          type: 'error',
          message: data.error || 'Failed to connect to PRTG Network Monitor.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPrtgTestResult({
        type: 'error',
        message: `PRTG connection error: ${msg}`,
      });
    } finally {
      setTestingPrtgConnection(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Generator</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-orange-500" />
            <span>System Settings & Templates</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure MRTG/Cacti & PRTG server credentials, default metrics, and report background assets.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT COLUMN: TEMPLATE ASSETS ================= */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <span>Report Canvas Templates (PNG/JPG)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">A4 High-Res</span>
            </div>

            <p className="text-xs text-slate-500">
              Upload high-resolution A4 background assets (full cover pages, headers, watermarks, and footer addresses).
            </p>

            {/* Template Asset 1: Cover MRTG */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">1. MRTG Report Cover</h4>
                  <p className="text-[11px] text-slate-500">Used as Page 1 Cover background for MRTG reports (210mm x 297mm)</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-700 font-mono rounded font-semibold">
                  cover_mrtg.png
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-22 bg-slate-200 border border-slate-300 rounded shadow-xs overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/assets/templates/cover_mrtg.png?t=${cacheBuster}`}
                    alt="Cover MRTG Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Replace MRTG Cover</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadTemplate('cover_mrtg', e.target.files[0]);
                      }}
                    />
                  </label>
                  {uploadStatus['cover_mrtg'] && (
                    <div className="text-[11px] font-semibold text-orange-600">
                      {uploadStatus['cover_mrtg']}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Template Asset 2: Cover SLA */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">2. SLA Report Cover</h4>
                  <p className="text-[11px] text-slate-500">Used as Page 1 Cover background for SLA reports (210mm x 297mm)</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 font-mono rounded font-semibold">
                  cover_sla.png
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-22 bg-slate-200 border border-slate-300 rounded shadow-xs overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/assets/templates/cover_sla.png?t=${cacheBuster}`}
                    alt="Cover SLA Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Replace SLA Cover</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadTemplate('cover_sla', e.target.files[0]);
                      }}
                    />
                  </label>
                  {uploadStatus['cover_sla'] && (
                    <div className="text-[11px] font-semibold text-orange-600">
                      {uploadStatus['cover_sla']}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Template Asset 3: Background Isi (page_bg) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-xs text-slate-900">3. Content Page Background (Header & Footer)</h4>
                  <p className="text-[11px] text-slate-500">Includes top company header, center watermark, and bottom footer address</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 bg-slate-200 text-slate-800 font-mono rounded font-semibold">
                  page_bg.png
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-22 bg-slate-200 border border-slate-300 rounded shadow-xs overflow-hidden shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/assets/templates/page_bg.png?t=${cacheBuster}`}
                    alt="Page Background Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Replace Content Background</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleUploadTemplate('page_bg', e.target.files[0]);
                      }}
                    />
                  </label>
                  {uploadStatus['page_bg'] && (
                    <div className="text-[11px] font-semibold text-orange-600">
                      {uploadStatus['page_bg']}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: SERVER CONFIGS ================= */}
        <div className="lg:col-span-6 space-y-5">
          <form onSubmit={handleSaveConfig} className="space-y-5">
            {/* 1. MRTG / Cacti Server Configuration */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Server className="w-4 h-4 text-orange-500" />
                  <span>1. MRTG / Cacti Server</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">Cacti API</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    MRTG / Cacti Base URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.mrtgBaseUrl}
                    onChange={(e) => setConfig({ ...config, mrtgBaseUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    placeholder="http://cacti.internal.net or http://192.168.1.10/cacti"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Target endpoints: <code>/graph_image.php</code> and <code>/graph_xport.php</code>
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Authentication Method</label>
                  <select
                    value={config.mrtgAuthType}
                    onChange={(e) => setConfig({ ...config, mrtgAuthType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="BASIC">HTTP Basic Auth</option>
                    <option value="COOKIE">Session / Web Cookie Login (index.php)</option>
                    <option value="NONE">No Authentication (Public / Internal IP)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Username (Optional)</label>
                    <input
                      type="text"
                      value={config.mrtgUsername}
                      onChange={(e) => setConfig({ ...config, mrtgUsername: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="cacti_user"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Password (Optional)</label>
                    <input
                      type="password"
                      value={config.mrtgPassword || ''}
                      onChange={(e) => setConfig({ ...config, mrtgPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* MRTG Test Result */}
                {testResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 ${testResult.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                  >
                    {testResult.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5 text-orange-600" />
                    <span>{testingConnection ? 'Testing...' : 'Test MRTG Connection'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. PRTG Network Monitor Server Configuration */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span>2. PRTG Network Monitor Server</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">PRTG API</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    PRTG Base URL *
                  </label>
                  <input
                    type="text"
                    required
                    value={config.prtgBaseUrl}
                    onChange={(e) => setConfig({ ...config, prtgBaseUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    placeholder="https://prtg.example.com or http://10.10.x.x:8080"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Target endpoints: <code>/chart.png</code> and <code>/api/historicdata.json</code>
                  </span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Authentication Method</label>
                  <select
                    value={config.prtgAuthType}
                    onChange={(e) => setConfig({ ...config, prtgAuthType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="PASSWORD">Standard Username & Password</option>
                    <option value="PASSHASH">PRTG Passhash / API Token</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">PRTG Username</label>
                    <input
                      type="text"
                      value={config.prtgUsername}
                      onChange={(e) => setConfig({ ...config, prtgUsername: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="prtgadmin"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {config.prtgAuthType === 'PASSHASH' ? 'PRTG Passhash' : 'PRTG Password'}
                    </label>
                    <input
                      type="password"
                      value={config.prtgPassword || ''}
                      onChange={(e) => setConfig({ ...config, prtgPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* PRTG Test Result */}
                {prtgTestResult && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-start gap-2 ${prtgTestResult.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                  >
                    {prtgTestResult.type === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span>{prtgTestResult.message}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTestPrtgConnection}
                    disabled={testingPrtgConnection}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Activity className="w-3.5 h-3.5 text-blue-600" />
                    <span>{testingPrtgConnection ? 'Testing...' : 'Test PRTG Connection'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3. Global Report Parameters & Action */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-orange-500" />
                  <span>3. Global Report Defaults</span>
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Default SLA Target (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.defaultTargetSla}
                    onChange={(e) => setConfig({ ...config, defaultTargetSla: parseFloat(e.target.value) || 99.5 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Document Number Prefix</label>
                  <input
                    type="text"
                    value={config.documentNumberPrefix}
                    onChange={(e) => setConfig({ ...config, documentNumberPrefix: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    placeholder="IMUN.01"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">Persisted in SQLite database</span>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
                </button>
              </div>

              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>MRTG, PRTG, and template settings saved successfully!</span>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
