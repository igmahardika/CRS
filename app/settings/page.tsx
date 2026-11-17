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
  Send,
  Mail,
  Bell,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  PageHeader,
  Button,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Spinner,
  InfoTooltip,
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
  prtgBasicUsername?: string;
  prtgBasicPassword?: string;
  coverMrtgPath: string;
  coverSlaPath: string;
  pageBgPath: string;
  defaultTargetSla: number;
  documentNumberPrefix: string;
  telegramBotToken: string;
  telegramChatId: string;
  telegramThreadId: string;
  telegramNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword?: string;
  smtpFromEmail: string;
  smtpFromName: string;
  emailDeptSales: string;
  emailDeptCe: string;
  emailDeptFinance: string;
  emailDeptHelpdesk: string;
  emailTemplateRequestReceived?: string;
  emailTemplateApprovalNeeded?: string;
  emailTemplateReportApproved?: string;
  telegramTemplateRequestReceived?: string;
  telegramTemplateApprovalNeeded?: string;
}

type SettingsTab = 'integrations' | 'notifications' | 'templates' | 'defaults';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('integrations');
  const [config, setConfig] = useState<AppConfigState>({
    mrtgBaseUrl: 'https://mrtg.nexa.net.id',
    mrtgUsername: '',
    mrtgPassword: '',
    mrtgAuthType: 'BASIC',
    prtgBaseUrl: 'http://nms.nexa.net.id',
    prtgUsername: '',
    prtgPassword: '',
    prtgAuthType: 'PASSWORD',
    prtgBasicUsername: '',
    prtgBasicPassword: '',
    coverMrtgPath: '/assets/templates/cover_mrtg.png',
    coverSlaPath: '/assets/templates/cover_sla.png',
    pageBgPath: '/assets/templates/page_bg.png',
    defaultTargetSla: 99.5,
    documentNumberPrefix: 'IMUN.01',
    telegramBotToken: '',
    telegramChatId: '',
    telegramThreadId: '',
    telegramNotificationsEnabled: false,
    emailNotificationsEnabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    smtpFromEmail: 'noreply-reports@nexa.net.id',
    smtpFromName: 'Nexa Customer Reporting System',
    emailDeptSales: 'sls@nexa.net.id',
    emailDeptCe: 'cxe@nexa.net.id',
    emailDeptFinance: 'finc@nexa.net.id',
    emailDeptHelpdesk: 'helpdesk@nexa.net.id',
    emailTemplateRequestReceived: '',
    emailTemplateApprovalNeeded: '',
    emailTemplateReportApproved: '',
    telegramTemplateRequestReceived: '',
    telegramTemplateApprovalNeeded: '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ [key: string]: string }>({});

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

  // Telegram Test Connection
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Email Test Connection
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailTarget, setTestEmailTarget] = useState('');
  const [emailTestResult, setEmailTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
            smtpPort: data.config.smtpPort || 587,
            smtpFromEmail: data.config.smtpFromEmail || 'noreply-reports@nexa.net.id',
            smtpFromName: data.config.smtpFromName || 'Nexa Customer Reporting System',
            emailDeptSales: data.config.emailDeptSales || 'sls@nexa.net.id',
            emailDeptCe: data.config.emailDeptCe || 'cxe@nexa.net.id',
            emailDeptFinance: data.config.emailDeptFinance || 'finc@nexa.net.id',
            emailDeptHelpdesk: data.config.emailDeptHelpdesk || 'helpdesk@nexa.net.id',
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
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig((prev) => ({ ...prev, ...data.config }));
        toast.success('System settings saved successfully.');
      } else {
        toast.error(data.error || 'Failed to save configuration.');
      }
    } catch {
      toast.error('Network error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadTemplate = async (templateKey: 'cover_mrtg' | 'cover_sla' | 'page_bg', file: File) => {
    if (!file) return;
    setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Uploading...' }));

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', templateKey);

    try {
      const res = await fetch('/api/upload-template', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Uploaded successfully!' }));
        setCacheBuster(Date.now());
        toast.success(`Template ${templateKey} updated successfully.`);
      } else {
        setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Upload failed' }));
        toast.error(data.error || 'Failed to upload template.');
      }
    } catch {
      setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Network error' }));
      toast.error('Failed to upload template.');
    }
  };

  const handleTestMrtgConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/cacti/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          graphId: '2',
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
          message: `Connected successfully (${latency}ms) to ${config.mrtgBaseUrl}`,
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
        message: `Connection failed: ${msg}`,
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
          sensorId: '2063',
          month: 10,
          year: 2026,
          configOverride: config,
        }),
      });
      const data = await res.json();
      const latency = Date.now() - startTime;

      if (res.ok && data.success && !data.isFallback) {
        setPrtgTestResult({
          type: 'success',
          message: `Connected successfully (${latency}ms) to ${config.prtgBaseUrl}`,
        });
      } else if (data.isFallback) {
        setPrtgTestResult({
          type: 'error',
          message: data.error || `Server responded but sensor not found on ${config.prtgBaseUrl}.`,
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
        message: `PRTG connection failed: ${msg}`,
      });
    } finally {
      setTestingPrtgConnection(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    setTelegramTestResult(null);
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.telegramBotToken,
          chatId: config.telegramChatId,
          threadId: config.telegramThreadId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTelegramTestResult({
          type: 'success',
          message: data.message || 'Test message sent successfully to Telegram group!',
        });
        toast.success('Test message delivered to Telegram.');
      } else {
        setTelegramTestResult({
          type: 'error',
          message: data.error || 'Failed to send Telegram message. Please check Bot Token and Chat ID.',
        });
        toast.error(data.error || 'Failed to send Telegram message.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTelegramTestResult({
        type: 'error',
        message: `Connection failed: ${msg}`,
      });
      toast.error(msg);
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTarget.trim()) {
      toast.error('Enter recipient test email address.');
      return;
    }
    setTestingEmail(true);
    setEmailTestResult(null);
    try {
      const res = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          user: config.smtpUser,
          pass: config.smtpPassword,
          fromEmail: config.smtpFromEmail,
          fromName: config.smtpFromName,
          toEmail: testEmailTarget.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailTestResult({
          type: 'success',
          message: data.message || `Test email sent successfully to ${testEmailTarget}!`,
        });
        toast.success(`Test email sent successfully to ${testEmailTarget}.`);
      } else {
        setEmailTestResult({
          type: 'error',
          message: data.error || 'Failed to send test email. Please check SMTP credentials.',
        });
        toast.error(data.error || 'Failed to send test email.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEmailTestResult({
        type: 'error',
        message: `SMTP connection failed: ${msg}`,
      });
      toast.error(msg);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
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
                  ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Server className="w-4 h-4 shrink-0" />
              <span>Monitoring (Cacti/PRTG)</span>
            </Button>

            <Button
              variant={activeTab === 'notifications' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('notifications')}
              className={`w-full justify-start h-9 px-3 gap-2 text-xs font-semibold ${
                activeTab === 'notifications'
                  ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0 text-blue-600" />
              <span>Notifications (Email & Telegram)</span>
            </Button>

            <Button
              variant={activeTab === 'templates' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('templates')}
              className={`w-full justify-start h-9 px-3 gap-2 text-xs font-semibold ${
                activeTab === 'templates'
                  ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ImageIcon className="w-4 h-4 shrink-0" />
              <span>PDF Canvas Templates</span>
            </Button>

            <Button
              variant={activeTab === 'defaults' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('defaults')}
              className={`w-full justify-start h-9 px-3 gap-2 text-xs font-semibold ${
                activeTab === 'defaults'
                  ? 'bg-orange-50 text-orange-700 font-semibold border border-orange-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Document Standards & SLA</span>
            </Button>
          </nav>
        </div>

        {/* Right Content Column */}
        <div className="md:col-span-9 w-full">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
              <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
              <p>Loading system settings...</p>
            </div>
          ) : activeTab === 'integrations' ? (
            /* ================= INTEGRATIONS TAB ================= */
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Cacti Integration Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <span>Cacti / MRTG Engine</span>
                  </h3>
                  <InfoTooltip content="Telemetry source for MRTG bandwidth graphs and monthly metrics." />
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Cacti Base URL</label>
                    <Input
                      value={config.mrtgBaseUrl}
                      onChange={(e) => setConfig({ ...config, mrtgBaseUrl: e.target.value })}
                      className="text-xs"
                    />
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
                        <SelectItem value="COOKIE">Form Login / Session Cookie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Cacti Username</label>
                      <Input
                        value={config.mrtgUsername}
                        onChange={(e) => setConfig({ ...config, mrtgUsername: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Cacti Password</label>
                      <Input
                        type="password"
                        value={config.mrtgPassword || ''}
                        onChange={(e) => setConfig({ ...config, mrtgPassword: e.target.value })}
                        placeholder="••••••••"
                        className="text-xs font-mono"
                        autoComplete="new-password"
                      />
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
                      type="button"
                      onClick={handleTestMrtgConnection}
                      loading={testingConnection}
                    >
                      <Activity className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      <span>Test Cacti Connection</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* PRTG Integration Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span>PRTG Network Monitor</span>
                  </h3>
                  <InfoTooltip content="PRTG Network Monitor sensor data source for uptime and SLA availability." />
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">PRTG Base URL</label>
                    <Input
                      value={config.prtgBaseUrl}
                      onChange={(e) => setConfig({ ...config, prtgBaseUrl: e.target.value })}
                      className="text-xs"
                    />
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
                        <SelectItem value="PASSWORD">Standard Username &amp; Password</SelectItem>
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
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">PRTG Password / Passhash</label>
                      <Input
                        type="password"
                        value={config.prtgPassword || ''}
                        onChange={(e) => setConfig({ ...config, prtgPassword: e.target.value })}
                        placeholder="••••••••"
                        className="text-xs font-mono"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {/* Nginx Basic Auth Proxy */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="font-semibold text-slate-800 block mb-0.5">
                      HTTP Basic Auth Reverse Proxy (Optional)
                    </label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Proxy Username</label>
                        <Input
                          placeholder="e.g. appsmg01"
                          value={config.prtgBasicUsername || ''}
                          onChange={(e) => setConfig({ ...config, prtgBasicUsername: e.target.value })}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-medium text-slate-700 block mb-1">Proxy Password</label>
                        <Input
                          type="password"
                          value={config.prtgBasicPassword || ''}
                          onChange={(e) => setConfig({ ...config, prtgBasicPassword: e.target.value })}
                          placeholder="••••••••"
                          className="text-xs font-mono"
                          autoComplete="new-password"
                        />
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
                      type="button"
                      onClick={handleTestPrtgConnection}
                      loading={testingPrtgConnection}
                    >
                      <Activity className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      <span>Test PRTG Connection</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="primary" size="md" loading={saving} onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Save Monitoring Settings</span>
                </Button>
              </div>
            </form>
          ) : activeTab === 'notifications' ? (
            /* ================= NOTIFICATIONS TAB ================= */
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* 1. Email (SMTP) Integration Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span>Email (SMTP) Integration &bull; Single Thread</span>
                    </h3>
                    <InfoTooltip content="Sends formal report notifications with RFC 2822 conversation threading support." />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
                    <input
                      type="checkbox"
                      checked={config.emailNotificationsEnabled}
                      onChange={(e) =>
                        setConfig({ ...config, emailNotificationsEnabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Enable Email Notifications</span>
                  </label>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-medium text-slate-700 block mb-1">
                        SMTP Host Server <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. mail.nexa.net.id"
                        value={config.smtpHost}
                        onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                        className="text-xs font-sans"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Port</label>
                      <Input
                        type="number"
                        placeholder="587"
                        value={config.smtpPort}
                        onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value, 10) || 587 })}
                        className="text-xs font-sans tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                      <input
                        type="checkbox"
                        checked={config.smtpSecure}
                        onChange={(e) => setConfig({ ...config, smtpSecure: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      <span>Enable Direct SSL/TLS (Check for Port 465; Uncheck for STARTTLS / Port 587)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">SMTP Username</label>
                      <Input
                        placeholder="e.g. noreply@nexa.net.id"
                        value={config.smtpUser}
                        onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">SMTP Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={config.smtpPassword || ''}
                        onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                        className="text-xs font-mono"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">From Email Address</label>
                      <Input
                        placeholder="noreply-reports@nexa.net.id"
                        value={config.smtpFromEmail}
                        onChange={(e) => setConfig({ ...config, smtpFromEmail: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Sender Display Name</label>
                      <Input
                        placeholder="Nexa Customer Reporting System"
                        value={config.smtpFromName}
                        onChange={(e) => setConfig({ ...config, smtpFromName: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Test Email Section */}
                  <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg space-y-2">
                    <label className="font-semibold text-slate-800 block text-xs">
                      Test SMTP Email Delivery
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Recipient email address (e.g. admin@nexa.net.id)"
                        value={testEmailTarget}
                        onChange={(e) => setTestEmailTarget(e.target.value)}
                        className="text-xs flex-1 bg-white"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleTestEmail}
                        loading={testingEmail}
                        disabled={!config.smtpHost.trim()}
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                        <span>Send Test Email</span>
                      </Button>
                    </div>

                    {emailTestResult && (
                      <div
                        className={`p-2.5 rounded text-xs flex items-start gap-2 mt-2 ${
                          emailTestResult.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                      >
                        {emailTestResult.type === 'success' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <span>{emailTestResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Department Email Distribution Lists */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Department Email Distribution</span>
                  </h3>
                  <InfoTooltip content="Mailing lists and group emails receiving reports per requester department." />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                    <label className="font-semibold text-slate-800 block">
                      Account Executive (Sales)
                    </label>
                    <Input
                      placeholder="sls@nexa.net.id"
                      value={config.emailDeptSales}
                      onChange={(e) => setConfig({ ...config, emailDeptSales: e.target.value })}
                      className="text-xs bg-white font-sans"
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                    <label className="font-semibold text-slate-800 block">
                      Customer Experience (CE / CX)
                    </label>
                    <Input
                      placeholder="cxe@nexa.net.id"
                      value={config.emailDeptCe}
                      onChange={(e) => setConfig({ ...config, emailDeptCe: e.target.value })}
                      className="text-xs bg-white font-sans"
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                    <label className="font-semibold text-slate-800 block">
                      Finance (Billing &amp; AR)
                    </label>
                    <Input
                      placeholder="finc@nexa.net.id"
                      value={config.emailDeptFinance}
                      onChange={(e) => setConfig({ ...config, emailDeptFinance: e.target.value })}
                      className="text-xs bg-white font-sans"
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30 space-y-1.5">
                    <label className="font-semibold text-emerald-950 flex items-center justify-between">
                      <span>Helpdesk NOC (Operations)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Always CC
                      </span>
                    </label>
                    <Input
                      placeholder="helpdesk@nexa.net.id"
                      value={config.emailDeptHelpdesk}
                      onChange={(e) => setConfig({ ...config, emailDeptHelpdesk: e.target.value })}
                      className="text-xs bg-white font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Telegram Bot Notifications */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <Send className="w-4 h-4 text-sky-500" />
                      <span>Telegram Group Notifications (Operations)</span>
                    </h3>
                    <InfoTooltip content="Real-time instant alert dispatch to NOC Helpdesk operations group forum topic." />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
                    <input
                      type="checkbox"
                      checked={config.telegramNotificationsEnabled}
                      onChange={(e) =>
                        setConfig({ ...config, telegramNotificationsEnabled: e.target.checked })
                      }
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4"
                    />
                    <span>Enable Telegram</span>
                  </label>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">
                      Telegram Bot Token <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="password"
                      value={config.telegramBotToken}
                      onChange={(e) => setConfig({ ...config, telegramBotToken: e.target.value })}
                      placeholder="••••••••"
                      className="text-xs font-mono"
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Group Chat ID <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={config.telegramChatId}
                        onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })}
                        className="text-xs font-sans tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Topic Thread ID (Optional)
                      </label>
                      <Input
                        value={config.telegramThreadId}
                        onChange={(e) => setConfig({ ...config, telegramThreadId: e.target.value })}
                        className="text-xs font-sans tabular-nums"
                      />
                    </div>
                  </div>

                  {telegramTestResult && (
                    <div
                      className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                        telegramTestResult.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      {telegramTestResult.type === 'success' ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      )}
                      <span>{telegramTestResult.message}</span>
                    </div>
                  )}

                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleTestTelegram}
                      loading={testingTelegram}
                      disabled={!config.telegramBotToken.trim() || !config.telegramChatId.trim()}
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5 text-sky-500" />
                      <span>Test Telegram Message</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Single Primary Save Button */}
              <div className="flex justify-end pt-1">
                <Button variant="primary" size="md" loading={saving} onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Save Notification Settings</span>
                </Button>
              </div>
            </form>
          ) : activeTab === 'templates' ? (
            /* ================= TEMPLATES TAB ================= */
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>Report Canvas PDF Templates</span>
                  </h3>
                  <InfoTooltip content="High-resolution A4 canvas templates (210mm x 297mm) used for covers and report page backgrounds." />
                </div>

                {/* Template Asset 1: MRTG Cover */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">MRTG Cover Template (Traffic)</h4>
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
                        <span>Change MRTG Cover</span>
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
                        <div className="text-xs font-medium text-orange-600">
                          {uploadStatus['cover_mrtg']}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template Asset 2: SLA Cover */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">SLA Cover Template (Availability)</h4>
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
                        <span>Change SLA Cover</span>
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
                        <div className="text-xs font-medium text-orange-600">
                          {uploadStatus['cover_sla']}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Template Asset 3: Content Background */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">Report Content Page Background</h4>
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
                        <span>Change Page Background</span>
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
                        <div className="text-xs font-medium text-orange-600">
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
                    <ShieldCheck className="w-4 h-4 text-orange-600" />
                    <span>Document Standards &amp; Global SLA</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Default Target SLA (%)</label>
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
                      className="font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="primary" size="md" loading={saving} onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Save Document Standards</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
