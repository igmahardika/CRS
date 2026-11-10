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
  StatCard,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Spinner,
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
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REVISION_NEEDED';
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REVISION_NEEDED'>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [copiedDocNum, setCopiedDocNum] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);

  // Approval / Revision states
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModalReport, setRejectModalReport] = useState<SavedReport | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  const isSupervisorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR';
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
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => r.status === 'PENDING_APPROVAL').length;
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
        title="Report History"
        description="Search, preview, and download archived MRTG and SLA compliance PDF documents."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
      />

      {/* Summary Stat Cards (Clean, uniform slate chip) */}
      {reports.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Laporan"
            value={totalReports}
            icon={FileText}
            subtext="Arsip dokumen tersimpan"
          />
          <StatCard
            label="Menunggu Approval"
            value={pendingReports}
            icon={Clock}
            subtext="Butuh review Supervisor"
          />
          <StatCard
            label="Disetujui (Approved)"
            value={approvedReports}
            icon={CheckCircle2}
            subtext="Siap didistribusikan"
          />
          <StatCard
            label="Perlu Revisi"
            value={revisionReports}
            icon={AlertTriangle}
            subtext="Catatan evaluasi aktif"
          />
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. dokumen, pelanggan, service ID, atau staf..."
            className="pl-9 pr-9 h-9 text-[13px]"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearch('')}
              className="absolute right-1 top-0.5 h-8 w-8 text-slate-400 hover:text-slate-600"
              title="Hapus pencarian"
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
              className="text-xs text-[#EA580C] hover:text-[#C2410C] hover:bg-orange-50 h-8 px-2.5 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}

          {/* Status Tabs */}
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
              <span>Semua ({totalReports})</span>
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
              <span>Revisi ({revisionReports})</span>
            </Button>
          </div>

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
              <span>Tipe: Semua</span>
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
            <Spinner size="md" className="mx-auto text-[#EA580C] mb-2" />
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
              actionLabel="Reset Semua Filter"
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
              title="Belum Ada Laporan Tersimpan"
              description="Laporan yang di-generate staf akan otomatis tersimpan di sini dan menunggu persetujuan Supervisor."
              action={
                <Link href="/">
                  <Button variant="primary" size="sm">
                    <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                    <span>Buka Report Generator</span>
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
                  <TableHead className="w-16">Tipe</TableHead>
                  <TableHead className="w-32">Status Approval</TableHead>
                  <TableHead>No. Dokumen</TableHead>
                  <TableHead>Pelanggan & Service</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-center">SLA</TableHead>
                  <TableHead>Dibuat Oleh</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
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
                        ) : (
                          <Badge variant="warning" dot={true}>
                            Menunggu Approval
                          </Badge>
                        )}
                      </TableCell>

                      {/* Document Number */}
                      <TableCell className="text-xs font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{r.documentNumber}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyDocNum(r.documentNumber)}
                            className="h-6 w-6 text-slate-400 hover:text-slate-700"
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
                        <div className="text-[11px] text-slate-400 font-normal">
                          SID: {r.serviceId || r.customerId}
                        </div>
                      </TableCell>

                      {/* Period */}
                      <TableCell className="text-slate-600 font-medium text-xs">
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
                          >
                            {(r.onlinePercent || 100).toFixed(2)}%
                          </Badge>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>

                      {/* Generated By */}
                      <TableCell className="text-slate-700 text-xs">
                        <div className="font-medium">{r.generatedByName || 'Staf Internal'}</div>
                        {r.approvedByName && (
                          <div className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                            <CheckCheck className="w-3 h-3" />
                            <span>Approved by {r.approvedByName}</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Created Date */}
                      <TableCell suppressHydrationWarning className="text-slate-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick View */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedReport(r)}
                            title="Lihat Ringkasan & Status"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>

                          {/* Supervisor / Admin Approval Actions */}
                          {isSupervisorOrAdmin && (r.status === 'PENDING_APPROVAL' || r.status === 'REVISION_NEEDED') && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleApproveReport(r.id)}
                                disabled={isApproving}
                                className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                title="Setujui Laporan (Approve)"
                              >
                                {isApproving ? (
                                  <Spinner size="sm" className="text-emerald-600" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setRejectModalReport(r);
                                  setRejectionNotes('');
                                }}
                                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                title="Minta Revisi ke Staf"
                              >
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                            </>
                          )}

                          {/* Download Button: Only active if APPROVED. If not approved, supervisor can preview, staff is locked */}
                          {r.status === 'APPROVED' ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleDownloadPdf(r)}
                              loading={isDownloading}
                              className="text-[#C2410C] border-orange-200 hover:bg-orange-50 font-medium"
                            >
                              <Download className="w-3.5 h-3.5 mr-1 text-[#EA580C]" />
                              <span>Download</span>
                            </Button>
                          ) : isSupervisorOrAdmin ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPdf(r)}
                              loading={isDownloading}
                              className="text-slate-500 hover:text-slate-800 text-xs"
                              title="Pratinjau Draf PDF Sebelum Approval"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              <span>Draf PDF</span>
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                              className="opacity-50 cursor-not-allowed text-xs text-slate-400 bg-slate-100"
                              title="Laporan ini masih menunggu approval Supervisor sebelum dapat diunduh"
                            >
                              <Lock className="w-3 h-3 mr-1" />
                              <span>Pending</span>
                            </Button>
                          )}

                          {/* Delete Report */}
                          {!isViewer && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingReport({ id: r.id, docNum: r.documentNumber })}
                              title="Hapus Laporan"
                              className="hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 text-rose-600" />
                            </Button>
                          )}
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

      {/* Modal Quick View Detail */}
      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ringkasan Laporan & Status</DialogTitle>
            <p className="text-xs text-slate-500">{selectedReport?.documentNumber}</p>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 text-xs font-sans py-2">
              {/* Approval Status Banner */}
              {selectedReport.status === 'APPROVED' ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 flex items-start gap-2.5">
                  <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Laporan Telah Disetujui (Approved)</div>
                    <div className="text-[11px] text-emerald-700">
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
                  <div className="text-[11px] text-rose-700">
                    Catatan dari Supervisor:
                    <div className="p-2 bg-white/80 rounded border border-rose-200 mt-1 italic font-medium">
                      &quot;{selectedReport.rejectionNotes || 'Silakan cek kembali kesesuaian data SLA dan grafik.'}&quot;
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Menunggu Approval Supervisor</div>
                    <div className="text-[11px] text-amber-700">
                      Dibuat oleh <strong>{selectedReport.generatedByName || 'Staf'}</strong>. Memerlukan verifikasi sebelum dokumen resmi dapat diunduh staf.
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px] block">Nama Pelanggan</span>
                  <div className="font-semibold text-slate-900">{selectedReport.customerName}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Customer ID / Service ID</span>
                  <div className="text-slate-700">
                    {selectedReport.customerId} / {selectedReport.serviceId}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Periode Laporan</span>
                  <div className="font-medium text-slate-800">{selectedReport.reportPeriod}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Tipe Dokumen</span>
                  <div className="font-semibold text-[#EA580C]">{selectedReport.reportType} Report</div>
                </div>
              </div>

              {selectedReport.reportType === 'SLA' && (
                <div>
                  <div className="font-semibold text-slate-800 mb-2">Performa Layanan SLA</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="text-[11px] text-emerald-700 font-medium">Online</div>
                      <div className="text-sm font-bold text-emerald-700 tabular-nums">
                        {(selectedReport.onlinePercent || 100).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                      <div className="text-[11px] text-rose-700 font-medium">Downtime</div>
                      <div className="text-sm font-bold text-rose-700 tabular-nums">
                        {(selectedReport.downtimePercent || 0).toFixed(2)}%
                      </div>
                    </div>
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-[11px] text-blue-700 font-medium">Target SLA</div>
                      <div className="text-sm font-bold text-blue-700 tabular-nums">
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

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Button variant="secondary" onClick={() => setSelectedReport(null)}>
                  Tutup
                </Button>

                <div className="flex items-center gap-2">
                  {isSupervisorOrAdmin && selectedReport.status !== 'APPROVED' && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setRejectModalReport(selectedReport);
                          setRejectionNotes('');
                        }}
                        className="text-amber-700 hover:bg-amber-50"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mr-1" />
                        <span>Minta Revisi</span>
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => handleApproveReport(selectedReport.id)}
                        disabled={approvingId === selectedReport.id}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>Setujui (Approve)</span>
                      </Button>
                    </>
                  )}

                  {(selectedReport.status === 'APPROVED' || isSupervisorOrAdmin) && (
                    <Button variant="primary" onClick={() => handleDownloadPdf(selectedReport)}>
                      <Download className="w-4 h-4 mr-1.5" />
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
            <DialogTitle>Minta Revisi Laporan</DialogTitle>
            <p className="text-xs text-slate-500">{rejectModalReport?.documentNumber} - {rejectModalReport?.customerName}</p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <FormField label="Catatan Evaluasi / Hal yang Perlu Diperbaiki" required>
              <Textarea
                rows={4}
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Contoh: Periode SLA belum mencakup tiket pemadaman tanggal 15. Mohon periksa kembali durasi downtime."
                required
              />
            </FormField>
            <p className="text-[11px] text-slate-500">
              Catatan ini akan disimpan pada dokumen dan notifikasi otomatis akan dikirim ke topik Telegram tim.
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setRejectModalReport(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectReport}
              disabled={isSubmittingReject || !rejectionNotes.trim()}
              loading={isSubmittingReject}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
              <span>Kirim Catatan Revisi</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Report Deletion */}
      <ConfirmDialog
        open={Boolean(deletingReport)}
        onOpenChange={(open) => !open && setDeletingReport(null)}
        title="Hapus Arsip Laporan"
        description={`Hapus laporan "${deletingReport?.docNum}" secara permanen dari arsip sistem? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus Laporan"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
