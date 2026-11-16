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
    smtpFromEmail: 'noreply-genre@nexa.net.id',
    smtpFromName: 'NEXA GENRE Reporting',
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

  // Password visibility toggles
  const [showMrtgPassword, setShowMrtgPassword] = useState(false);
  const [showPrtgPassword, setShowPrtgPassword] = useState(false);
  const [showPrtgBasicPassword, setShowPrtgBasicPassword] = useState(false);
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

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
            smtpFromEmail: data.config.smtpFromEmail || 'noreply-genre@nexa.net.id',
            smtpFromName: data.config.smtpFromName || 'NEXA GENRE Reporting',
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
        toast.success('Pengaturan sistem berhasil disimpan.');
      } else {
        toast.error(data.error || 'Gagal menyimpan konfigurasi.');
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan.');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadTemplate = async (templateKey: 'cover_mrtg' | 'cover_sla' | 'page_bg', file: File) => {
    if (!file) return;
    setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Mengunggah...' }));

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
        setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Berhasil diunggah!' }));
        setCacheBuster(Date.now());
        toast.success(`Template ${templateKey} berhasil diperbarui.`);
      } else {
        setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Gagal mengunggah' }));
        toast.error(data.error || 'Gagal mengunggah template.');
      }
    } catch {
      setUploadStatus((prev) => ({ ...prev, [templateKey]: 'Kesalahan jaringan' }));
      toast.error('Gagal mengunggah template.');
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
          message: `Terhubung sukses (${latency}ms) ke ${config.mrtgBaseUrl}`,
        });
      } else {
        setTestResult({
          type: 'error',
          message: data.error || 'Gagal terhubung ke MRTG / Cacti.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({
        type: 'error',
        message: `Koneksi gagal: ${msg}`,
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
          message: `Terhubung sukses (${latency}ms) ke ${config.prtgBaseUrl}`,
        });
      } else if (data.isFallback) {
        setPrtgTestResult({
          type: 'error',
          message: data.error || `Server merespons tetapi sensor tidak ditemukan di ${config.prtgBaseUrl}.`,
        });
      } else {
        setPrtgTestResult({
          type: 'error',
          message: data.error || 'Gagal terhubung ke PRTG Network Monitor.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setPrtgTestResult({
        type: 'error',
        message: `Koneksi PRTG gagal: ${msg}`,
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
          message: data.message || 'Pesan uji coba berhasil dikirim ke grup Telegram!',
        });
        toast.success('Pesan uji coba berhasil terkirim ke Telegram.');
      } else {
        setTelegramTestResult({
          type: 'error',
          message: data.error || 'Gagal mengirim pesan Telegram. Periksa token dan Chat ID.',
        });
        toast.error(data.error || 'Gagal mengirim pesan Telegram.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTelegramTestResult({
        type: 'error',
        message: `Koneksi gagal: ${msg}`,
      });
      toast.error(msg);
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmailTarget.trim()) {
      toast.error('Masukkan alamat email penerima uji coba.');
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
          message: data.message || `Email uji coba berhasil dikirim ke ${testEmailTarget}!`,
        });
        toast.success(`Email uji coba berhasil dikirim ke ${testEmailTarget}.`);
      } else {
        setEmailTestResult({
          type: 'error',
          message: data.error || 'Gagal mengirim email uji coba. Periksa kredensial SMTP.',
        });
        toast.error(data.error || 'Gagal mengirim email uji coba.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEmailTestResult({
        type: 'error',
        message: `Koneksi SMTP gagal: ${msg}`,
      });
      toast.error(msg);
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        description="Konfigurasi integrasi monitoring (MRTG/PRTG), notifikasi email SMTP & Telegram, distribusi departemen, dan template canvas PDF."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Generator</span>
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
              <span>Notifikasi (Email & Telegram)</span>
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
              <span>Template Canvas PDF</span>
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
              <span>Standar Dokumen & SLA</span>
            </Button>
          </nav>
        </div>

        {/* Right Content Column */}
        <div className="md:col-span-9 max-w-[760px]">
          {loading ? (
            <div className="py-16 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200">
              <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
              <p>Memuat pengaturan sistem...</p>
            </div>
          ) : activeTab === 'integrations' ? (
            /* ================= INTEGRATIONS TAB ================= */
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* Cacti Integration Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-emerald-600" />
                    <span>Cacti / MRTG Engine</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Server Cacti digunakan untuk mengambil data grafik dan rekap trafik bulanan.
                  </p>
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
                    <label className="font-medium text-slate-700 block mb-1">Metode Autentikasi</label>
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
                      <label className="font-medium text-slate-700 block mb-1">Username Cacti</label>
                      <Input
                        value={config.mrtgUsername}
                        onChange={(e) => setConfig({ ...config, mrtgUsername: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Password Cacti</label>
                      <div className="relative">
                        <Input
                          type={showMrtgPassword ? 'text' : 'password'}
                          value={config.mrtgPassword || ''}
                          onChange={(e) => setConfig({ ...config, mrtgPassword: e.target.value })}
                          className="text-xs pr-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowMrtgPassword(!showMrtgPassword)}
                          className="absolute right-0.5 top-0.5 h-7 w-7 text-slate-500 hover:text-slate-800"
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
                      type="button"
                      onClick={handleTestMrtgConnection}
                      loading={testingConnection}
                    >
                      <Activity className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      <span>Uji Koneksi Cacti</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* PRTG Integration Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600" />
                    <span>PRTG Network Monitor</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Server PRTG digunakan untuk penarikan data sensor uptime dan downtime SLA.
                  </p>
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
                    <label className="font-medium text-slate-700 block mb-1">Metode Autentikasi</label>
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
                      <label className="font-medium text-slate-700 block mb-1">Username PRTG</label>
                      <Input
                        value={config.prtgUsername}
                        onChange={(e) => setConfig({ ...config, prtgUsername: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Password / Passhash PRTG</label>
                      <div className="relative">
                        <Input
                          type={showPrtgPassword ? 'text' : 'password'}
                          value={config.prtgPassword || ''}
                          onChange={(e) => setConfig({ ...config, prtgPassword: e.target.value })}
                          className="text-xs pr-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowPrtgPassword(!showPrtgPassword)}
                          className="absolute right-0.5 top-0.5 h-7 w-7 text-slate-500 hover:text-slate-800"
                        >
                          {showPrtgPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Nginx Basic Auth Proxy */}
                  <div className="pt-2 border-t border-slate-100">
                    <label className="font-semibold text-slate-800 block mb-0.5">
                      Nginx / HTTP Basic Auth Proxy (Opsional)
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
                        <div className="relative">
                          <Input
                            type={showPrtgBasicPassword ? 'text' : 'password'}
                            value={config.prtgBasicPassword || ''}
                            onChange={(e) => setConfig({ ...config, prtgBasicPassword: e.target.value })}
                            className="text-xs pr-8"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setShowPrtgBasicPassword(!showPrtgBasicPassword)}
                            className="absolute right-0.5 top-0.5 h-7 w-7 text-slate-500 hover:text-slate-800"
                          >
                            {showPrtgBasicPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
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
                      <span>Uji Koneksi PRTG</span>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button variant="primary" size="md" loading={saving} onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Simpan Monitoring</span>
                </Button>
              </div>
            </form>
          ) : activeTab === 'notifications' ? (
            /* ================= NOTIFICATIONS TAB ================= */
            <form onSubmit={handleSaveConfig} className="space-y-6">
              {/* 1. Email (SMTP) Integration Card */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span>Integrasi Email (SMTP) &bull; Single Thread</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mengirimkan notifikasi formal tiket laporan dengan dukungan conversation threading RFC 2822.
                    </p>
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
                    <span>Aktifkan Notifikasi Email</span>
                  </label>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="font-medium text-slate-700 block mb-1">
                        Host Server SMTP <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        placeholder="e.g. mail.nexa.net.id"
                        value={config.smtpHost}
                        onChange={(e) => setConfig({ ...config, smtpHost: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Port</label>
                      <Input
                        type="number"
                        placeholder="587"
                        value={config.smtpPort}
                        onChange={(e) => setConfig({ ...config, smtpPort: parseInt(e.target.value, 10) || 587 })}
                        className="text-xs font-mono"
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
                      <span>Gunakan SSL/TLS Langsung (Centang jika Port 465; Biarkan mati jika STARTTLS / Port 587)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Username / Akun SMTP</label>
                      <Input
                        placeholder="e.g. noreply@nexa.net.id"
                        value={config.smtpUser}
                        onChange={(e) => setConfig({ ...config, smtpUser: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Password SMTP</label>
                      <div className="relative">
                        <Input
                          type={showSmtpPassword ? 'text' : 'password'}
                          placeholder="Password akun email..."
                          value={config.smtpPassword || ''}
                          onChange={(e) => setConfig({ ...config, smtpPassword: e.target.value })}
                          className="text-xs pr-8"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                          className="absolute right-0.5 top-0.5 h-7 w-7 text-slate-500 hover:text-slate-800"
                        >
                          {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Email Pengirim (From)</label>
                      <Input
                        placeholder="noreply-genre@nexa.net.id"
                        value={config.smtpFromEmail}
                        onChange={(e) => setConfig({ ...config, smtpFromEmail: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">Nama Pengirim (Display Name)</label>
                      <Input
                        placeholder="NEXA GENRE Reporting"
                        value={config.smtpFromName}
                        onChange={(e) => setConfig({ ...config, smtpFromName: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Test Email Section */}
                  <div className="pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-lg space-y-2">
                    <label className="font-semibold text-slate-800 block text-xs">
                      Uji Coba Pengiriman Email SMTP
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ketik email penerima (contoh: admin@nexa.net.id)"
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
                        <span>Kirim Uji Coba</span>
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
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Distribusi Email Berdasarkan Departemen</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alamat email distribusi (milis/grup) yang menerima notifikasi sesuai departemen pemohon.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                    <label className="font-semibold text-slate-800 block">
                      Account Executive (Sales)
                    </label>
                    <p className="text-slate-500 text-[11px]">Menerima laporan permintaan tim Sales / AE</p>
                    <Input
                      placeholder="sls@nexa.net.id"
                      value={config.emailDeptSales}
                      onChange={(e) => setConfig({ ...config, emailDeptSales: e.target.value })}
                      className="text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                    <label className="font-semibold text-slate-800 block">
                      Customer Experience (CE / CX)
                    </label>
                    <p className="text-slate-500 text-[11px]">Menerima laporan permintaan tim CE / CX</p>
                    <Input
                      placeholder="cxe@nexa.net.id"
                      value={config.emailDeptCe}
                      onChange={(e) => setConfig({ ...config, emailDeptCe: e.target.value })}
                      className="text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 space-y-1.5">
                    <label className="font-semibold text-slate-800 block">
                      Finance (Penagihan &amp; AR)
                    </label>
                    <p className="text-slate-500 text-[11px]">Menerima lampiran SLA untuk keperluan penagihan</p>
                    <Input
                      placeholder="finc@nexa.net.id"
                      value={config.emailDeptFinance}
                      onChange={(e) => setConfig({ ...config, emailDeptFinance: e.target.value })}
                      className="text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30 space-y-1.5">
                    <label className="font-semibold text-emerald-950 flex items-center justify-between">
                      <span>Helpdesk NOC (Operasional)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        Wajib Tembusan
                      </span>
                    </label>
                    <p className="text-slate-500 text-[11px]">Selalu menerima salinan setiap tiket dari awal s/d selesai</p>
                    <Input
                      placeholder="helpdesk@nexa.net.id"
                      value={config.emailDeptHelpdesk}
                      onChange={(e) => setConfig({ ...config, emailDeptHelpdesk: e.target.value })}
                      className="text-xs bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Telegram Bot Notifications */}
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                      <Send className="w-4 h-4 text-[#0088cc]" />
                      <span>Notifikasi Grup Telegram (NOC Operasional)</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pesan instan cepat ke forum grup operasional Helpdesk NOC.
                    </p>
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
                    <span>Aktifkan Telegram</span>
                  </label>
                </div>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">
                      Telegram Bot Token <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type={showTelegramToken ? 'text' : 'password'}
                        value={config.telegramBotToken}
                        onChange={(e) => setConfig({ ...config, telegramBotToken: e.target.value })}
                        className="text-xs pr-8 font-mono"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setShowTelegramToken(!showTelegramToken)}
                        className="absolute right-0.5 top-0.5 h-7 w-7 text-slate-500 hover:text-slate-800"
                      >
                        {showTelegramToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Group Chat ID <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={config.telegramChatId}
                        onChange={(e) => setConfig({ ...config, telegramChatId: e.target.value })}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Topic Thread ID (Opsional)
                      </label>
                      <Input
                        value={config.telegramThreadId}
                        onChange={(e) => setConfig({ ...config, telegramThreadId: e.target.value })}
                        className="text-xs font-mono"
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
                      <Send className="w-3.5 h-3.5 mr-1.5 text-[#0088cc]" />
                      <span>Uji Notifikasi Telegram</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Single Primary Save Button */}
              <div className="flex justify-end pt-1">
                <Button variant="primary" size="md" loading={saving} onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1.5" />
                  <span>Simpan Konfigurasi Notifikasi</span>
                </Button>
              </div>
            </form>
          ) : activeTab === 'templates' ? (
            /* ================= TEMPLATES TAB ================= */
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-orange-600" />
                    <span>Template Canvas Laporan PDF</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Background beresolusi tinggi A4 (210mm x 297mm) yang digunakan sebagai latar cover dan isi laporan.
                  </p>
                </div>

                {/* Template Asset 1: MRTG Cover */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">Cover Laporan MRTG (Trafik)</h4>
                    <p className="text-xs text-slate-500">Latar halaman sampul untuk laporan grafik MRTG</p>
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
                        <span>Ganti Cover MRTG</span>
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
                    <h4 className="font-semibold text-xs text-slate-900">Cover Laporan SLA (Ketersediaan)</h4>
                    <p className="text-xs text-slate-500">Latar halaman sampul untuk laporan Service Level Agreement</p>
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
                        <span>Ganti Cover SLA</span>
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
                    <h4 className="font-semibold text-xs text-slate-900">Background Isi Halaman Laporan</h4>
                    <p className="text-xs text-slate-500">Latar belakang halaman rincian grafik dan tabel performa</p>
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
                        <span>Ganti Background Isi</span>
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
                    <span>Standar Dokumen &amp; SLA Global</span>
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-medium text-slate-700 block mb-1">Target SLA Default (%)</label>
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
                    <label className="font-medium text-slate-700 block mb-1">Prefix Nomor Dokumen</label>
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
                  <span>Simpan Standar Dokumen</span>
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
