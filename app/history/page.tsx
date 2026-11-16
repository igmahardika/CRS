'use client';

import React, { useState, useEffect } from 'react';
import {
  Download,
  Trash2,
  Search,
  FileText,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  Eye,
  CheckCircle2,
  Copy,
  Check,
  SearchX,
  RotateCcw,
  X,
  Clock,
  AlertTriangle,
  CheckCheck,
  Lock,
  MessageSquare,
  FileCheck,
  Edit3,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MoreVertical,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  FormField,
  Badge,
  ConfirmDialog,
  PageHeader,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Spinner,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui';

interface SavedReport {
  id: string;
  reportType: 'MRTG' | 'SLA';
  documentNumber: string;
  customerName: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  nodeCount: number;
  targetSla: number;
  reportPeriod: string;
  periodMonth: number;
  periodYear: number;
  graphId?: string;
  dlAvg?: number;
  dlMax?: number;
  ulAvg?: number;
  ulMax?: number;
  dlUnit?: string;
  ulUnit?: string;
  trafficDirection?: 'NORMAL' | 'REVERSED';
  onlinePercent?: number;
  downtimePercent?: number;
  availabilityPercent?: number;
  totalDowntimeMinutes?: number;
  downtimeDurationStr?: string;
  tickets?: string;
  cases?: string;
  pdfPath?: string;
  status: 'PENDING_APPROVAL' | 'PENDING_NOC_APPROVAL' | 'PENDING_DEPT_APPROVAL' | 'APPROVED' | 'REVISION_NEEDED';
  assignedDepartment?: string;
  generatedById?: string;
  generatedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectionNotes?: string;
  createdAt: string;
}

export default function HistoryPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MRTG' | 'SLA'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [previewTab, setPreviewTab] = useState<'pdf' | 'data'>('pdf');
  const [copiedDocNum, setCopiedDocNum] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name?: string;
    username?: string;
    role: string;
    department: string;
    defaultRoute?: string;
  } | null>(null);

  // Approval / Revision states
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModalReport, setRejectModalReport] = useState<SavedReport | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const isNocOrAdmin =
    currentUser?.role === 'ADMIN' || currentUser?.department === 'Network Operation';
  const isSupervisorOrAdmin =
    currentUser?.role === 'ADMIN' || (currentUser?.role === 'SUPERVISOR' && isNocOrAdmin);
  const isViewer = currentUser?.role === 'VIEWER';

  const handleCopyDocNum = (docNum: string) => {
    navigator.clipboard.writeText(docNum);
    setCopiedDocNum(docNum);
    setTimeout(() => setCopiedDocNum(null), 2000);
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    // Read ?status= parameter from URL if opened via Approval Queue shortcut
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('status');
      if (s === 'PENDING_APPROVAL' || s === 'APPROVED' || s === 'REVISION_NEEDED') {
        setStatusFilter(s);
      }
    }
  }, []);

  const [deletingReport, setDeletingReport] = useState<{ id: string; docNum: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingReport) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/reports?id=${deletingReport.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Report "${deletingReport.docNum}" deleted successfully.`);
        fetchReports();
        if (selectedReport?.id === deletingReport.id) setSelectedReport(null);
        setDeletingReport(null);
      } else {
        toast.error('Failed to delete report.');
      }
    } catch {
      toast.error('An unexpected error occurred while deleting report.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    setApprovingId(reportId);
    try {
      const res = await fetch('/api/reports/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve report');
      toast.success(data.message || 'Laporan berhasil disetujui (Approved). Notifikasi Telegram terkirim.');
      fetchReports();
      if (selectedReport?.id === reportId) {
        setSelectedReport((prev) => (prev ? { ...prev, status: 'APPROVED', approvedByName: currentUser?.name || 'Supervisor' } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal menyetujui: ${msg}`);
    } finally {
      setApprovingId(null);
    }
  };

  const filtered = reports.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.customerName.toLowerCase().includes(q) ||
      r.documentNumber.toLowerCase().includes(q) ||
      r.customerId.toLowerCase().includes(q) ||
      (r.serviceId && r.serviceId.toLowerCase().includes(q)) ||
      (r.generatedByName && r.generatedByName.toLowerCase().includes(q)) ||
      r.reportPeriod.toLowerCase().includes(q);

    const matchesType = typeFilter === 'ALL' || r.reportType === typeFilter;
    const isPending =
      r.status === 'PENDING_APPROVAL' ||
      r.status === 'PENDING_NOC_APPROVAL' ||
      r.status === 'PENDING_DEPT_APPROVAL';
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'PENDING_APPROVAL'
        ? isPending
        : r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const selectedIndex = selectedReport ? filtered.findIndex((r) => r.id === selectedReport.id) : -1;
  const hasPrev = selectedIndex > 0;
  const hasNext = selectedIndex >= 0 && selectedIndex < filtered.length - 1;

  const handlePrevReport = () => {
    if (hasPrev) setSelectedReport(filtered[selectedIndex - 1]);
  };

  const handleNextReport = () => {
    if (hasNext) setSelectedReport(filtered[selectedIndex + 1]);
  };

  const handleApproveAndNext = async () => {
    if (!selectedReport) return;
    const currentId = selectedReport.id;
    await handleApproveReport(currentId);
    if (hasNext) {
      setSelectedReport(filtered[selectedIndex + 1]);
    }
  };

  useEffect(() => {
    if (!selectedReport) return;
    const handleModalKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        handlePrevReport();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        handleNextReport();
      } else if ((e.key === 'a' || e.key === 'A') && isSupervisorOrAdmin && selectedReport.status !== 'APPROVED') {
        e.preventDefault();
        handleApproveAndNext();
      } else if ((e.key === 'r' || e.key === 'R') && isSupervisorOrAdmin && selectedReport.status !== 'APPROVED') {
        e.preventDefault();
        setRejectModalReport(selectedReport);
        setRejectionNotes('');
      }
    };
    window.addEventListener('keydown', handleModalKey);
    return () => window.removeEventListener('keydown', handleModalKey);
  }, [selectedReport, selectedIndex, filtered, hasPrev, hasNext, isSupervisorOrAdmin]);

  const handleRejectReport = async () => {
    if (!rejectModalReport) return;
    setIsSubmittingReject(true);
    try {
      const res = await fetch('/api/reports/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rejectModalReport.id,
          notes: rejectionNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit revision');
      toast.success(data.message || 'Status laporan diubah menjadi Perlu Revisi. Notifikasi Telegram terkirim.');
      fetchReports();
      const noteCopy = rejectionNotes;
      setRejectModalReport(null);
      setRejectionNotes('');
      if (selectedReport?.id === rejectModalReport.id) {
        setSelectedReport((prev) => (prev ? { ...prev, status: 'REVISION_NEEDED', rejectionNotes: noteCopy } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal meminta revisi: ${msg}`);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleDownloadPdf = (report: SavedReport) => {
    setDownloadingId(report.id);
    const downloadUrl = `/api/reports/download?id=${report.id}`;

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `REPORT ${report.reportType} - ${report.customerName} - ${report.reportPeriod}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      setDownloadingId(null);
    }, 1200);
  };

  const totalReports = reports.length;
  const pendingReports = reports.filter(
    (r) =>
      r.status === 'PENDING_APPROVAL' ||
      r.status === 'PENDING_NOC_APPROVAL' ||
      r.status === 'PENDING_DEPT_APPROVAL'
  ).length;
  const approvedReports = reports.filter((r) => r.status === 'APPROVED').length;
  const revisionReports = reports.filter((r) => r.status === 'REVISION_NEEDED').length;
  const slaReports = reports.filter((r) => r.reportType === 'SLA').length;
  const mrtgReports = reports.filter((r) => r.reportType === 'MRTG').length;
  const avgSla =
    reports.length > 0
      ? (
          reports.reduce((acc, curr) => acc + (curr.onlinePercent || 100), 0) /
          reports.length
        ).toFixed(2)
      : '100.00';

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title={isNocOrAdmin ? 'Report History' : 'Official Department Reports'}
        description={
          isNocOrAdmin
            ? 'Search, preview, and download archived MRTG and SLA compliance PDF documents.'
            : `Browse and download authorized compliance reports approved from your department (${currentUser?.department || ''}).`
        }
        breadcrumb={
          <Link
            href={currentUser?.defaultRoute || (isNocOrAdmin ? '/' : '/requests')}
            className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{isNocOrAdmin ? 'Back to Generator' : 'Back to Request Queue'}</span>
          </Link>
        }
      />

      {/* Compact summary inline — no redundant StatCard grid */}
      {reports.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-slate-500">
          <span className="font-mono tabular-nums font-semibold text-slate-700">{totalReports}</span>
          <span>laporan tersimpan</span>
          {isNocOrAdmin && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono tabular-nums text-amber-600 font-semibold">{pendingReports}</span>
              <span>pending</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono tabular-nums text-emerald-600 font-semibold">{approvedReports}</span>
              <span>approved</span>
              {revisionReports > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="font-mono tabular-nums text-rose-600 font-semibold">{revisionReports}</span>
                  <span>revision</span>
                </>
              )}
            </>
          )}
          {!isNocOrAdmin && (
            <>
              <span className="text-slate-300">·</span>
              <span className="font-mono tabular-nums text-blue-600 font-semibold">{slaReports}</span>
              <span>SLA</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono tabular-nums text-slate-600 font-semibold">{mrtgReports}</span>
              <span>MRTG</span>
            </>
          )}
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. dokumen, nama pelanggan, atau service ID..."
            className="pl-9 pr-9 h-9 text-[13px]"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearch('')}
              className="absolute right-1 top-0.5 h-8 w-8 text-slate-500 hover:text-slate-800"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Filter Tabs & Reset */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {(search || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
              }}
              className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 px-2.5 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}

          {/* Status Tabs (Hanya untuk NOC / Admin, karena non-NOC selalu Approved) */}
          {isNocOrAdmin && (
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <Button
                variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('ALL')}
                className={
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs h-7 px-2.5 text-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 h-7 px-2.5 text-xs'
                }
              >
                <span>All ({totalReports})</span>
              </Button>
              <Button
                variant={statusFilter === 'PENDING_APPROVAL' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('PENDING_APPROVAL')}
                className={
                  statusFilter === 'PENDING_APPROVAL'
                    ? 'bg-amber-500 text-white shadow-xs h-7 px-2.5 text-xs font-semibold hover:bg-amber-600 hover:text-white'
                    : 'text-amber-700 hover:bg-amber-50 h-7 px-2.5 text-xs font-medium'
                }
              >
                <span>Pending ({pendingReports})</span>
              </Button>
              <Button
                variant={statusFilter === 'APPROVED' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('APPROVED')}
                className={
                  statusFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-xs h-7 px-2.5 text-xs font-semibold hover:bg-emerald-700 hover:text-white'
                    : 'text-emerald-700 hover:bg-emerald-50 h-7 px-2.5 text-xs font-medium'
                }
              >
                <span>Approved ({approvedReports})</span>
              </Button>
              <Button
                variant={statusFilter === 'REVISION_NEEDED' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter('REVISION_NEEDED')}
                className={
                  statusFilter === 'REVISION_NEEDED'
                    ? 'bg-rose-600 text-white shadow-xs h-7 px-2.5 text-xs font-semibold hover:bg-rose-700 hover:text-white'
                    : 'text-rose-700 hover:bg-rose-50 h-7 px-2.5 text-xs font-medium'
                }
              >
                <span>Revision ({revisionReports})</span>
              </Button>
            </div>
          )}

          {/* Type Filter */}
          <div className="flex items-center gap-1">
            <Button
              variant={typeFilter === 'ALL' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('ALL')}
              className={
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-2.5 text-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 h-8 px-2.5 text-xs'
              }
            >
              <span>Type: All</span>
            </Button>
            <Button
              variant={typeFilter === 'SLA' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('SLA')}
              className={
                typeFilter === 'SLA'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-2.5 text-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 h-8 px-2.5 text-xs'
              }
            >
              <span>SLA ({slaReports})</span>
            </Button>
            <Button
              variant={typeFilter === 'MRTG' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('MRTG')}
              className={
                typeFilter === 'MRTG'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-2.5 text-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 h-8 px-2.5 text-xs'
              }
            >
              <span>MRTG ({mrtgReports})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {loading && (
          <div className="py-16 text-center text-xs text-slate-500">
            <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
            <span>Memuat data riwayat laporan...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && reports.length > 0 && (
          <div className="p-4">
            <EmptyState
              icon={SearchX}
              title="Tidak Ada Laporan yang Cocok"
              description={
                search
                  ? `Tidak ada laporan ditemukan dengan kata kunci "${search}" pada filter yang dipilih.`
                  : `Tidak ada laporan pada kategori filter saat ini.`
              }
              actionLabel="Reset All Filters"
              onAction={() => {
                setSearch('');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
              }}
            />
          </div>
        )}

        {!loading && filtered.length === 0 && reports.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={FileText}
              title="No Reports Archived Yet"
              description="Official compliance reports generated by staff will be archived here upon supervisor review."
              action={
                <Link href="/">
                  <Button variant="primary" size="sm">
                    <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                    <span>Open Report Generator</span>
                  </Button>
                </Link>
              }
            />
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto relative scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Type</TableHead>
                  <TableHead className="w-36">Approval Status</TableHead>
                  <TableHead>Document No.</TableHead>
                  <TableHead>Customer &amp; Service</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">SLA</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const isSla = r.reportType === 'SLA';
                  const isDownloading = downloadingId === r.id;
                  const isApproving = approvingId === r.id;

                  return (
                    <TableRow key={r.id}>
                      {/* Type */}
                      <TableCell>
                        <Badge variant={isSla ? 'info' : 'soft'}>
                          {r.reportType}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {r.status === 'APPROVED' ? (
                          <Badge variant="success" dot={true}>
                            Approved
                          </Badge>
                        ) : r.status === 'REVISION_NEEDED' ? (
                          <Badge variant="destructive" dot={true}>
                            Perlu Revisi
                          </Badge>
                        ) : r.status === 'PENDING_DEPT_APPROVAL' ? (
                          <Badge variant="outline" dot={true} className="border-purple-300 bg-purple-50 text-purple-800">
                            Menunggu Otorisasi
                          </Badge>
                        ) : (
                          <Badge variant="warning" dot={true}>
                            Verifikasi NOC
                          </Badge>
                        )}
                      </TableCell>

                      {/* Document Number */}
                      <TableCell className="text-xs font-mono font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{r.documentNumber}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyDocNum(r.documentNumber)}
                            className="h-6 w-6 text-slate-500 hover:text-slate-800"
                            title="Salin nomor dokumen"
                          >
                            {copiedDocNum === r.documentNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>

                      {/* Customer Name & SID */}
                      <TableCell className="font-semibold text-slate-900">
                        {r.customerName}
                        <div className="text-xs text-slate-500 font-normal font-mono">
                          SID: {r.serviceId || r.customerId}
                        </div>
                      </TableCell>

                      {/* Period */}
                      <TableCell className="text-slate-600 font-mono font-medium text-xs tabular-nums">
                        {r.reportPeriod}
                      </TableCell>

                      {/* SLA Result */}
                      <TableCell className="text-center">
                        {isSla ? (
                          <Badge
                            variant={
                              (r.onlinePercent || 100) >= (r.targetSla || 99.5)
                                ? 'success'
                                : 'destructive'
                            }
                            className="font-mono tabular-nums"
                          >
                            {(r.onlinePercent || 100).toFixed(2)}%
                          </Badge>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </TableCell>

                      {/* Generated By */}
                      <TableCell className="text-slate-700 text-xs">
                        <div className="font-medium">{r.generatedByName || 'Internal Staff'}</div>
                        {r.approvedByName && (
                          <div className="text-xs text-emerald-600 flex items-center gap-0.5">
                            <CheckCheck className="w-3 h-3" />
                            <span>Approved by {r.approvedByName}</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Created Date */}
                      <TableCell suppressHydrationWarning className="text-slate-500 text-xs font-mono tabular-nums">
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* 1. Primary Contextual Action Button */}
                          {r.status === 'APPROVED' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDownloadPdf(r)}
                              loading={isDownloading}
                              className="text-orange-700 border-orange-200 hover:bg-orange-50 font-medium h-7 px-2.5 text-xs shadow-2xs"
                              title="Download Official PDF Document"
                            >
                              <Download className="w-3.5 h-3.5 mr-1 text-orange-600" />
                              <span>Download PDF</span>
                            </Button>
                          ) : r.status === 'REVISION_NEEDED' ? (
                            <Link href={`/?revisingReportId=${r.id}`}>
                              <Button
                                variant="primary"
                                size="sm"
                                className="bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs h-7 px-2.5 shadow-2xs"
                                title="Open in Generator to adjust parameters and re-submit"
                              >
                                <Edit3 className="w-3 h-3 mr-1" />
                                <span>Revisi di Generator</span>
                              </Button>
                            </Link>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setSelectedReport(r);
                                setPreviewTab('pdf');
                              }}
                              className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 shadow-2xs"
                              title="Review PDF & Evaluate Details"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1 text-slate-500" />
                              <span>Review Dokumen</span>
                            </Button>
                          )}

                          {/* 2. Secondary Options Menu (...) */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="h-7 w-7 text-slate-500 hover:text-slate-800"
                                title="Pilihan Lainnya"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 p-1 text-xs">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedReport(r);
                                  setPreviewTab('pdf');
                                }}
                                className="gap-2 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Pratinjau Lengkap</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onClick={() => handleCopyDocNum(r.documentNumber)}
                                className="gap-2 cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5 text-slate-500" />
                                <span>Salin No. Dokumen</span>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <a
                                  href={`/api/reports/download?id=${r.id}&inline=1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer text-slate-700 hover:text-slate-900"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Buka Tab Baru</span>
                                </a>
                              </DropdownMenuItem>

                              {r.status !== 'APPROVED' && isSupervisorOrAdmin && (
                                <DropdownMenuItem
                                  onClick={() => handleDownloadPdf(r)}
                                  className="gap-2 cursor-pointer text-slate-700"
                                >
                                  <Download className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Unduh Draf PDF</span>
                                </DropdownMenuItem>
                              )}

                              {isNocOrAdmin && !isViewer && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => setDeletingReport({ id: r.id, docNum: r.documentNumber })}
                                    className="gap-2 cursor-pointer text-rose-600 focus:text-rose-700 focus:bg-rose-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Hapus Laporan</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal Quick View & In-App PDF Preview Detail */}
      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-5 overflow-hidden">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-slate-900">
                    {selectedReport?.customerName}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      selectedReport?.status === 'APPROVED'
                        ? 'border-emerald-300 text-emerald-800 bg-emerald-50'
                        : selectedReport?.status === 'REVISION_NEEDED'
                        ? 'border-rose-300 text-rose-800 bg-rose-50'
                        : 'border-amber-300 text-amber-800 bg-amber-50'
                    }`}
                  >
                    {selectedReport?.status === 'APPROVED'
                      ? 'Approved'
                      : selectedReport?.status === 'REVISION_NEEDED'
                      ? 'Perlu Revisi'
                      : 'Pending Approval'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                  <span>{selectedReport?.documentNumber}</span>
                  <span>•</span>
                  <span>{selectedReport?.reportPeriod}</span>
                  <span>•</span>
                  <span className="font-sans font-semibold text-orange-600">{selectedReport?.reportType} Report</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 mr-6">
              {/* Tab Switcher: PDF Preview vs Summary Data */}
              <div className="hidden sm:flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                <Button
                  type="button"
                  variant={previewTab === 'pdf' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewTab('pdf')}
                  className={`h-7 px-2.5 text-xs font-semibold ${
                    previewTab === 'pdf' ? 'bg-white text-orange-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 mr-1 text-orange-600" />
                  <span>Pratinjau PDF</span>
                </Button>
                <Button
                  type="button"
                  variant={previewTab === 'data' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewTab('data')}
                  className={`h-7 px-2.5 text-xs font-semibold ${
                    previewTab === 'data' ? 'bg-white text-orange-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-orange-600" />
                  <span>Data &amp; Ringkasan</span>
                </Button>
              </div>

              {/* Buka di Tab Baru link */}
              {selectedReport && (
                <a
                  href={`/api/reports/download?id=${selectedReport.id}&inline=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded hover:bg-slate-100 transition"
                  title="Buka dokumen PDF di tab baru peramban"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Tab Baru</span>
                </a>
              )}

              {/* Carousel Carousel Navigation */}
              {filtered.length > 1 && (
                <div className="flex items-center gap-1 text-xs text-slate-500 font-medium border-l border-slate-200 pl-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!hasPrev}
                    onClick={handlePrevReport}
                    title="Laporan Sebelumnya (←)"
                    className="h-7 w-7"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="tabular-nums text-xs font-semibold text-slate-700">
                    {selectedIndex + 1}/{filtered.length}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={!hasNext}
                    onClick={handleNextReport}
                    title="Laporan Berikutnya (→)"
                    className="h-7 w-7"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedReport && (
            <div className="flex-1 flex flex-col min-h-0 py-2 overflow-hidden">
              {/* Tab 1: Live In-App PDF Preview */}
              {previewTab === 'pdf' ? (
                <div className="flex-1 w-full h-full min-h-0 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shadow-inner relative flex flex-col">
                  <iframe
                    key={selectedReport.id}
                    src={`/api/reports/download?id=${selectedReport.id}&inline=1#toolbar=1`}
                    className="w-full h-full border-0 rounded-lg flex-1"
                    title={`Pratinjau PDF - ${selectedReport.documentNumber}`}
                  />
                </div>
              ) : (
                /* Tab 2: Metadata & Breakdown Details */
                <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-xs font-sans">
                  {/* Approval Status Banner */}
                  {selectedReport.status === 'APPROVED' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-start gap-2.5">
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Laporan Telah Disetujui (Approved)</div>
                        <div className="text-xs text-emerald-700">
                          Disetujui oleh <strong>{selectedReport.approvedByName || 'Supervisor'}</strong>
                          {selectedReport.approvedAt && ` pada ${new Date(selectedReport.approvedAt).toLocaleString('id-ID')}`}.
                          Dokumen resmi siap dikirim ke pelanggan.
                        </div>
                      </div>
                    </div>
                  ) : selectedReport.status === 'REVISION_NEEDED' ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 space-y-1">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Laporan Membutuhkan Revisi</span>
                      </div>
                      <div className="text-xs text-rose-700">
                        Catatan dari Supervisor:
                        <div className="p-2 bg-white/80 rounded border border-rose-200 mt-1 italic font-medium">
                          &quot;{selectedReport.rejectionNotes || 'Silakan cek kembali kesesuaian data SLA dan grafik.'}&quot;
                        </div>
                      </div>
                    </div>
                  ) : selectedReport.status === 'PENDING_DEPT_APPROVAL' ? (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Tahap 2: Menunggu Otorisasi {selectedReport.assignedDepartment}</div>
                        <div className="text-xs text-purple-700">
                          Dokumen telah lolos verifikasi teknis NOC dan sedang menunggu persetujuan akhir dari Supervisor departemen <strong>{selectedReport.assignedDepartment}</strong>.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">Tahap 1: Menunggu Verifikasi Teknis NOC</div>
                        <div className="text-xs text-amber-700">
                          Dibuat oleh <strong>{selectedReport.generatedByName || 'Staf'}</strong>. Memerlukan verifikasi teknis Supervisor NOC sebelum diterbitkan.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-slate-500 text-xs block">Nama Pelanggan</span>
                      <div className="font-semibold text-slate-900">{selectedReport.customerName}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">Customer ID / Service ID</span>
                      <div className="text-slate-700 font-mono text-xs">
                        {selectedReport.customerId} / {selectedReport.serviceId}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">Periode Laporan</span>
                      <div className="font-mono font-medium text-slate-800">{selectedReport.reportPeriod}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">Tipe Dokumen</span>
                      <div className="font-semibold text-orange-600">{selectedReport.reportType} Report</div>
                    </div>
                  </div>

                  {selectedReport.reportType === 'SLA' && (
                    <div>
                      <div className="font-semibold text-slate-800 mb-2">Performa Layanan SLA</div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <div className="text-xs text-emerald-700 font-medium">Online</div>
                          <div className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
                            {(selectedReport.onlinePercent || 100).toFixed(2)}%
                          </div>
                        </div>
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                          <div className="text-xs text-rose-700 font-medium">Downtime</div>
                          <div className="text-sm font-bold text-rose-700 font-mono tabular-nums">
                            {(selectedReport.downtimePercent || 0).toFixed(2)}%
                          </div>
                        </div>
                        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-xs text-blue-700 font-medium">Target SLA</div>
                          <div className="text-sm font-bold text-blue-700 font-mono tabular-nums">
                            {selectedReport.targetSla && selectedReport.targetSla > 0
                              ? `${selectedReport.targetSla.toFixed(2)}%`
                              : 'No SLA'}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-slate-500 flex justify-between">
                        <span>
                          Durasi Downtime:{' '}
                          <strong className="text-slate-700">{selectedReport.downtimeDurationStr || '-'}</strong>
                        </span>
                        <span>
                          Total Menit:{' '}
                          <strong className="text-slate-700 tabular-nums">
                            {selectedReport.totalDowntimeMinutes || 0} mnt
                          </strong>
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="font-semibold text-slate-800 mb-1">Traffic Summary</div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-slate-700">
                      <div>
                        Download: Rata-rata <strong>{selectedReport.dlAvg ?? '-'} {selectedReport.dlUnit || 'Mbps'}</strong>, Puncak <strong>{selectedReport.dlMax ?? '-'} {selectedReport.dlUnit || 'Mbps'}</strong>
                      </div>
                      <div>
                        Upload: Rata-rata <strong>{selectedReport.ulAvg ?? '-'} {selectedReport.ulUnit || 'Mbps'}</strong>, Puncak <strong>{selectedReport.ulMax ?? '-'} {selectedReport.ulUnit || 'Mbps'}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer with Actions */}
              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap shrink-0">
                <Button variant="secondary" onClick={() => setSelectedReport(null)} className="text-xs h-8">
                  Tutup
                </Button>

                <div className="flex items-center gap-2 flex-wrap">
                  {isNocOrAdmin && selectedReport.status === 'REVISION_NEEDED' && (
                    <Link href={`/?revisingReportId=${selectedReport.id}`}>
                      <Button variant="primary" className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8">
                        <Edit3 className="w-3.5 h-3.5 mr-1" />
                        <span>Revisi di Generator</span>
                      </Button>
                    </Link>
                  )}

                  {isSupervisorOrAdmin && selectedReport.status !== 'APPROVED' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setRejectModalReport(selectedReport);
                          setRejectionNotes('');
                        }}
                        className="text-amber-700 hover:bg-amber-50 text-xs h-8"
                        title="Shortcut keyboard: 'R'"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        <span>Minta Revisi (R)</span>
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleApproveAndNext}
                        disabled={approvingId === selectedReport.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8"
                        title="Shortcut keyboard: 'A'"
                      >
                        {approvingId === selectedReport.id ? (
                          <Spinner size="sm" className="mr-1 text-white" />
                        ) : (
                          <Check className="w-3.5 h-3.5 mr-1" />
                        )}
                        <span>Setujui {hasNext ? '& Lanjut (A)' : '(A)'}</span>
                      </Button>
                    </>
                  )}

                  {(selectedReport.status === 'APPROVED' || isSupervisorOrAdmin) && (
                    <Button
                      variant="ghost"
                      onClick={() => handleDownloadPdf(selectedReport)}
                      className="text-slate-600 text-xs h-8"
                      title="Unduh berkas PDF ke komputer jika diperlukan"
                    >
                      <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      <span>{selectedReport.status === 'APPROVED' ? 'Unduh PDF' : 'Draf PDF'}</span>
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Rejection / Request Revision */}
      <Dialog open={Boolean(rejectModalReport)} onOpenChange={(open) => !open && setRejectModalReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Report Revision</DialogTitle>
            <p className="text-xs text-slate-500">{rejectModalReport?.documentNumber} - {rejectModalReport?.customerName}</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <FormField label="Evaluation Notes / Required Changes" required>
              <Textarea
                rows={4}
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                required
              />
            </FormField>
            <p className="text-xs text-slate-500">
              These revision notes will be saved and dispatched to the team's Telegram topic.
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setRejectModalReport(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectReport}
              disabled={isSubmittingReject || !rejectionNotes.trim()}
              loading={isSubmittingReject}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              <span>Submit Revision Notes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Report Deletion */}
      <ConfirmDialog
        open={Boolean(deletingReport)}
        onOpenChange={(open) => !open && setDeletingReport(null)}
        title="Delete Report Archive"
        description={`Permanently delete report "${deletingReport?.docNum}" from system archives? This action cannot be undone.`}
        confirmLabel="Delete Report"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
