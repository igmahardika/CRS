'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Image as ImageIcon,
  Server,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Save,
  ArrowLeft,
  Activity,
  Upload,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  PageHeader,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Spinner,
} from '@/components/ui';

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

type SettingsTab = 'integrations' | 'templates' | 'defaults';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');
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
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: string }>({});

  // Password visibility toggles
  const [showMrtgPassword, setShowMrtgPassword] = useState(false);
  const [showPrtgPassword, setShowPrtgPassword] = useState(false);

  // File input refs
  const mrtgFileRef = useRef<HTMLInputElement>(null);
  const slaFileRef = useRef<HTMLInputElement>(null);
  const pageBgFileRef = useRef<HTMLInputElement>(null);

  // MRTG Test Connection
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // PRTG Test Connection
  const [testingPrtgConnection, setTestingPrtgConnection] = useState(false);
  const [prtgTestResult, setPrtgTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Cache buster for re-uploaded template images
  const [cacheBuster, setCacheBuster] = useState<number | string>('');

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/config');
        const data = await res.json();
        if (data.config) {
          setConfig((prev) => ({
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

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast.success('Configuration saved successfully.');
      } else {
        toast.error('Failed to save settings.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadTemplate = async (targetType: string, file: File) => {
    setUploadStatus((prev) => ({ ...prev, [targetType]: 'Uploading...' }));
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
        setUploadStatus((prev) => ({ ...prev, [targetType]: 'Upload successful!' }));
        setCacheBuster(Date.now());
        toast.success(`Template ${targetType} updated.`);
        setTimeout(() => {
          setUploadStatus((prev) => {
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
      setUploadStatus((prev) => ({ ...prev, [targetType]: `Failed: ${msg}` }));
      toast.error(`Upload error: ${msg}`);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const startTime = Date.now();
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
      const latency = Date.now() - startTime;

      if (res.ok && data.success) {
        setTestResult({
          type: 'success',
          message: `Connected successfully (${latency}ms) at ${config.mrtgBaseUrl}`,
        });
      } else {
        setTestResult({
          type: 'error',
          message: data.error || 'Failed to connect to MRTG / Cacti.',
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
    const startTime = Date.now();
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
      const latency = Date.now() - startTime;

      if (res.ok && data.success) {
        setPrtgTestResult({
          type: 'success',
          message: `Connected successfully (${latency}ms) at ${config.prtgBaseUrl}`,
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
      {/* Standard Page Header */}
      <PageHeader
        title="Settings"
        description="Configure telemetry server credentials, report defaults, and background canvas templates."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Sub-Navigation */}
        <div className="md:col-span-3">
          <nav className="bg-white rounded-lg border border-slate-200 p-2 shadow-xs space-y-1">
            <Button
              variant={activeTab === 'integrations' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('integrations')}
              className={`w-full justify-start h-9 px-3 gap-2 text-xs font-semibold ${
                activeTab === 'integrations'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>Integrations</span>
            </Button>

            <Button
              variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('templates')}
              className={`w-full justify-start h-9 px-3 gap-2 text-xs font-semibold ${
                activeTab === 'templates'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>Templates</span>
            </Button>

            <Button
              variant={activeTab === 'defaults' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('defaults')}
              className={`w-full justify-start h-9 px-3 gap-2 text-xs font-semibold ${
                activeTab === 'defaults'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Report Defaults</span>
            </Button>
          </nav>
        </div>

        {/* Right Content Column (Max 720px) */}
        <div className="md:col-span-9 max-w-[720px]">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
              <Spinner size="md" className="mx-auto text-[#EA580C] mb-2" />
              <span>Loading configuration...</span>
            </div>
          ) : activeTab === 'integrations' ? (
            /* ================= INTEGRATIONS TAB ================= */
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* 1. MRTG / Cacti Server */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#EA580C]" />
                    <span>MRTG / Cacti Server</span>
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Base URL</label>
                    <Input
                      required
                      value={config.mrtgBaseUrl}
                      onChange={(e) => setConfig({ ...config, mrtgBaseUrl: e.target.value })}
                      className="font-mono text-xs"
                      placeholder="http://cacti.internal.net or http://192.168.1.10/cacti"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Target endpoints: <code>/graph_image.php</code> and <code>/graph_xport.php</code>
                    </span>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Authentication Method</label>
                    <Select
                      value={config.mrtgAuthType}
                      onValueChange={(val) => setConfig({ ...config, mrtgAuthType: val })}
                    >
                      <SelectTrigger selectSize="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASIC">HTTP Basic Auth</SelectItem>
                        <SelectItem value="COOKIE">Session / Web Cookie Login (index.php)</SelectItem>
                        <SelectItem value="NONE">No Authentication (Public / Internal IP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Username (Optional)</label>
                      <Input
                        value={config.mrtgUsername}
                        onChange={(e) => setConfig({ ...config, mrtgUsername: e.target.value })}
                        className="font-mono text-xs"
                        placeholder="cacti_user"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Password (Optional)</label>
                      <div className="relative">
                        <Input
                          type={showMrtgPassword ? 'text' : 'password'}
                          value={config.mrtgPassword || ''}
                          onChange={(e) => setConfig({ ...config, mrtgPassword: e.target.value })}
                          className="font-mono text-xs pr-8"
                          placeholder="••••••••"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowMrtgPassword(!showMrtgPassword)}
                          className="absolute right-0.5 top-0.5 h-7 w-7 text-slate-400 hover:text-slate-600"
                          title={showMrtgPassword ? 'Hide password' : 'Show password'}
                        >
                          {showMrtgPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                        testResult.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {testResult.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <div className="pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleTestConnection}
                      loading={testingConnection}
                    >
                      <Server className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      <span>Test MRTG Connection</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* 2. PRTG Network Monitor Server */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <span>PRTG Network Monitor Server</span>
                  </h3>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Base URL</label>
                    <Input
                      required
                      value={config.prtgBaseUrl}
                      onChange={(e) => setConfig({ ...config, prtgBaseUrl: e.target.value })}
                      className="font-mono text-xs"
                      placeholder="https://prtg.example.com or http://10.10.x.x:8080"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Target endpoints: <code>/chart.png</code> and <code>/api/historicdata.json</code>
                    </span>
                  </div>

                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Authentication Method</label>
                    <Select
                      value={config.prtgAuthType}
                      onValueChange={(val) => setConfig({ ...config, prtgAuthType: val })}
                    >
                      <SelectTrigger selectSize="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PASSWORD">Standard Username & Password</SelectItem>
                        <SelectItem value="PASSHASH">PRTG Passhash / API Token</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">PRTG Username</label>
                      <Input
                        value={config.prtgUsername}
                        onChange={(e) => setConfig({ ...config, prtgUsername: e.target.value })}
                        className="font-mono text-xs"
                        placeholder="prtgadmin"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        {config.prtgAuthType === 'PASSHASH' ? 'PRTG Passhash' : 'PRTG Password'}
                      </label>
                      <div className="relative">
                        <Input
                          type={showPrtgPassword ? 'text' : 'password'}
                          value={config.prtgPassword || ''}
                          onChange={(e) => setConfig({ ...config, prtgPassword: e.target.value })}
                          className="font-mono text-xs pr-8"
                          placeholder="••••••••"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowPrtgPassword(!showPrtgPassword)}
                          className="absolute right-0.5 top-0.5 h-7 w-7 text-slate-400 hover:text-slate-600"
                          title={showPrtgPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPrtgPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {prtgTestResult && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                        prtgTestResult.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {prtgTestResult.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span>{prtgTestResult.message}</span>
                    </div>
                  )}

                  <div className="pt-1">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleTestPrtgConnection}
                      loading={testingPrtgConnection}
                    >
                      <Activity className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      <span>Test PRTG Connection</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Single Primary Save Button */}
              <div className="flex justify-end pt-1">
                <Button variant="primary" size="md" loading={saving} onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Save Integrations</span>
                </Button>
              </div>
            </form>
          ) : activeTab === 'templates' ? (
            /* ================= TEMPLATES TAB ================= */
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#EA580C]" />
                    <span>Report Canvas Templates</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    High-resolution A4 backgrounds (210mm x 297mm) used for rendering PDF report pages.
                  </p>
                </div>

                {/* Template Asset 1: Cover MRTG */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">MRTG Report Cover</h4>
                    <p className="text-[11px] text-slate-500">Page 1 cover background for MRTG reports</p>
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => mrtgFileRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        <span>Replace Cover</span>
                      </Button>
                      <Input
                        ref={mrtgFileRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadTemplate('cover_mrtg', e.target.files[0]);
                        }}
                      />
                      {uploadStatus['cover_mrtg'] && (
                        <div className="text-[11px] font-medium text-orange-600">
                          {uploadStatus['cover_mrtg']}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template Asset 2: Cover SLA */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">SLA Report Cover</h4>
                    <p className="text-[11px] text-slate-500">Page 1 cover background for SLA reports</p>
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => slaFileRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        <span>Replace Cover</span>
                      </Button>
                      <Input
                        ref={slaFileRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadTemplate('cover_sla', e.target.files[0]);
                        }}
                      />
                      {uploadStatus['cover_sla'] && (
                        <div className="text-[11px] font-medium text-orange-600">
                          {uploadStatus['cover_sla']}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template Asset 3: Content Background */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">Content Page Background</h4>
                    <p className="text-[11px] text-slate-500">Header watermark and footer address on report body pages</p>
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
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => pageBgFileRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                        <span>Replace Background</span>
                      </Button>
                      <Input
                        ref={pageBgFileRef}
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleUploadTemplate('page_bg', e.target.files[0]);
                        }}
                      />
                      {uploadStatus['page_bg'] && (
                        <div className="text-[11px] font-medium text-orange-600">
                          {uploadStatus['page_bg']}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= DEFAULTS TAB ================= */
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
                    <span>Global Report Defaults</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Default SLA Target (%)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.defaultTargetSla}
                      onChange={(e) =>
                        setConfig({ ...config, defaultTargetSla: parseFloat(e.target.value) || 99.5 })
                      }
                      className="font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Document Number Prefix</label>
                    <Input
                      value={config.documentNumberPrefix}
                      onChange={(e) => setConfig({ ...config, documentNumberPrefix: e.target.value })}
                      className="font-mono font-medium"
                      placeholder="IMUN.01"
                    />
                  </div>
                </div>
              </div>

              {/* Single Primary Save Button */}
              <div className="flex justify-end pt-1">
                <Button variant="primary" size="md" loading={saving} onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Save Defaults</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
