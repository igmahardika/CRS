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
        title="Report Request Form"
        description="Submit a request for official network performance compliance reports (MRTG & SLA)."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
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
              Request Submitted Successfully!
            </h2>
            <p className="text-xs text-slate-600 max-w-md">
              Your request ticket has been queued and an automated alert has been dispatched to the team via Telegram.
            </p>
          </div>

          {/* Ticket Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Request Ticket Number</span>
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
                  title="Copy ticket number"
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
                <span className="text-[11px] text-slate-400 block">Customer Name</span>
                <span className="font-semibold text-slate-800">{submittedTicket.customerName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Report Type</span>
                <span className="font-semibold text-slate-800">{submittedTicket.reportType}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Period</span>
                <span className="font-medium text-slate-700">{submittedTicket.period}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Priority</span>
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
              <span>Submit Another Request</span>
            </Button>
            <Link href="/requests" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full">
                <span>View Request Queue</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* ================= REQUEST FORM ================= */
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          {/* Section 1: Requester Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <User className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-heading text-sm font-semibold text-slate-900">
                1. Requester Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full Name" required>
                <Input
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                />
              </FormField>

              <FormField label="Department / Division" required>
                <Select value={requesterDept} onValueChange={setRequesterDept}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Account Management">Account Management (AM)</SelectItem>
                    <SelectItem value="Sales & Business Development">Sales &amp; Business Development</SelectItem>
                    <SelectItem value="Network Operations Center">Network Operations Center (NOC)</SelectItem>
                    <SelectItem value="Customer Care & Helpdesk">Customer Care &amp; Helpdesk</SelectItem>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Other">Other Department</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <div className="sm:col-span-2">
                <FormField label="Email / WhatsApp Contact">
                  <Input
                    type="text"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Section 2: Customer & Report Details */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-heading text-sm font-semibold text-slate-900">
                2. Customer &amp; Report Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField label="Required Report Type" required>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportType('SLA')}
                      className={`p-3 rounded-lg border text-center transition cursor-pointer select-none ${
                        reportType === 'SLA'
                          ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C] text-[#C2410C]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">SLA Report</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('MRTG')}
                      className={`p-3 rounded-lg border text-center transition cursor-pointer select-none ${
                        reportType === 'MRTG'
                          ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C] text-[#C2410C]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">MRTG Report</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('BOTH')}
                      className={`p-3 rounded-lg border text-center transition cursor-pointer select-none ${
                        reportType === 'BOTH'
                          ? 'border-[#EA580C] bg-orange-50/60 ring-1 ring-[#EA580C] text-[#C2410C]'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold">Both (SLA &amp; MRTG)</div>
                    </button>
                  </div>
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField label="Customer Name" required>
                  <Input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField label="Service ID / Customer ID">
                  <Input
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="Report Month" required>
                  <Select value={periodMonth} onValueChange={setPeriodMonth}>
                    <SelectTrigger>
                      <SelectValue />
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
                <FormField label="Report Year" required>
                  <Select value={periodYear} onValueChange={setPeriodYear}>
                    <SelectTrigger>
                      <SelectValue />
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

          {/* Section 3: Priority & Notes */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Clock className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-heading text-sm font-semibold text-slate-900">
                3. Priority &amp; Notes
              </h3>
            </div>

            <FormField label="Request Priority" required>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUrgency('NORMAL')}
                  className={`p-3 rounded-lg border text-center transition cursor-pointer select-none ${
                    urgency === 'NORMAL'
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500 text-emerald-800'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Normal Priority</div>
                </button>
                <button
                  type="button"
                  onClick={() => setUrgency('URGENT')}
                  className={`p-3 rounded-lg border text-center transition cursor-pointer select-none ${
                    urgency === 'URGENT'
                      ? 'border-rose-500 bg-rose-50/60 ring-1 ring-rose-500 text-rose-700'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center justify-center gap-1">
                    <span>🔴 Urgent Priority</span>
                  </div>
                </button>
              </div>
            </FormField>

            <FormField label="Additional Notes">
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
                  <span>Submitting Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  <span>Submit Request</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
