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
      r.reportPeriod.toLowerCase().includes(q);

    const matchesType = typeFilter === 'ALL' || r.reportType === typeFilter;
    return matchesSearch && matchesType;
  });

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
            label="Total Reports"
            value={totalReports}
            icon={FileText}
            subtext="Archived documents"
          />
          <StatCard
            label="SLA Reports"
            value={slaReports}
            icon={ShieldCheck}
            subtext="Compliance records"
          />
          <StatCard
            label="MRTG Reports"
            value={mrtgReports}
            icon={Calendar}
            subtext="Bandwidth records"
          />
          <StatCard
            label="Average SLA"
            value={`${avgSla}%`}
            icon={CheckCircle2}
            subtext="Monthly availability"
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
            placeholder="Search document number, customer, or ID..."
            className="pl-9 pr-9 h-9 text-[13px]"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearch('')}
              className="absolute right-1 top-0.5 h-8 w-8 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Type Tabs & Reset */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          {(search || typeFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setTypeFilter('ALL');
              }}
              className="text-xs text-[#EA580C] hover:text-[#C2410C] hover:bg-orange-50 h-8 px-2.5 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant={typeFilter === 'ALL' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('ALL')}
              className={
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs'
              }
            >
              <span>All ({reports.length})</span>
            </Button>
            <Button
              variant={typeFilter === 'SLA' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('SLA')}
              className={
                typeFilter === 'SLA'
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs'
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
                  ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs'
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
            <span>Loading report history...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && reports.length > 0 && (
          <div className="p-4">
            <EmptyState
              icon={SearchX}
              title="No Reports Found"
              description={
                search
                  ? `No reports found matching "${search}" in category ${typeFilter}.`
                  : `No reports available for type ${typeFilter}.`
              }
              actionLabel="Reset Search & Filters"
              onAction={() => {
                setSearch('');
                setTypeFilter('ALL');
              }}
            />
          </div>
        )}

        {!loading && filtered.length === 0 && reports.length === 0 && (
          <div className="p-4">
            <EmptyState
              icon={FileText}
              title="No Archived Reports Yet"
              description="Saved reports will automatically appear here with permanent physical PDF storage."
              action={
                <Link href="/">
                  <Button variant="primary" size="sm">
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
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
                  <TableHead className="w-20">Type</TableHead>
                  <TableHead>Document Number</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">SLA Result</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const isSla = r.reportType === 'SLA';
                  const isDownloading = downloadingId === r.id;

                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Badge variant={isSla ? 'info' : 'soft'}>
                          {r.reportType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{r.documentNumber}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyDocNum(r.documentNumber)}
                            className="h-6 w-6 text-slate-400 hover:text-slate-700"
                            title="Copy document number"
                          >
                            {copiedDocNum === r.documentNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        {r.customerName}
                        <div className="text-[11px] text-slate-400 font-normal">
                          {r.customerId}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">
                        {r.reportPeriod}
                      </TableCell>
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
                          <span className="text-slate-400 ">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral" dot={true}>
                          PDF Stored
                        </Badge>
                      </TableCell>
                      <TableCell suppressHydrationWarning className="text-slate-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedReport(r)}
                            title="View Summary"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadPdf(r)}
                            loading={isDownloading}
                          >
                            <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            <span>Download</span>
                          </Button>
                          {currentUserRole !== 'VIEWER' && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setDeletingReport({ id: r.id, docNum: r.documentNumber })}
                              title="Delete Report"
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
            <DialogTitle>Report Summary</DialogTitle>
            <p className="text-xs text-slate-500">{selectedReport?.documentNumber}</p>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 text-xs font-sans py-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px] block">Customer Name</span>
                  <div className="font-semibold text-slate-900">{selectedReport.customerName}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Customer ID / Service ID</span>
                  <div className="text-slate-700">
                    {selectedReport.customerId} / {selectedReport.serviceId}
                  </div>
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
                  <div className="font-semibold text-slate-800 mb-2">SLA Performance</div>
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
                      Downtime Duration:{' '}
                      <strong className="text-slate-700">{selectedReport.downtimeDurationStr || '-'}</strong>
                    </span>
                    <span>
                      Total Downtime:{' '}
                      <strong className="text-slate-700 tabular-nums">
                        {selectedReport.totalDowntimeMinutes || 0} mins
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              <div>
                <div className="font-semibold text-slate-800 mb-1">Traffic Summary</div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 text-slate-700">
                  <div>
                    Download: Average <strong>{selectedReport.dlAvg ?? '-'} {selectedReport.dlUnit || 'Mbps'}</strong>, Peak <strong>{selectedReport.dlMax ?? '-'} {selectedReport.dlUnit || 'Mbps'}</strong>
                  </div>
                  <div>
                    Upload: Average <strong>{selectedReport.ulAvg ?? '-'} {selectedReport.ulUnit || 'Mbps'}</strong>, Peak <strong>{selectedReport.ulMax ?? '-'} {selectedReport.ulUnit || 'Mbps'}</strong>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setSelectedReport(null)}>
                  Close
                </Button>
                <Button variant="primary" onClick={() => handleDownloadPdf(selectedReport)}>
                  <Download className="w-4 h-4 mr-1.5" />
                  <span>Download PDF</span>
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
        description={`Permanently delete report "${deletingReport?.docNum}" from archive? This action cannot be undone.`}
        confirmLabel="Delete Report"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
