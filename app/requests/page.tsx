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
} from '@/components/ui';

interface ReportRequestItem {
  id: string;
  ticketNumber: string;
  requesterName: string;
  requesterEmail?: string;
  requesterDept: string;
  reportType: 'SLA' | 'MRTG' | 'BOTH';
  customerName: string;
  customerId?: string;
  serviceId?: string;
  periodMonth: number;
  periodYear: number;
  urgency: 'NORMAL' | 'URGENT';
  notes?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  processedById?: string;
  processedByName?: string;
  processedReportId?: string;
  createdAt: string;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function RequestsQueuePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ReportRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ReportRequestItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    const shareUrl = `${window.location.origin}/request-report`;
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

    const typeParam = req.reportType === 'BOTH' ? 'SLA' : req.reportType;
    const url = `/?customerName=${encodeURIComponent(req.customerName)}&serviceId=${encodeURIComponent(req.serviceId || '')}&customerId=${encodeURIComponent(req.customerId || '')}&type=${typeParam}&month=${req.periodMonth}&year=${req.periodYear}&requestId=${req.id}&ticket=${encodeURIComponent(req.ticketNumber)}`;

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
        description="Manage report requests submitted by departments (Network Operation, Technical & Infrastructure, Customer Experience, Account Executive, Finance)."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
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
                  <Share2 className="w-3.5 h-3.5 mr-1.5 text-[#EA580C]" />
                  <span>Copy Form Link</span>
                </>
              )}
            </Button>
            <Link href="/request-report" target="_blank">
              <Button variant="primary" size="sm">
                <Send className="w-3.5 h-3.5 mr-1.5" />
                <span>Open Form</span>
              </Button>
            </Link>
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
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ticket, customer, requester, department..."
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
              className="text-xs text-[#EA580C] hover:text-[#C2410C] hover:bg-orange-50 h-8 px-2.5 font-medium mr-1"
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
            <Spinner size="md" className="mx-auto text-[#EA580C] mb-2" />
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
                          <code className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">
                            {r.ticketNumber}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCopyTicket(r.ticketNumber)}
                            className="h-6 w-6 text-slate-400 hover:text-slate-700"
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
                        {r.serviceId && (
                          <div className="text-[11px] text-slate-400 font-normal">
                            SID: {r.serviceId}
                          </div>
                        )}
                      </TableCell>

                      {/* Report Type */}
                      <TableCell>
                        <Badge variant={r.reportType === 'SLA' ? 'info' : r.reportType === 'MRTG' ? 'soft' : 'warning'}>
                          {r.reportType}
                        </Badge>
                      </TableCell>

                      {/* Period */}
                      <TableCell className="text-xs text-slate-600 font-medium">
                        {monthName} {r.periodYear}
                      </TableCell>

                      {/* Requester */}
                      <TableCell className="text-xs">
                        <div className="font-semibold text-slate-800">{r.requesterName}</div>
                        <div className="text-[11px] text-slate-500">{r.requesterDept}</div>
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
                        <div className="flex items-center justify-end gap-1">
                          {/* Quick View Button */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setSelectedRequest(r)}
                            title="View Ticket Details"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </Button>

                          {/* Process in Generator Button */}
                          {r.status !== 'COMPLETED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleProcessInGenerator(r)}
                              className="bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs h-7 px-2.5"
                              title="Open Generator with auto-filled data"
                            >
                              <Play className="w-3 h-3 mr-1 fill-white" />
                              <span>Process</span>
                            </Button>
                          )}

                          {r.status === 'COMPLETED' && (
                            <Badge variant="success" className="text-[11px]">
                              Done
                            </Badge>
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
                  <span className="text-slate-500 text-[11px] block">Customer Name</span>
                  <div className="font-semibold text-slate-900">{selectedRequest.customerName}</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Service ID / Customer ID</span>
                  <div className="text-slate-700">
                    {selectedRequest.serviceId || selectedRequest.customerId || '-'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Requested Report Type</span>
                  <div className="font-semibold text-[#EA580C]">{selectedRequest.reportType} Report</div>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Period</span>
                  <div className="font-medium text-slate-800">
                    {monthNames[selectedRequest.periodMonth - 1]} {selectedRequest.periodYear}
                  </div>
                </div>
              </div>

              {/* Requester Info */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
                  <span className="text-[11px] font-semibold text-amber-800 block">
                    Notes from Requester:
                  </span>
                  <p className="text-xs text-slate-700 italic">
                    &quot;{selectedRequest.notes}&quot;
                  </p>
                </div>
              )}

              {/* Status Updater */}
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

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Button variant="secondary" onClick={() => setSelectedRequest(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    handleProcessInGenerator(selectedRequest);
                    setSelectedRequest(null);
                  }}
                  className="bg-[#EA580C] hover:bg-[#C2410C] text-white"
                >
                  <Play className="w-3.5 h-3.5 mr-1 fill-white" />
                  <span>Process in Generator</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
