'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Send,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  FileText,
  Building2,
  User,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Textarea,
  FormField,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  PageHeader,
} from '@/components/ui';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RequestReportPage() {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const [requesterName, setRequesterName] = useState('');
  const [requesterDept, setRequesterDept] = useState('Account Management');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [reportType, setReportType] = useState<'SLA' | 'MRTG' | 'BOTH'>('SLA');
  const [customerName, setCustomerName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [periodMonth, setPeriodMonth] = useState(String(currentMonth));
  const [periodYear, setPeriodYear] = useState(String(currentYear));
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState<{
    ticketNumber: string;
    customerName: string;
    reportType: string;
    period: string;
    urgency: string;
    createdAt: string;
  } | null>(null);

  const [copiedTicket, setCopiedTicket] = useState(false);

  const handleCopyTicket = (ticket: string) => {
    navigator.clipboard.writeText(ticket);
    setCopiedTicket(true);
    toast.success('Nomor tiket berhasil disalin!');
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim() || !requesterDept.trim() || !customerName.trim()) {
      toast.error('Mohon lengkapi nama pemohon, departemen, dan nama pelanggan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName,
          requesterDept,
          requesterEmail,
          reportType,
          customerName,
          serviceId,
          periodMonth: parseInt(periodMonth, 10),
          periodYear: parseInt(periodYear, 10),
          urgency,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirimkan permintaan');
      }

      setSubmittedTicket({
        ticketNumber: data.request.ticketNumber,
        customerName: data.request.customerName,
        reportType: data.request.reportType,
        period: `${monthNames[data.request.periodMonth - 1]} ${data.request.periodYear}`,
        urgency: data.request.urgency,
        createdAt: data.request.createdAt,
      });

      toast.success(`Permintaan berhasil disubmit! No Tiket: ${data.request.ticketNumber}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Terjadi kesalahan: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCustomerName('');
    setServiceId('');
    setNotes('');
    setUrgency('NORMAL');
    setSubmittedTicket(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-2">
      {/* Header */}
      <PageHeader
        title="Formulir Permintaan Laporan SLA & MRTG"
        description="Layanan pengajuan dokumen laporan performa jaringan resmi untuk kebutuhan klien, meeting evaluasi, atau penagihan."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Beranda</span>
          </Link>
        }
      />

      {submittedTicket ? (
        /* ================= SUCCESS CONFIRMATION CARD ================= */
        <div className="bg-white rounded-xl border border-emerald-200 shadow-md p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8 stroke-[2.2]" />
            </div>
            <h2 className="text-xl font-heading font-bold text-slate-900">
              Permintaan Berhasil Diterima!
            </h2>
            <p className="text-xs text-slate-600 max-w-md">
              Tiket permintaan Anda telah didaftarkan ke dalam antrean sistem dan notifikasi otomatis telah dikirimkan ke tim terkait melalui Telegram.
            </p>
          </div>

          {/* Ticket Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Nomor Tiket Permintaan</span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-bold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  {submittedTicket.ticketNumber}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleCopyTicket(submittedTicket.ticketNumber)}
                  className="h-7 w-7 text-slate-500 hover:text-slate-900"
                  title="Salin nomor tiket"
                >
                  {copiedTicket ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 block">Nama Pelanggan</span>
                <span className="font-semibold text-slate-800">{submittedTicket.customerName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Tipe Laporan</span>
                <span className="font-semibold text-slate-800">{submittedTicket.reportType}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Periode</span>
                <span className="font-medium text-slate-700">{submittedTicket.period}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Tingkat Urgensi</span>
                <Badge variant={submittedTicket.urgency === 'URGENT' ? 'destructive' : 'info'} dot>
                  {submittedTicket.urgency === 'URGENT' ? 'Urgent' : 'Normal'}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleResetForm}
              className="w-full sm:w-auto"
            >
              <span>Ajukan Permintaan Lain</span>
            </Button>
            <Link href="/requests" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full">
                <span>Lihat Antrean Permintaan</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* ================= REQUEST FORM ================= */
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Section 1: Data Pemohon */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-heading text-sm font-semibold text-slate-900">
                1. Data Pemohon
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nama Lengkap Pemohon" required>
                <Input
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  required
                />
              </FormField>

              <FormField label="Departemen / Divisi" required>
                <Select value={requesterDept} onValueChange={setRequesterDept}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih departemen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Account Management">Account Management (AM)</SelectItem>
                    <SelectItem value="Sales & Business Development">Sales & Business Development</SelectItem>
                    <SelectItem value="Network Operations Center">Network Operations Center (NOC)</SelectItem>
                    <SelectItem value="Customer Care & Helpdesk">Customer Care & Helpdesk</SelectItem>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Management / Direksi">Management / Direksi</SelectItem>
                    <SelectItem value="Lainnya">Departemen Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Email / Kontak WhatsApp (Opsional)">
                  <Input
                    type="text"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="Contoh: budi@nexa.net.id / 08123456789"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Kontak untuk konfirmasi jika staf membutuhkan klarifikasi data.
                  </p>
                </FormField>
              </div>
            </div>
          </div>

          {/* Section 2: Detail Laporan */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-heading text-sm font-semibold text-slate-900">
                2. Detail Pelanggan & Laporan
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField label="Jenis Laporan yang Dibutuhkan" required>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportType('SLA')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer select-none ${
                        reportType === 'SLA'
                          ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C]'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">SLA Report</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Availability & Downtime</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('MRTG')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer select-none ${
                        reportType === 'MRTG'
                          ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C]'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">MRTG Report</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Traffic & Bandwidth</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('BOTH')}
                      className={`p-3 rounded-lg border text-left transition cursor-pointer select-none ${
                        reportType === 'BOTH'
                          ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C]'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">Keduanya</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">SLA & MRTG Lengkap</div>
                    </button>
                  </div>
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField label="Nama Pelanggan / Instansi" required>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Contoh: RSJ. Dr. Soeharto Heerdjan"
                    required
                  />
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField label="Service ID / Customer ID (Jika diketahui)">
                  <Input
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                    placeholder="Contoh: 01.2180.1 atau 01.2294.0426"
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Bulan Laporan" required>
                  <Select value={periodMonth} onValueChange={setPeriodMonth}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((m, idx) => (
                        <SelectItem key={m} value={String(idx + 1)}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div>
                <FormField label="Tahun Laporan" required>
                  <Select value={periodYear} onValueChange={setPeriodYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>
          </div>

          {/* Section 3: Urgensi & Catatan */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-heading text-sm font-semibold text-slate-900">
                3. Tingkat Urgensi & Catatan Tambahan
              </h3>
            </div>

            <FormField label="Prioritas / Urgensi Permintaan" required>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUrgency('NORMAL')}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer select-none ${
                    urgency === 'NORMAL'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-emerald-800">Normal (Standar Antrean)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Pengerjaan reguler sesuai giliran tim</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('URGENT')}
                  className={`p-3 rounded-lg border text-left transition cursor-pointer select-none ${
                    urgency === 'URGENT'
                      ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-bold text-rose-700 flex items-center gap-1">
                    <span>🔴 Urgent (Butuh Cepat)</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Untuk kebutuhan rapat mendesak atau komplain</div>
                </button>
              </div>
            </FormField>

            <FormField label="Catatan Tambahan / Tujuan Permintaan">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Butuh laporan ini sebelum pukul 14:00 WIB untuk bahan presentasi quarterly review dengan manajemen klien."
              />
            </FormField>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-6 py-2.5 font-semibold shadow-xs text-sm"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  <span>Mengirimkan Permintaan...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  <span>Kirim Permintaan Laporan</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
