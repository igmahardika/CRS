'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Check,
  X,
  ArrowLeft,
  ArrowRight,
  Eye,
  Download,
  MessageSquare,
  AlertTriangle,
  Search,
  RotateCcw,
  FileText,
  FilePlus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sliders,
  Send,
  CornerDownLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Input,
  Textarea,
  FormField,
  Badge,
  PageHeader,
  Spinner,
  SegmentedControl,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  InfoTooltip,
} from '@/components/ui';

interface PendingReport {
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
  status: 'PENDING_NOC_APPROVAL' | 'PENDING_DEPT_APPROVAL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REVISION_NEEDED';
  assignedDepartment?: string;
  generatedById?: string;
  generatedByName?: string;
  nocApprovedByName?: string;
  nocApprovedAt?: string;
  createdAt: string;
}

export default function ApprovalDeskPage() {
  const router = useRouter();

  const [reports, setReports] = useState<PendingReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SLA' | 'MRTG'>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Action states
  const [isApproving, setIsApproving] = useState(false);
  const [approveConfirmModalOpen, setApproveConfirmModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [copiedDocNum, setCopiedDocNum] = useState(false);

  // Current session
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name?: string;
    role: string;
    department: string;
  } | null>(null);

  const currentUserRef = React.useRef(currentUser);
  currentUserRef.current = currentUser;

  // Fetch pending reports directly from dedicated server queue endpoint
  const fetchPendingReports = useCallback(async (_userSession?: { role: string; department: string }) => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports?queue=pending');
      const data = await res.json();
      if (data?.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending approval reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data?.user) {
          setCurrentUser(data.user);
          fetchPendingReports(data.user);
        } else {
          fetchPendingReports();
        }
      })
      .catch(() => {
        if (isMounted) fetchPendingReports();
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter list by search query and type
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.customerName.toLowerCase().includes(q) ||
        r.documentNumber.toLowerCase().includes(q) ||
        r.serviceId?.toLowerCase().includes(q) ||
        r.customerId?.toLowerCase().includes(q) ||
        r.generatedByName?.toLowerCase().includes(q);

      const matchesType = typeFilter === 'ALL' || r.reportType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [reports, search, typeFilter]);

  // Ensure selectedIndex stays in valid range
  useEffect(() => {
    if (selectedIndex >= filteredReports.length && filteredReports.length > 0) {
      setSelectedIndex(filteredReports.length - 1);
    }
  }, [filteredReports.length, selectedIndex]);

  const activeReport = filteredReports[selectedIndex] || null;

  // Handle Copy Document Number
  const handleCopyDocNum = (docNum: string) => {
    navigator.clipboard.writeText(docNum);
    setCopiedDocNum(true);
    toast.success('Document number copied to clipboard.');
    setTimeout(() => setCopiedDocNum(false), 2000);
  };

  // Action: Approve & Advance to Next
  const handleApproveAndNext = async () => {
    if (!activeReport || isApproving) return;

    setIsApproving(true);
    const targetReport = activeReport;

    try {
      const res = await fetch('/api/reports/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetReport.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to approve report.');
      }

      toast.success(`Report "${targetReport.customerName}" approved successfully! Telegram alert sent.`);

      // Remove approved report from local state immediately
      setReports((prev) => prev.filter((r) => r.id !== targetReport.id));
      setApproveConfirmModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Approval Error: ${msg}`);
    } finally {
      setIsApproving(false);
    }
  };

  // Action: Request Revision
  const handleRejectReport = async () => {
    if (!activeReport || !rejectionNotes.trim() || isSubmittingReject) return;

    setIsSubmittingReject(true);
    const targetReport = activeReport;

    try {
      const res = await fetch('/api/reports/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetReport.id,
          notes: rejectionNotes.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to request revision.');
      }

      toast.warning(`Revision requested for "${targetReport.customerName}". Alert sent to creator.`);

      // Remove from pending queue
      setReports((prev) => prev.filter((r) => r.id !== targetReport.id));
      setRejectModalOpen(false);
      setRejectionNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Revision Request Error: ${msg}`);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Navigation helpers
  const handlePrev = useCallback(() => {
    if (selectedIndex > 0) setSelectedIndex((prev) => prev - 1);
  }, [selectedIndex]);

  const handleNext = useCallback(() => {
    if (selectedIndex < filteredReports.length - 1) setSelectedIndex((prev) => prev + 1);
  }, [selectedIndex, filteredReports.length]);

  const isSelfGenerated = Boolean(
    activeReport?.generatedById &&
    activeReport.generatedById === currentUser?.id &&
    currentUser?.role !== 'ADMIN'
  );

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside text inputs or modal open
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        rejectModalOpen ||
        approveConfirmModalOpen
      ) {
        return;
      }

      if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (isSelfGenerated) {
          toast.error('Four-Eyes Principle: You cannot approve a report you created yourself.');
          return;
        }
        setApproveConfirmModalOpen(true);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRejectModalOpen(true);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReport, isApproving, rejectModalOpen, approveConfirmModalOpen, isSelfGenerated, selectedIndex, filteredReports.length, handlePrev, handleNext]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Approval Desk"
        description="Verify and authorize pending performance compliance reports. Review in-app and use rapid hotkeys to process documents."
        breadcrumb={
          <Link
            href="/history"
            className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Report History</span>
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchPendingReports()}
              disabled={loading}
              title="Refresh queue"
            >
              <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>All Archives</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Main Workstation Container */}
      {loading ? (
        <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
          <Spinner size="lg" className="text-orange-600 mb-3" />
          <p className="text-xs font-medium text-slate-500">Loading pending approval documents...</p>
        </div>
      ) : reports.length === 0 ? (
        /* ================= ZERO STATE: INBOX ZERO ================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-12 text-center flex flex-col items-center justify-center min-h-[500px] space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
            <CheckCircle2 className="w-9 h-9 stroke-[2.2]" />
          </div>
          <div className="max-w-md space-y-1">
            <h2 className="text-base font-heading font-semibold text-slate-900">
              Review Queue Clear
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              All compliance documents in the queue have been verified and authorized.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-3 flex-wrap justify-center">
            <Link href="/history">
              <Button variant="secondary" size="sm">
                <FileText className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                <span>View Report Archive</span>
              </Button>
            </Link>
            <Link href="/">
              <Button variant="primary" size="sm">
                <FilePlus className="w-3.5 h-3.5 mr-1.5" />
                <span>Open Generator Workstation</span>
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* ================= SPLIT-PANE REVIEW WORKSTATION ================= */
        <div className="flex flex-col lg:flex-row bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-8.5rem)]">
          {/* ================= LEFT SIDEBAR: PENDING QUEUE ================= */}
          <div className="w-full lg:w-[400px] xl:w-[440px] border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col bg-white shrink-0">
            {/* Queue Header & Filters */}
            <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-slate-900 font-heading">
                    Pending Queue
                  </span>
                </div>
                <Badge variant="warning" className="text-xs font-bold px-2 py-0.5">
                  {filteredReports.length} {filteredReports.length === 1 ? 'Report' : 'Reports'}
                </Badge>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer, document number, or SID..."
                  className="pl-8 h-8 text-xs bg-white"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-2 text-slate-500 hover:text-slate-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Type Filter Segmented Control */}
              <div className="w-full">
                <SegmentedControl
                  size="sm"
                  value={typeFilter}
                  onChange={(val) => setTypeFilter(val as 'ALL' | 'SLA' | 'MRTG')}
                  className="w-full justify-between"
                  options={[
                    { value: 'ALL', label: `All (${reports.length})` },
                    { value: 'SLA', label: `SLA (${reports.filter((r) => r.reportType === 'SLA').length})` },
                    { value: 'MRTG', label: `MRTG (${reports.filter((r) => r.reportType === 'MRTG').length})` },
                  ]}
                />
              </div>
            </div>

            {/* Scrollable Document Cards List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
              {filteredReports.map((r, idx) => {
                const isSelected = idx === selectedIndex;
                const isSla = r.reportType === 'SLA';

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedIndex(idx)}
                    className={`p-3 text-left transition cursor-pointer border-l-4 ${isSelected
                        ? 'border-l-orange-600 bg-orange-50/60 shadow-xs'
                        : 'border-l-transparent hover:bg-slate-50'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-slate-900 truncate">
                          {r.customerName}
                        </div>
                        <div className="text-xs text-slate-500 font-sans truncate mt-0.5">
                          {r.documentNumber}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {r.status === 'PENDING_DEPT_APPROVAL' ? (
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded leading-none">
                              Stage 2: {r.assignedDepartment} Authorization
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded leading-none">
                              Stage 1: NOC Verification
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={isSla ? 'info' : 'soft'} className="text-xs shrink-0">
                        {r.reportType}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                      <span className="font-sans tabular-nums">{r.reportPeriod}</span>
                      {isSla && r.onlinePercent !== undefined ? (
                        <span
                          className={`font-sans font-semibold tabular-nums ${r.onlinePercent >= (r.targetSla || 99.5)
                              ? 'text-emerald-700'
                              : 'text-rose-600'
                            }`}
                        >
                          SLA: {r.onlinePercent.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-slate-500">Traffic Data</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-1 pt-1 border-t border-slate-100/60">
                      <span>By {r.generatedByName || 'Staff'}</span>
                      <span>
                        {new Date(r.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Keyboard Hint Bar */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-sans font-semibold text-slate-700 shadow-2xs">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-sans font-semibold text-slate-700 shadow-2xs">
                  ↓
                </kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-sans font-semibold text-emerald-700 shadow-2xs">
                    A
                  </kbd>
                  <span>Approve</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-sans font-semibold text-rose-700 shadow-2xs">
                    R
                  </kbd>
                  <span>Revise</span>
                </span>
              </span>
            </div>
          </div>

          {/* ================= RIGHT STAGE: VIEWER & ACTION DOCK ================= */}
          {activeReport ? (
            <div className="flex-1 flex flex-col bg-slate-50 min-w-0 overflow-hidden">
              {/* Document Header Bar */}
              <div className="p-3.5 bg-white border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-slate-900 truncate">
                      {activeReport.customerName}
                    </h3>
                    {activeReport.status === 'PENDING_DEPT_APPROVAL' ? (
                      <Badge variant="outline" className="border-blue-300 bg-blue-50 text-blue-800 text-xs">
                        Stage 2: {activeReport.assignedDepartment || 'Department'} Review
                      </Badge>
                    ) : activeReport.assignedDepartment === 'Internal NOC' ? (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-xs inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                        <span>Stage 1: Internal NOC (Single-Tier Completed)</span>
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 text-xs">
                        Stage 1: NOC Technical Review
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                    <span className="font-sans font-medium text-slate-800 flex items-center gap-1">
                      {activeReport.documentNumber}
                      <button
                        type="button"
                        onClick={() => handleCopyDocNum(activeReport.documentNumber)}
                        className="text-slate-500 hover:text-slate-800"
                        title="Copy document number"
                      >
                        {copiedDocNum ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </span>
                    <span>•</span>
                    <span>SID: <strong className="text-slate-700 font-sans">{activeReport.serviceId || activeReport.customerId}</strong></span>
                    <span>•</span>
                    <span>Period: <strong className="text-slate-700">{activeReport.reportPeriod}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/api/reports/download?id=${activeReport.id}&preview=1`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
                    <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5 text-slate-700">
                      <ExternalLink className="w-3.5 h-3.5 mr-1 text-orange-600" />
                      <span>Open in Tab</span>
                    </Button>
                  </a>
                  <a
                    href={`/api/reports/download?id=${activeReport.id}`}
                    className="inline-flex"
                  >
                    <Button variant="secondary" size="sm" className="text-xs h-7 px-2.5 text-slate-700">
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Download Draft</span>
                    </Button>
                  </a>
                </div>
              </div>

              {/* Embedded Live PDF Viewer Stage */}
              <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden relative">
                <iframe
                  key={activeReport.id}
                  src={`/api/reports/download?id=${activeReport.id}&preview=1#toolbar=0&navpanes=0`}
                  className="w-full h-full rounded-lg shadow-sm border border-slate-300/80 bg-white"
                  title={`Preview - ${activeReport.documentNumber}`}
                />
              </div>

              {/* Sticky Action Dock */}
              <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                {/* Navigation status */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handlePrev}
                      disabled={selectedIndex === 0}
                      className="h-8 w-8 text-slate-600"
                      title="Previous document (Arrow Up / Left)"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-slate-600 font-medium whitespace-nowrap">
                      {selectedIndex + 1} of {filteredReports.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleNext}
                      disabled={selectedIndex === filteredReports.length - 1}
                      className="h-8 w-8 text-slate-600"
                      title="Next document (Arrow Down / Right)"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Primary Decision Actions */}
                <div className="flex items-center gap-2">
                  {isSelfGenerated && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200" title="Four-Eyes Principle: You generated this report, another supervisor must verify it.">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Self-approval blocked</span>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setRejectModalOpen(true);
                      setRejectionNotes('');
                    }}
                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200 text-xs h-9 px-3"
                    title="Press 'R' on keyboard"
                  >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    <span>Request Revision</span>
                    <kbd className="ml-1.5 px-1 py-0.2 bg-amber-100/80 border border-amber-300/60 rounded text-xs font-sans font-bold text-amber-800">
                      R
                    </kbd>
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      if (isSelfGenerated) {
                        toast.error('Four-Eyes Principle: You cannot approve a report you created yourself.');
                        return;
                      }
                      setApproveConfirmModalOpen(true);
                    }}
                    disabled={isApproving || isSelfGenerated}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 shadow-xs disabled:opacity-50"
                    title={isSelfGenerated ? 'Self-approval disabled' : "Press 'A' on keyboard to authorize"}
                  >
                    {isApproving ? (
                      <Spinner size="sm" className="mr-1.5 text-white" />
                    ) : (
                      <Check className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                    )}
                    <span>
                      {activeReport.status === 'PENDING_DEPT_APPROVAL' || activeReport.assignedDepartment === 'Internal NOC' || activeReport.assignedDepartment === 'Network Operation'
                        ? 'Final Authorize'
                        : 'Authorize Technical'} &amp; Next
                    </span>
                    <kbd className="ml-2 px-1.5 py-0.5 bg-emerald-700 border border-emerald-500 rounded text-xs font-sans font-bold text-white">
                      A
                    </kbd>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              Select a report from the queue to review.
            </div>
          )}
        </div>
      )}

      {/* Modal: Request Revision Dialog */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Report Revision</DialogTitle>
            <p className="text-xs text-slate-500">
              {activeReport?.documentNumber} - {activeReport?.customerName}
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <label className="text-xs font-medium text-slate-700">Evaluation Notes / Required Adjustments</label>
                <InfoTooltip content="Notes are logged on the report audit trail and dispatched to the team's Telegram topic for staff correction." />
              </div>
              <Textarea
                rows={4}
                value={rejectionNotes}
                onChange={(e) => setRejectionNotes(e.target.value)}
                placeholder="Detail what needs to be changed (e.g. Reverse traffic direction, verify downtime duration, adjust target SLA)..."
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setRejectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRejectReport}
              disabled={isSubmittingReject || !rejectionNotes.trim()}
              loading={isSubmittingReject}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              <span>Submit Revision Notes</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirm Approval Safety Dialog */}
      <Dialog open={approveConfirmModalOpen} onOpenChange={setApproveConfirmModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Document Authorization</DialogTitle>
            <p className="text-xs text-slate-500">
              {activeReport?.documentNumber} - {activeReport?.customerName}
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Report Type:</span>
                <span className="font-semibold text-slate-800">{activeReport?.reportType} ({activeReport?.serviceName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Department:</span>
                <span className="font-semibold text-slate-800">{activeReport?.assignedDepartment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Approval Tier:</span>
                <span className="font-semibold text-emerald-700">
                  {activeReport?.status === 'PENDING_DEPT_APPROVAL' || activeReport?.assignedDepartment === 'Internal NOC'
                    ? 'Tier 2 (Final Authorization & Publication)'
                    : 'Tier 1 (Technical NOC Verification)'}
                </span>
              </div>
            </div>
            <p className="leading-relaxed">
              {activeReport?.status === 'PENDING_DEPT_APPROVAL' || activeReport?.assignedDepartment === 'Internal NOC'
                ? 'This document will be marked as officially APPROVED. Official download access will be unlocked and notifications dispatched.'
                : `This document will be verified technically and forwarded to the Supervisor of ${activeReport?.assignedDepartment} for final sign-off.`}
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setApproveConfirmModalOpen(false)}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApproveAndNext}
              disabled={isApproving}
              loading={isApproving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <Check className="w-3.5 h-3.5 mr-1.5 stroke-[2.5]" />
              <span>Confirm &amp; Authorize</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
