'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Inbox,
  Search,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Send,
  Share2,
  RotateCcw,
  X,
  Play,
  Eye,
  Sliders,
  Download,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Badge,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui';
import NewRequestDrawer from '@/components/NewRequestDrawer';

interface ReportRequestItem {
  id: string;
  ticketNumber: string;
  requesterName: string;
  requesterEmail?: string;
  requesterDept: string;
  salesPicName?: string;
  cePicName?: string;
  reportType: 'SLA' | 'MRTG' | 'BOTH';
  customerName: string;
  customerId?: string;
  serviceId?: string;
  periodMonth: number;
  periodYear: number;
  periodsJson?: string;
  urgency: 'NORMAL' | 'URGENT';
  notes?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SCHEDULED_ROUTINE' | 'COMPLETED' | 'CANCELLED';
  processedById?: string;
  processedByName?: string;
  processedReportId?: string;
  processedSlaReportId?: string;
  processedMrtgReportId?: string;
  createdAt: string;
  isApproved?: boolean;
  reportStatus?: string;
  processedReportStatus?: string | null;
  processedSlaStatus?: string | null;
  processedMrtgStatus?: string | null;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RequestsQueuePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    fullName?: string;
    role: string;
    department: string;
    defaultRoute?: string;
  } | null>(null);

  const [requests, setRequests] = useState<ReportRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReportRequestItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(null);
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const isNocOrAdmin =
    currentUser?.role === 'ADMIN' || currentUser?.department === 'Network Operation';

  // Open drawer if ?new=1 or ?action=new is in the URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') === '1' || params.get('action') === 'new') {
        setIsNewRequestOpen(true);
      }
    }
  }, []);

  const handleOpenNewRequest = (open: boolean) => {
    setIsNewRequestOpen(open);
    if (!open && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('new') || params.get('action')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('new');
        url.searchParams.delete('action');
        const nextUrl = url.pathname + (url.search ? url.search : '');
        window.history.replaceState({}, '', nextUrl);
      }
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      if (data.requests) setRequests(data.requests);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat antrean permintaan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCopyTicket = (ticket: string) => {
    navigator.clipboard.writeText(ticket);
    setCopiedTicket(ticket);
    setTimeout(() => setCopiedTicket(null), 2000);
  };

  const handleCopyShareLink = () => {
    const shareUrl = `${window.location.origin}/requests?new=1`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedShareLink(true);
    toast.success('Link form permintaan berhasil disalin!');
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch('/api/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah status');
      toast.success(`Status tiket diubah menjadi ${newStatus}`);
      fetchRequests();
      if (selectedRequest?.id === id) {
        setSelectedRequest((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Terjadi kesalahan: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleProcessInGenerator = (req: ReportRequestItem) => {
    // Automatically set status to IN_PROGRESS if currently PENDING
    if (req.status === 'PENDING') {
      handleUpdateStatus(req.id, 'IN_PROGRESS');
    }

    const isBothParam = req.reportType === 'BOTH' ? '&isBoth=1' : '';
    const typeParam = req.reportType === 'BOTH' ? 'SLA' : req.reportType;
    const deptParam = req.requesterDept ? `&dept=${encodeURIComponent(req.requesterDept)}` : '';
    const periodsParam = req.periodsJson ? `&periods=${encodeURIComponent(req.periodsJson)}` : '';
    const url = `/?customerName=${encodeURIComponent(req.customerName)}&serviceId=${encodeURIComponent(req.serviceId || '')}&customerId=${encodeURIComponent(req.customerId || '')}&type=${typeParam}&month=${req.periodMonth}&year=${req.periodYear}&requestId=${req.id}&ticket=${encodeURIComponent(req.ticketNumber)}${deptParam}${isBothParam}${periodsParam}`;

    router.push(url);
  };

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      r.ticketNumber.toLowerCase().includes(q) ||
      r.customerName.toLowerCase().includes(q) ||
      r.requesterName.toLowerCase().includes(q) ||
      r.requesterDept.toLowerCase().includes(q) ||
      (r.serviceId && r.serviceId.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const inProgressCount = requests.filter((r) => r.status === 'IN_PROGRESS').length;
  const completedCount = requests.filter((r) => r.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Report Requests Queue"
        description="Track and process compliance report requests submitted across departments (NOC, Customer Experience, Account Executive, Finance)."
        breadcrumb={
          isNocOrAdmin ? (
            <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Generator</span>
            </Link>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyShareLink}
              title="Copy request form link"
            >
              {copiedShareLink ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 mr-1.5 text-orange-600" />
                  <span>Copy Form Link</span>
                </>
              )}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenNewRequest(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white font-medium"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>+ New Request</span>
            </Button>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Requests"
          value={totalCount}
          icon={Inbox}
          subtext="All submitted tickets"
        />
        <StatCard
          label="Pending"
          value={pendingCount}
          icon={Clock}
          subtext="Awaiting staff action"
        />
        <StatCard
          label="In Progress"
          value={inProgressCount}
          icon={Sliders}
          subtext="Processing in generator"
        />
        <StatCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
          subtext="Reports published"
        />
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari tiket permintaan, pelanggan, atau pemohon..."
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

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          {(search || statusFilter !== 'ALL') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 px-2.5 font-medium mr-1"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>
          )}

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
              <span>All ({totalCount})</span>
            </Button>
            <Button
              variant={statusFilter === 'PENDING' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('PENDING')}
              className={
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-white shadow-xs h-7 px-2.5 text-xs font-semibold hover:bg-amber-600 hover:text-white'
                  : 'text-amber-700 hover:bg-amber-50 h-7 px-2.5 text-xs font-medium'
              }
            >
              <span>Pending ({pendingCount})</span>
            </Button>
            <Button
              variant={statusFilter === 'IN_PROGRESS' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className={
                statusFilter === 'IN_PROGRESS'
                  ? 'bg-blue-600 text-white shadow-xs h-7 px-2.5 text-xs font-semibold hover:bg-blue-700 hover:text-white'
                  : 'text-blue-700 hover:bg-blue-50 h-7 px-2.5 text-xs font-medium'
              }
            >
              <span>In Progress ({inProgressCount})</span>
            </Button>
            <Button
              variant={statusFilter === 'COMPLETED' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter('COMPLETED')}
              className={
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs h-7 px-2.5 text-xs font-semibold hover:bg-emerald-700 hover:text-white'
                  : 'text-emerald-700 hover:bg-emerald-50 h-7 px-2.5 text-xs font-medium'
              }
            >
              <span>Completed ({completedCount})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {loading && (
          <div className="py-16 text-center text-xs text-slate-500">
            <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
            <span>Loading request queue...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && requests.length > 0 && (
          <div className="p-6">
            <EmptyState
              icon={Inbox}
              title="No Tickets Found"
              description="No report requests match the active filter or search keywords."
              actionLabel="Reset Filter"
              onAction={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
            />
          </div>
        )}

        {!loading && filtered.length === 0 && requests.length === 0 && (
          <div className="p-8">
            <EmptyState
              icon={Inbox}
              title="Request Queue is Empty"
              description="When other departments submit the shareable request form, new tickets will appear here automatically."
              action={
                <Button variant="primary" size="sm" onClick={handleCopyShareLink}>
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  <span>Copy Form Link</span>
                </Button>
              }
            />
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto relative scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Ticket No.</TableHead>
                  <TableHead className="w-24 text-center">Priority</TableHead>
                  <TableHead>Customer &amp; Service ID</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Requester (Dept)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const monthName = monthNames[r.periodMonth - 1] || `Month ${r.periodMonth}`;
                  const isUrgent = r.urgency === 'URGENT';

                  return (
                    <TableRow key={r.id} className={isUrgent && r.status === 'PENDING' ? 'bg-rose-50/30' : undefined}>
                      {/* Ticket Number */}
                      <TableCell className="font-semibold text-xs text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">
                            {r.ticketNumber}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyTicket(r.ticketNumber)}
                            className="h-6 w-6 text-slate-500 hover:text-slate-800"
                            title="Copy ticket"
                          >
                            {copiedTicket === r.ticketNumber ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>

                      {/* Urgency */}
                      <TableCell className="text-center">
                        {isUrgent ? (
                          <Badge variant="destructive" dot className="animate-pulse">
                            Urgent
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Normal</Badge>
                        )}
                      </TableCell>

                      {/* Customer Name */}
                      <TableCell className="font-semibold text-slate-900 text-xs">
                        <div>{r.customerName}</div>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          {r.serviceId && (
                            <span className="font-mono text-[11px] text-slate-500">
                              SID: {r.serviceId}
                            </span>
                          )}
                          {r.salesPicName && (
                            <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                              AE: {r.salesPicName}
                            </span>
                          )}
                          {r.cePicName && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                              CE: {r.cePicName}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Report Type */}
                      <TableCell>
                        <Badge variant={r.reportType === 'SLA' ? 'info' : r.reportType === 'MRTG' ? 'soft' : 'warning'}>
                          {r.reportType}
                        </Badge>
                      </TableCell>

                      {/* Period */}
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {(() => {
                          if (r.periodsJson) {
                            try {
                              const parsed = JSON.parse(r.periodsJson);
                              if (Array.isArray(parsed) && parsed.length > 1) {
                                return parsed.map((p: any) => monthNames[p.month - 1].slice(0, 3)).join(', ') + ` ${r.periodYear}`;
                              }
                            } catch {}
                          }
                          return `${monthName} ${r.periodYear}`;
                        })()}
                      </TableCell>

                      {/* Requester */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">{r.requesterName}</div>
                        <div className="text-xs text-slate-500">{r.requesterDept}</div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {r.status === 'COMPLETED' ? (
                          <Badge variant="success" dot>
                            Completed
                          </Badge>
                        ) : r.status === 'IN_PROGRESS' ? (
                          <Badge variant="info" dot>
                            In Progress
                          </Badge>
                        ) : r.status === 'SCHEDULED_ROUTINE' ? (
                          <Badge variant="soft" className="bg-purple-50 text-purple-700 border-purple-200" dot>
                            Terjadwal Rutin
                          </Badge>
                        ) : r.status === 'CANCELLED' ? (
                          <Badge variant="neutral">Cancelled</Badge>
                        ) : (
                          <Badge variant="warning" dot>
                            Pending
                          </Badge>
                        )}
                      </TableCell>

                      {/* Created At */}
                      <TableCell suppressHydrationWarning className="text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick View Button */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedRequest(r)}
                            title="View Ticket Details"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>

                          {/* NOC / Admin Actions */}
                          {isNocOrAdmin && (
                            <>
                              {r.status !== 'COMPLETED' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleProcessInGenerator(r)}
                                  className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-7 px-2.5"
                                  title="Open Generator with auto-filled data"
                                >
                                  <Play className="w-3 h-3 mr-1 fill-white" />
                                  <span>Process</span>
                                </Button>
                              )}
                              {r.status === 'COMPLETED' && (
                                <Badge variant="success" className="text-xs">
                                  Done
                                </Badge>
                              )}
                            </>
                          )}

                          {/* Non-NOC (Requester) Actions */}
                          {!isNocOrAdmin && (
                            <>
                              {r.status === 'PENDING' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancellingRequestId(r.id)}
                                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 px-2"
                                  title="Cancel this request ticket"
                                >
                                  Cancel
                                </Button>
                              )}

                              {r.status === 'COMPLETED' && (
                                <>
                                  {r.isApproved ? (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {/* BOTH Dual Reports Dropdown */}
                                      {r.reportType === 'BOTH' ? (
                                        <div className="flex items-center gap-1">
                                          {(r.processedSlaReportId || r.processedMrtgReportId) && (
                                            <a
                                              href={`/api/reports/download?id=${r.processedSlaReportId || r.processedMrtgReportId}&preview=1`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex"
                                            >
                                              <Button
                                                variant="secondary"
                                                size="sm"
                                                className="text-xs h-7 px-2 text-slate-700 hover:text-slate-900"
                                                title="Preview PDF"
                                              >
                                                <Eye className="w-3.5 h-3.5 mr-1 text-orange-600" />
                                                <span>Preview</span>
                                              </Button>
                                            </a>
                                          )}
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                variant="secondary"
                                                size="sm"
                                                className="text-xs h-7 px-2.5 text-emerald-700 hover:text-emerald-800 font-medium"
                                              >
                                                <Download className="w-3.5 h-3.5 mr-1" />
                                                <span>Download</span>
                                                <ChevronDown className="w-3 h-3 ml-1" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 p-1 text-xs">
                                              {r.processedSlaReportId && (
                                                <DropdownMenuItem asChild>
                                                  <a
                                                    href={`/api/reports/download?id=${r.processedSlaReportId}`}
                                                    className="flex items-center gap-2 cursor-pointer text-slate-700"
                                                  >
                                                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                                                    <span>Unduh SLA PDF</span>
                                                  </a>
                                                </DropdownMenuItem>
                                              )}
                                              {r.processedMrtgReportId && (
                                                <DropdownMenuItem asChild>
                                                  <a
                                                    href={`/api/reports/download?id=${r.processedMrtgReportId}`}
                                                    className="flex items-center gap-2 cursor-pointer text-slate-700"
                                                  >
                                                    <Download className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>Unduh MRTG PDF</span>
                                                  </a>
                                                </DropdownMenuItem>
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      ) : r.processedReportId ? (
                                        <div className="flex items-center gap-1">
                                          <a
                                            href={`/api/reports/download?id=${r.processedReportId}&preview=1`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex"
                                          >
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              className="text-xs h-7 px-2 text-slate-700 hover:text-slate-900"
                                              title="Preview PDF"
                                            >
                                              <Eye className="w-3.5 h-3.5 mr-1 text-orange-600" />
                                              <span>Preview</span>
                                            </Button>
                                          </a>
                                          <a
                                            href={`/api/reports/download?id=${r.processedReportId}`}
                                            className="inline-flex"
                                          >
                                            <Button
                                              variant="secondary"
                                              size="sm"
                                              className="text-xs h-7 px-2 text-emerald-700 hover:text-emerald-800"
                                              title="Download PDF"
                                            >
                                              <Download className="w-3.5 h-3.5 mr-1" />
                                              <span>Download</span>
                                            </Button>
                                          </a>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : (
                                    <Badge variant="warning" className="text-xs">
                                      Awaiting Approval
                                    </Badge>
                                  )}
                                </>
                              )}

                              {r.status === 'IN_PROGRESS' && (
                                <Badge variant="info" className="text-xs">
                                  Processing by NOC
                                </Badge>
                              )}
                            </>
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
      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Ticket Details</DialogTitle>
            <p className="text-xs text-slate-500">{selectedRequest?.ticketNumber}</p>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 text-xs font-sans py-2">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 text-xs block">Customer Name</span>
                  <div className="font-semibold text-slate-900">{selectedRequest.customerName}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Service ID / Customer ID</span>
                  <div className="text-slate-700">
                    {selectedRequest.serviceId || selectedRequest.customerId || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Requested Report Type</span>
                  <div className="font-semibold text-orange-600">{selectedRequest.reportType} Report</div>
                </div>
                <div>
                  <span className="text-slate-500 text-xs block">Period</span>
                  <div className="font-medium text-slate-800">
                    {monthNames[selectedRequest.periodMonth - 1]} {selectedRequest.periodYear}
                  </div>
                </div>
              </div>

              {/* Requester Info */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Requester Information
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="font-semibold text-slate-800">{selectedRequest.requesterName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Department:</span>
                  <span className="font-medium text-slate-700">{selectedRequest.requesterDept}</span>
                </div>
                {selectedRequest.requesterEmail && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Contact:</span>
                    <span className="text-slate-700">{selectedRequest.requesterEmail}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Priority:</span>
                  <Badge variant={selectedRequest.urgency === 'URGENT' ? 'destructive' : 'neutral'} dot>
                    {selectedRequest.urgency === 'URGENT' ? 'Urgent' : 'Normal'}
                  </Badge>
                </div>
              </div>

              {/* Notes */}
              {selectedRequest.notes && (
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg text-slate-800 space-y-1">
                  <span className="text-xs font-semibold text-amber-800 block">
                    Notes from Requester:
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    &quot;{selectedRequest.notes}&quot;
                  </p>
                </div>
              )}

              {/* Status Updater for NOC/Admin */}
              {isNocOrAdmin && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-semibold text-slate-700">Update Status:</span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant={selectedRequest.status === 'PENDING' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'PENDING')}
                      className="text-xs h-7 px-2"
                    >
                      Pending
                    </Button>
                    <Button
                      variant={selectedRequest.status === 'IN_PROGRESS' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'IN_PROGRESS')}
                      className="text-xs h-7 px-2 text-blue-700"
                    >
                      In Progress
                    </Button>
                    <Button
                      variant={selectedRequest.status === 'COMPLETED' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'COMPLETED')}
                      className="text-xs h-7 px-2 text-emerald-700"
                    >
                      Completed
                    </Button>
                    <Button
                      variant={selectedRequest.status === 'CANCELLED' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'CANCELLED')}
                      className="text-xs h-7 px-2 text-rose-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Action for Non-NOC (Cancel if PENDING) */}
              {!isNocOrAdmin && selectedRequest.status === 'PENDING' && (
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500">Ticket awaiting processing:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleUpdateStatus(selectedRequest.id, 'CANCELLED');
                      setSelectedRequest(null);
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 px-2.5"
                  >
                    Cancel This Request
                  </Button>
                </div>
              )}

              {/* Status report for completed ticket */}
              {selectedRequest.status === 'COMPLETED' && (
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 block">
                      Official Compliance Report Ready
                    </span>
                    <span className="text-xs text-slate-600">
                      {selectedRequest.isApproved
                        ? 'Report has been authorized (Approved) and is ready for download.'
                        : 'Report has been generated and is awaiting NOC supervisor authorization.'}
                    </span>
                  </div>
                  {selectedRequest.isApproved && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {selectedRequest.processedReportId && (
                        <div className="flex items-center gap-1">
                          <a
                            href={`/api/reports/download?id=${selectedRequest.processedReportId}&preview=1`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex"
                          >
                            <Button variant="secondary" size="sm" className="text-xs h-7">
                              <Eye className="w-3.5 h-3.5 mr-1 text-orange-600" />
                              <span>Preview</span>
                            </Button>
                          </a>
                          <a
                            href={`/api/reports/download?id=${selectedRequest.processedReportId}`}
                            className="inline-flex"
                          >
                            <Button variant="primary" size="sm" className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700">
                              <Download className="w-3.5 h-3.5 mr-1" />
                              <span>Download</span>
                            </Button>
                          </a>
                        </div>
                      )}
                      {selectedRequest.reportType === 'BOTH' && (
                        <>
                          {selectedRequest.processedSlaReportId && (
                            <a
                              href={`/api/reports/download?id=${selectedRequest.processedSlaReportId}`}
                              className="inline-flex"
                            >
                              <Button variant="secondary" size="sm" className="text-xs h-7 text-emerald-700 font-medium">
                                <Download className="w-3.5 h-3.5 mr-1" />
                                <span>Download SLA</span>
                              </Button>
                            </a>
                          )}
                          {selectedRequest.processedMrtgReportId && (
                            <a
                              href={`/api/reports/download?id=${selectedRequest.processedMrtgReportId}`}
                              className="inline-flex"
                            >
                              <Button variant="secondary" size="sm" className="text-xs h-7 text-blue-700 font-medium">
                                <Download className="w-3.5 h-3.5 mr-1" />
                                <span>Download MRTG</span>
                              </Button>
                            </a>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
                {isNocOrAdmin && selectedRequest.status !== 'COMPLETED' && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      handleProcessInGenerator(selectedRequest);
                      setSelectedRequest(null);
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                    <span>Process in Generator</span>
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancellation Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cancellingRequestId)}
        onOpenChange={(open) => !open && setCancellingRequestId(null)}
        title="Batalkan Permintaan Laporan"
        description="Apakah Anda yakin ingin membatalkan tiket permintaan laporan ini? Tiket yang dibatalkan tidak akan diproses oleh tim NOC."
        confirmText="Ya, Batalkan Tiket"
        variant="destructive"
        onConfirm={async () => {
          if (cancellingRequestId) {
            await handleUpdateStatus(cancellingRequestId, 'CANCELLED');
            setCancellingRequestId(null);
          }
        }}
      />

      {/* New Request Slide-over Side View Drawer */}
      <NewRequestDrawer
        open={isNewRequestOpen}
        onOpenChange={handleOpenNewRequest}
        onSuccess={() => {
          fetchRequests();
        }}
      />
    </div>
  );
}
