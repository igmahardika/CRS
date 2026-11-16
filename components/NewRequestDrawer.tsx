'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
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
  Search,
  X,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Spinner,
} from '@/components/ui';

interface CustomerSearchResult {
  id: string;
  customerName: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  routineReportType?: string;
  targetSla?: number;
  salesPicId?: string | null;
  salesPicName?: string | null;
  cePicId?: string | null;
  cePicName?: string | null;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface NewRequestDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (ticketNumber: string) => void;
}

export default function NewRequestDrawer({
  open,
  onOpenChange,
  onSuccess,
}: NewRequestDrawerProps) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Smart Default: previous month (M-1)
  const defaultPrevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultPrevYear = now.getMonth() === 0 ? currentYear - 1 : currentYear;

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    fullName?: string;
    role: string;
    department: string;
  } | null>(null);

  const [requesterName, setRequesterName] = useState('');
  const [requesterDept, setRequesterDept] = useState('Network Operation');
  const [requesterEmail, setRequesterEmail] = useState('');

  // Staff PIC state
  const [staffList, setStaffList] = useState<Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    department: string;
    roleTitle: string | null;
  }>>([]);
  const [salesPicName, setSalesPicName] = useState('');
  const [salesPicEmail, setSalesPicEmail] = useState('');
  const [cePicName, setCePicName] = useState('');
  const [cePicEmail, setCePicEmail] = useState('');

  const [reportType, setReportType] = useState<'SLA' | 'MRTG' | 'BOTH'>('SLA');
  const [customerName, setCustomerName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSearchResult | null>(null);

  // Autocomplete state
  const [customerResults, setCustomerResults] = useState<CustomerSearchResult[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Browse Directory Modal state
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCustomers, setModalCustomers] = useState<CustomerSearchResult[]>([]);
  const [isModalLoading, setIsModalLoading] = useState(false);

  // Period state (Default M-1)
  const [periodMonth, setPeriodMonth] = useState(String(defaultPrevMonth));
  const [periodYear, setPeriodYear] = useState(String(defaultPrevYear));
  const [isMultiMonth, setIsMultiMonth] = useState(false);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([defaultPrevMonth]);
  const [isRoutineSchedule, setIsRoutineSchedule] = useState(false);

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

  // Fetch current user info for prefill & role locking + Staff PIC list
  useEffect(() => {
    if (open) {
      fetch('/api/auth/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.user) {
            setCurrentUser(data.user);
            setRequesterName(data.user.fullName || data.user.name || data.user.username || '');
            if (data.user.department) {
              setRequesterDept(data.user.department);
            }
          }
        })
        .catch(() => {});

      fetch('/api/staff?active=true')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.staff) {
            setStaffList(data.staff);
          }
        })
        .catch(() => {});
    }
  }, [open]);

  // Fetch autocomplete suggestions with debounce
  const fetchAutocompleteCustomers = useCallback(async (query: string) => {
    setIsSearchingCustomer(true);
    try {
      const res = await fetch(`/api/requests/customers?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.customers) {
        setCustomerResults(data.customers);
      }
    } catch {
      // ignore
    } finally {
      setIsSearchingCustomer(false);
    }
  }, []);

  // Fetch customers for Browse Directory modal
  const fetchModalCustomers = useCallback(async (query: string) => {
    setIsModalLoading(true);
    try {
      const res = await fetch(`/api/requests/customers?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.customers) {
        setModalCustomers(data.customers);
      }
    } catch {
      // ignore
    } finally {
      setIsModalLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !selectedCustomer) {
      const timer = setTimeout(() => {
        fetchAutocompleteCustomers(customerName);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, customerName, selectedCustomer, fetchAutocompleteCustomers]);

  // Click outside listener for autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open && !isBrowseModalOpen && !isSubmitting) {
        onOpenChange(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isBrowseModalOpen, isSubmitting, onOpenChange]);

  const handleSelectCustomer = (c: CustomerSearchResult) => {
    setSelectedCustomer(c);
    setCustomerName(c.customerName);
    setServiceId(c.serviceId);
    setShowCustomerDropdown(false);

    if (c.routineReportType === 'SLA' || c.routineReportType === 'MRTG' || c.routineReportType === 'BOTH') {
      setReportType(c.routineReportType as 'SLA' | 'MRTG' | 'BOTH');
    }

    // Auto-populate PIC Sales & CE if present
    if (c.salesPicName) {
      setSalesPicName(c.salesPicName);
      const found = staffList.find((s) => s.name === c.salesPicName);
      if (found) setSalesPicEmail(found.email);
    }
    if (c.cePicName) {
      setCePicName(c.cePicName);
      const found = staffList.find((s) => s.name === c.cePicName);
      if (found) setCePicEmail(found.email);
    }

    toast.success(`Pelanggan dipilih: ${c.customerName}`);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setServiceId('');
  };

  const handleCopyTicket = (ticket: string) => {
    navigator.clipboard.writeText(ticket);
    setCopiedTicket(true);
    toast.success('Ticket number copied to clipboard!');
    setTimeout(() => setCopiedTicket(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requesterName.trim() || !requesterDept.trim() || !customerName.trim()) {
      toast.error('Lengkapi Nama Pemohon, Departemen, dan Nama Pelanggan.');
      return;
    }

    if (isMultiMonth && selectedMonths.length === 0) {
      toast.error('Pilih minimal satu bulan untuk laporan multi-bulan.');
      return;
    }

    setIsSubmitting(true);
    try {
      const yearNum = parseInt(periodYear, 10);
      const primaryMonth = isMultiMonth ? selectedMonths[selectedMonths.length - 1] : parseInt(periodMonth, 10);
      const periodsPayload = isMultiMonth
        ? selectedMonths.map((m) => ({ month: m, year: yearNum }))
        : null;

      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterName,
          requesterDept,
          requesterEmail,
          salesPicName: salesPicName.trim() || null,
          salesPicEmail: salesPicEmail.trim() || null,
          cePicName: cePicName.trim() || null,
          cePicEmail: cePicEmail.trim() || null,
          reportType,
          customerName,
          customerId: selectedCustomer?.id || null,
          serviceId,
          periodMonth: primaryMonth,
          periodYear: yearNum,
          periodsJson: periodsPayload,
          isRoutineSchedule,
          urgency,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirimkan permohonan.');
      }

      const periodDisplay = isMultiMonth
        ? selectedMonths.map((m) => monthNames[m - 1]).join(', ') + ` ${yearNum}`
        : `${monthNames[data.request.periodMonth - 1]} ${data.request.periodYear}`;

      setSubmittedTicket({
        ticketNumber: data.request.ticketNumber,
        customerName: data.request.customerName,
        reportType: data.request.reportType,
        period: periodDisplay,
        urgency: data.request.urgency,
        createdAt: data.request.createdAt,
      });

      toast.success(data.message || `Permintaan berhasil dikirim! Tiket: ${data.request.ticketNumber}`);
      if (onSuccess) {
        onSuccess(data.request.ticketNumber);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Kesalahan: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSelectedCustomer(null);
    setCustomerName('');
    setServiceId('');
    setNotes('');
    setUrgency('NORMAL');
    setSubmittedTicket(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10">
        <div className="w-screen max-w-xl md:max-w-2xl bg-white shadow-2xl flex flex-col h-full transform transition ease-in-out duration-300 animate-in slide-in-from-right">
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shadow-xs">
                <Send className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base font-heading font-bold text-slate-900">
                  New Report Request
                </h2>
                <p className="text-xs text-slate-500">
                  Submit a ticket for official MRTG or SLA compliance report.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Close panel (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {submittedTicket ? (
              /* ================= SUCCESS CONFIRMATION VIEW ================= */
              <div className="bg-white rounded-xl border border-emerald-200 shadow-xs p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-slate-900">
                    Request Submitted Successfully!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm">
                    Your request ticket has been queued and an automated alert has been dispatched to the team via Telegram.
                  </p>
                </div>

                {/* Ticket Card */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Ticket Number</span>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
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
                      <span className="text-xs text-slate-500 font-medium block">Customer</span>
                      <span className="font-semibold text-slate-800">{submittedTicket.customerName}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Report Type</span>
                      <span className="font-semibold text-slate-800">{submittedTicket.reportType}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Period</span>
                      <span className="font-medium text-slate-700">{submittedTicket.period}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 font-medium block">Priority</span>
                      <Badge variant={submittedTicket.urgency === 'URGENT' ? 'destructive' : 'info'} dot>
                        {submittedTicket.urgency === 'URGENT' ? 'Urgent' : 'Normal'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleResetForm}
                    className="w-full sm:w-auto text-xs"
                  >
                    + Submit Another Request
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleClose}
                    className="w-full sm:w-auto text-xs"
                  >
                    Done (View in Queue)
                  </Button>
                </div>
              </div>
            ) : (
              /* ================= REQUEST FORM ================= */
              <form id="new-request-drawer-form" onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Requester Information */}
                <div className="space-y-3.5 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <User className="w-4 h-4 text-orange-600" />
                    <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                      1. Requester Information
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <FormField label="Full Name" required>
                      <Input
                        value={requesterName}
                        onChange={(e) => setRequesterName(e.target.value)}
                        required
                        className="text-xs h-9"
                      />
                    </FormField>

                    <FormField
                      label="Department / Division"
                      required
                      hint={
                        currentUser?.role !== 'ADMIN'
                          ? 'Terkunci otomatis sesuai akun Anda.'
                          : undefined
                      }
                    >
                      <Select
                        value={requesterDept}
                        onValueChange={setRequesterDept}
                        disabled={currentUser ? currentUser.role !== 'ADMIN' : false}
                      >
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Network Operation">Network Operation</SelectItem>
                          <SelectItem value="Customer Experience">Customer Experience</SelectItem>
                          <SelectItem value="Account Executive">Account Executive</SelectItem>
                          <SelectItem value="Finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>

                    {/* PIC Sales / Account Executive Dropdown */}
                    <FormField label="PIC Sales / Account Executive (Opsional)">
                      <Select
                        value={salesPicName}
                        onValueChange={(val) => {
                          const cleanVal = val === 'NONE' ? '' : val;
                          setSalesPicName(cleanVal);
                          const found = staffList.find((s) => s.name === cleanVal);
                          setSalesPicEmail(found?.email || '');
                        }}
                      >
                        <SelectTrigger className="text-xs h-9 bg-white">
                          <SelectValue placeholder="Pilih PIC Sales..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">-- Tanpa PIC Sales Khusus --</SelectItem>
                          {staffList
                            .filter((s) => s.department === 'Account Executive')
                            .map((s) => (
                              <SelectItem key={s.id} value={s.name}>
                                {s.name} ({s.roleTitle || 'AE'})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    {/* PIC Customer Experience Dropdown */}
                    <FormField label="PIC Customer Experience (Opsional)">
                      <Select
                        value={cePicName}
                        onValueChange={(val) => {
                          const cleanVal = val === 'NONE' ? '' : val;
                          setCePicName(cleanVal);
                          const found = staffList.find((s) => s.name === cleanVal);
                          setCePicEmail(found?.email || '');
                        }}
                      >
                        <SelectTrigger className="text-xs h-9 bg-white">
                          <SelectValue placeholder="Pilih PIC CE..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">-- Tanpa PIC CE Khusus --</SelectItem>
                          {staffList
                            .filter((s) => s.department === 'Customer Experience')
                            .map((s) => (
                              <SelectItem key={s.id} value={s.name}>
                                {s.name} ({s.roleTitle || 'CE'})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <div className="sm:col-span-2">
                      <FormField label="Email / WhatsApp Contact">
                        <Input
                          type="text"
                          value={requesterEmail}
                          onChange={(e) => setRequesterEmail(e.target.value)}
                          placeholder="e.g. requester@company.com or 0812xxxx"
                          className="text-xs h-9"
                        />
                      </FormField>
                    </div>
                  </div>
                </div>

                {/* Section 2: Customer & Report Details */}
                <div className="space-y-3.5 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <Building2 className="w-4 h-4 text-orange-600" />
                    <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                      2. Customer &amp; Report Details
                    </h3>
                  </div>

                  {/* Report Type Selector */}
                  <FormField label="Required Report Type" required>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReportType('SLA')}
                        className={`p-2.5 rounded-lg border text-center transition cursor-pointer select-none ${
                          reportType === 'SLA'
                            ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500 text-orange-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">SLA Report</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportType('MRTG')}
                        className={`p-2.5 rounded-lg border text-center transition cursor-pointer select-none ${
                          reportType === 'MRTG'
                            ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500 text-orange-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">MRTG Report</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportType('BOTH')}
                        className={`p-2.5 rounded-lg border text-center transition cursor-pointer select-none ${
                          reportType === 'BOTH'
                            ? 'border-orange-500 bg-orange-50 ring-1 ring-orange-500 text-orange-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">Both (SLA &amp; MRTG)</div>
                      </button>
                    </div>
                  </FormField>

                  {/* Customer Autocomplete & Selection */}
                  <div ref={dropdownRef}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-700">
                        Customer Name <span className="text-rose-500">*</span>
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsBrowseModalOpen(true);
                          fetchModalCustomers(modalSearch);
                        }}
                        className="h-6 text-xs text-orange-600 hover:text-orange-700 px-2 font-medium"
                      >
                        <Building2 className="w-3.5 h-3.5 mr-1" />
                        <span>Browse Directory</span>
                      </Button>
                    </div>

                    {selectedCustomer ? (
                      <div className="flex items-center justify-between p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg animate-in fade-in">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-emerald-950 flex items-center gap-2 flex-wrap">
                              <span>{selectedCustomer.customerName}</span>
                              <Badge variant="success" className="text-[10px] py-0 px-1.5">
                                Registered in Directory
                              </Badge>
                            </div>
                            <div className="text-[11px] text-emerald-700 mt-0.5 truncate">
                              SID: <span className="font-mono font-semibold">{selectedCustomer.serviceId}</span>
                              <span className="mx-1">•</span>
                              CID: <span className="font-mono">{selectedCustomer.customerId}</span>
                              <span className="mx-1">•</span>
                              <span>{selectedCustomer.serviceName}</span>
                            </div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleClearCustomer}
                          className="text-xs text-slate-500 hover:text-slate-800 h-7 px-2"
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          value={customerName}
                          placeholder="Ketik nama pelanggan untuk autocomplete..."
                          onChange={(e) => {
                            setCustomerName(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => {
                            setShowCustomerDropdown(true);
                            if (customerResults.length === 0) fetchAutocompleteCustomers(customerName);
                          }}
                          required
                          className="text-xs h-9 bg-white"
                        />
                        {isSearchingCustomer && (
                          <div className="absolute right-3 top-2.5">
                            <Spinner size="sm" className="text-orange-600" />
                          </div>
                        )}

                        {showCustomerDropdown && (
                          <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                            {customerResults.length > 0 ? (
                              customerResults.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleSelectCustomer(c)}
                                  className="w-full p-2.5 text-left hover:bg-orange-50/60 transition flex items-center justify-between gap-3 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="font-semibold text-slate-900 truncate">
                                      {c.customerName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                      <span className="font-mono text-slate-700 font-medium">SID: {c.serviceId}</span>
                                      <span>•</span>
                                      <span className="font-mono text-slate-500">CID: {c.customerId}</span>
                                      <span>•</span>
                                      <span className="text-slate-600 truncate">{c.serviceName}</span>
                                    </div>
                                  </div>
                                  <Badge variant="soft" className="shrink-0 text-[10px]">
                                    Select
                                  </Badge>
                                </button>
                              ))
                            ) : (
                              <div className="p-3 text-center text-xs text-slate-500">
                                {customerName.trim() ? (
                                  <span>No matching customer found. Continue typing to use custom name.</span>
                                ) : (
                                  <span>Start typing to search registered customers...</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <FormField label="Service ID / Customer ID">
                    <Input
                      value={serviceId}
                      onChange={(e) => setServiceId(e.target.value)}
                      placeholder="Optional SID/CID reference"
                      className="text-xs font-mono h-9 bg-white"
                    />
                  </FormField>

                  {/* Period Mode Selector */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800">
                        Periode Laporan yang Diminta <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-medium">
                        <button
                          type="button"
                          onClick={() => setIsMultiMonth(false)}
                          className={`px-2.5 py-1 rounded-md transition ${
                            !isMultiMonth
                              ? 'bg-white text-slate-900 font-bold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Bulan Tunggal
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsMultiMonth(true)}
                          className={`px-2.5 py-1 rounded-md transition ${
                            isMultiMonth
                              ? 'bg-white text-slate-900 font-bold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Multi-Bulan
                        </button>
                      </div>
                    </div>

                    {!isMultiMonth ? (
                      <div className="grid grid-cols-2 gap-3.5">
                        <FormField label="Pilihan Bulan" required>
                          <Select value={periodMonth} onValueChange={setPeriodMonth}>
                            <SelectTrigger className="text-xs h-9 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {monthNames.map((m, idx) => {
                                const mNum = idx + 1;
                                const isPrev = mNum === defaultPrevMonth;
                                const isCurr = mNum === currentMonth;
                                const isNext = mNum > currentMonth;
                                return (
                                  <SelectItem key={m} value={String(mNum)}>
                                    {m} {isPrev ? '★ (Bulan Lalu)' : isCurr ? '(Bulan Berjalan)' : isNext ? '🗓️ (Bulan Depan)' : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </FormField>

                        <FormField label="Tahun Laporan" required>
                          <Select value={periodYear} onValueChange={setPeriodYear}>
                            <SelectTrigger className="text-xs h-9 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                  {y}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormField>
                      </div>
                    ) : (
                      /* Multi-Month Selector */
                      <div className="space-y-2 p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="flex items-center justify-between text-xs text-slate-600 pb-1.5 border-b border-slate-100">
                          <span>Pilih bulan ({selectedMonths.length} bulan terpilih):</span>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const qMonths = [defaultPrevMonth - 2, defaultPrevMonth - 1, defaultPrevMonth]
                                  .map((m) => (m <= 0 ? m + 12 : m));
                                setSelectedMonths(qMonths);
                              }}
                              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200"
                            >
                              Kuartal Terakhir
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedMonths([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])}
                              className="text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded"
                            >
                              Semua
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                          {monthNames.map((m, idx) => {
                            const mNum = idx + 1;
                            const isSelected = selectedMonths.includes(mNum);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => {
                                  setSelectedMonths((prev) =>
                                    prev.includes(mNum)
                                      ? prev.filter((x) => x !== mNum)
                                      : [...prev, mNum].sort((a, b) => a - b)
                                  );
                                }}
                                className={`py-1.5 px-2 rounded text-xs font-semibold text-center border transition select-none ${
                                  isSelected
                                    ? 'bg-orange-500 text-white border-orange-600 shadow-2xs'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {m.slice(0, 3)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Routine Schedule Checkbox & Banner */}
                    <div className="pt-2 border-t border-slate-200/60 space-y-2">
                      <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-slate-800">
                        <input
                          type="checkbox"
                          checked={isRoutineSchedule}
                          onChange={(e) => setIsRoutineSchedule(e.target.checked)}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-4 h-4 mt-0.5"
                        />
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            Daftarkan ke Kalender Rutin Bulanan NOC (Monthly Schedule 24 Jam)
                          </span>
                          <span className="text-[11px] text-slate-500 block leading-relaxed">
                            Centang agar pelanggan ini otomatis masuk dalam tugas rutin bulanan NOC tanpa perlu request manual lagi.
                          </span>
                        </div>
                      </label>

                      {/* Auto alert for future months */}
                      {parseInt(periodMonth, 10) > currentMonth && parseInt(periodYear, 10) >= currentYear && (
                        <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>
                            <strong>Bulan Mendatang Terdeteksi:</strong> Periode yang dipilih adalah bulan depan. Permintaan ini otomatis didaftarkan ke Kalender Rutin Bulanan.
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Priority & Notes */}
                <div className="space-y-3.5 p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <h3 className="font-heading text-xs font-bold text-slate-900 uppercase tracking-wider">
                      3. Priority &amp; Notes
                    </h3>
                  </div>

                  <FormField label="Request Priority" required>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setUrgency('NORMAL')}
                        className={`p-2.5 rounded-lg border text-center transition cursor-pointer select-none ${
                          urgency === 'NORMAL'
                            ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500 text-emerald-800'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Normal Priority</span>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setUrgency('URGENT')}
                        className={`p-2.5 rounded-lg border text-center transition cursor-pointer select-none ${
                          urgency === 'URGENT'
                            ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-500 text-rose-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Urgent Priority</span>
                        </div>
                      </button>
                    </div>
                  </FormField>

                  <FormField label="Additional Notes / Client Instructions">
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Include specific maintenance downtime note for client meeting..."
                      className="text-xs bg-white"
                    />
                  </FormField>
                </div>
              </form>
            )}
          </div>

          {/* Drawer Footer (Sticky) */}
          {!submittedTicket && (
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleClose}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="new-request-drawer-form"
                variant="primary"
                size="sm"
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs px-5 shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    <span>Submit Request</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Browse Customer Directory Dialog (Layered on top of Drawer) */}
      <Dialog open={isBrowseModalOpen} onOpenChange={setIsBrowseModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6 z-[60]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Building2 className="w-5 h-5 text-orange-600" />
              <span>Select Customer from Directory</span>
            </DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-3 flex-1 flex flex-col min-h-0">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
              <Input
                value={modalSearch}
                onChange={(e) => {
                  setModalSearch(e.target.value);
                  fetchModalCustomers(e.target.value);
                }}
                placeholder="Search customers..."
                className="pl-9 text-xs"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-80">
              {isModalLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
                  <span>Loading customer directory...</span>
                </div>
              ) : modalCustomers.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  {modalSearch.trim()
                    ? `No customers found matching "${modalSearch}"`
                    : 'No customer records available in directory.'}
                </div>
              ) : (
                modalCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {c.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-700 font-medium">SID: {c.serviceId}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-500">CID: {c.customerId}</span>
                        <span>•</span>
                        <span className="text-slate-600 truncate">{c.serviceName}</span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        handleSelectCustomer(c);
                        setIsBrowseModalOpen(false);
                      }}
                      className="text-xs h-7 px-2.5"
                    >
                      Select
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => setIsBrowseModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

