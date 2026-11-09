'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Download,
  Trash2,
  Search,
  FileText,
  ShieldCheck,
  ArrowLeft,
  ExternalLink,
  Calendar,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Copy,
  Check,
  SearchX,
  RotateCcw,
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
  Badge,
  ConfirmDialog,
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
  createdAt: string;
}

export default function HistoryPage() {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'MRTG' | 'SLA'>('ALL');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [copiedDocNum, setCopiedDocNum] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'ADMIN' | 'OPERATOR' | 'VIEWER' | null>(null);

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
        if (data?.user?.role) setCurrentUserRole(data.user.role);
      })
      .catch(() => { });
  }, []);

  const [deletingReport, setDeletingReport] = useState<{ id: string; docNum: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deletingReport) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/reports?id=${deletingReport.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Report "${deletingReport.docNum}" deleted successfully`);
        fetchReports();
        if (selectedReport?.id === deletingReport.id) setSelectedReport(null);
        setDeletingReport(null);
      } else {
        toast.error('Failed to delete report from archive');
      }
    } catch {
      toast.error('An unexpected error occurred while deleting report');
    } finally {
      setIsDeleting(false);
    }
  };

  // Instant direct physical PDF download
  const handleDownloadPdf = (report: SavedReport) => {
    setDownloadingId(report.id);
    const downloadUrl = `/api/reports/download?id=${report.id}`;

    // Direct browser trigger
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
    const matchesSearch =
      r.customerName.toLowerCase().includes(search.toLowerCase()) ||
      r.documentNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.customerId.toLowerCase().includes(search.toLowerCase()) ||
      r.reportPeriod.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'ALL' || r.reportType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const totalReports = reports.length;
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
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Generator</span>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-orange-500" />
            <span>Report History & Archive</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search, preview, and download archived MRTG and SLA compliance PDF documents.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs self-start md:self-auto"
        >
          <FileText className="w-4 h-4" />
          <span>New Report</span>
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Reports</div>
            <div className="text-lg sm:text-xl font-black text-slate-900">{totalReports} Docs</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">SLA Reports</div>
            <div className="text-lg sm:text-xl font-black text-slate-900">{slaReports} Docs</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">MRTG Reports</div>
            <div className="text-lg sm:text-xl font-black text-slate-900">{mrtgReports} Docs</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Average SLA</div>
            <div className="text-lg sm:text-xl font-black text-emerald-600">{avgSla}%</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search document number, customer, or ID..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          />
        </div>

        {/* Type Tabs & Reset */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {(search || typeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
              }}
              className="inline-flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-semibold hover:underline mr-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${typeFilter === 'ALL'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              All ({reports.length})
            </button>
            <button
              onClick={() => setTypeFilter('SLA')}
              className={`px-3 py-1.5 rounded-lg transition ${typeFilter === 'SLA'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              SLA ({slaReports})
            </button>
            <button
              onClick={() => setTypeFilter('MRTG')}
              className={`px-3 py-1.5 rounded-lg transition ${typeFilter === 'MRTG'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              MRTG ({mrtgReports})
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && (
          <div className="py-16 text-center text-xs text-slate-400">Loading report history...</div>
        )}

        {!loading && filtered.length === 0 && reports.length > 0 && (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mb-3 shadow-xs">
              <SearchX className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              No Reports Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              {search ? (
                <>No reports found matching &quot;<span className="font-semibold text-slate-700">{search}</span>&quot; in category {typeFilter === 'ALL' ? 'All' : typeFilter}.</>
              ) : (
                <>No reports available for type <span className="font-semibold text-slate-700">{typeFilter}</span>.</>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Search & Filters</span>
            </button>
          </div>
        )}

        {!loading && filtered.length === 0 && reports.length === 0 && (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 mb-1">No Archived Reports Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              Saved reports will automatically appear here with permanent physical PDF storage.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
            >
              <span>Open Report Generator</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto relative scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 shadow-xs">
                <tr className="text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Document Number</th>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Period</th>
                  <th className="py-3.5 px-4 text-center">SLA Result</th>
                  <th className="py-3.5 px-4">Storage Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const isSla = r.reportType === 'SLA';
                  const isDownloading = downloadingId === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${isSla
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-orange-100 text-orange-800 border border-orange-200'
                            }`}
                        >
                          {r.reportType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center space-x-1.5">
                          <span>{r.documentNumber}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyDocNum(r.documentNumber)}
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                            title="Salin nomor dokumen"
                          >
                            {copiedDocNum === r.documentNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {r.customerName}
                        <div className="text-[10px] font-mono text-slate-400 font-normal">
                          {r.customerId}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {r.reportPeriod}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isSla ? (
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${(r.onlinePercent || 100) >= (r.targetSla || 99.5)
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                          >
                            {(r.onlinePercent || 100).toFixed(2)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <FileCheck className="w-3 h-3 text-emerald-600" />
                          <span>PDF Stored</span>
                        </span>
                      </td>
                      <td suppressHydrationWarning className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedReport(r)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="View Summary"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(r)}
                          disabled={isDownloading}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg font-bold text-xs transition shadow-2xs"
                          title="Download archived PDF file"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isDownloading ? 'Downloading...' : 'Download PDF'}</span>
                        </button>
                        {currentUserRole !== 'VIEWER' && (
                          <button
                            onClick={() => setDeletingReport({ id: r.id, docNum: r.documentNumber })}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                            title="Delete Report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Quick View Detail */}
      <Dialog open={Boolean(selectedReport)} onOpenChange={(open) => !open && setSelectedReport(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Report Summary</DialogTitle>
            <p className="text-[12px] font-mono text-slate-500">{selectedReport?.documentNumber}</p>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 text-[13px] font-sans py-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px] block">Customer Name</span>
                  <div className="font-semibold text-slate-900">{selectedReport.customerName}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Customer ID / Service ID</span>
                  <div className="font-mono text-slate-700">{selectedReport.customerId} / {selectedReport.serviceId}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Report Period</span>
                  <div className="font-medium text-slate-800">{selectedReport.reportPeriod}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Document Type</span>
                  <div className="font-semibold text-[#EA580C]">{selectedReport.reportType} Report</div>
                </div>
              </div>

              {selectedReport.reportType === 'SLA' && (
                <div>
                  <div className="text-[13px] font-semibold text-slate-800 mb-2">SLA Performance</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="text-[11px] text-emerald-700 font-medium">Online</div>
                      <div className="text-[14px] font-bold text-emerald-700 tabular-nums">{(selectedReport.onlinePercent || 100).toFixed(2)}%</div>
                    </div>
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                      <div className="text-[11px] text-rose-700 font-medium">Downtime</div>
                      <div className="text-[14px] font-bold text-rose-700 tabular-nums">{(selectedReport.downtimePercent || 0).toFixed(2)}%</div>
                    </div>
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-[11px] text-blue-700 font-medium">Target SLA</div>
                      <div className="text-[14px] font-bold text-blue-700 tabular-nums">{(selectedReport.targetSla && selectedReport.targetSla > 0) ? `${selectedReport.targetSla.toFixed(2)}%` : 'No SLA'}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-[12px] text-slate-500 flex justify-between">
                    <span>Downtime Duration: <strong className="text-slate-700">{selectedReport.downtimeDurationStr || '-'}</strong></span>
                    <span>Total Downtime: <strong className="text-slate-700 tabular-nums">{selectedReport.totalDowntimeMinutes || 0} mins</strong></span>
                  </div>
                </div>
              )}

              <div>
                <div className="text-[13px] font-semibold text-slate-800 mb-1">Traffic Summary</div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-[12px] text-slate-700">
                  <div>Download: Average <strong>{selectedReport.dlAvg ?? '-'} {selectedReport.dlUnit || 'Mbps'}</strong>, Peak <strong>{selectedReport.dlMax ?? '-'} {selectedReport.dlUnit || 'Mbps'}</strong></div>
                  <div>Upload: Average <strong>{selectedReport.ulAvg ?? '-'} {selectedReport.ulUnit || 'Mbps'}</strong>, Peak <strong>{selectedReport.ulMax ?? '-'} {selectedReport.ulUnit || 'Mbps'}</strong></div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => handleDownloadPdf(selectedReport)}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Download PDF
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Report Deletion */}
      <ConfirmDialog
        open={Boolean(deletingReport)}
        onOpenChange={(open) => !open && setDeletingReport(null)}
        title="Delete Archived Report"
        description={
          deletingReport ? (
            <>
              Are you sure you want to permanently delete report <strong className="text-slate-900">{deletingReport.docNum}</strong> from the database and server storage? This action cannot be undone.
            </>
          ) : null
        }
        confirmText="Delete Report"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
