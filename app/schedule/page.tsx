'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  ArrowLeft,
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  ExternalLink,
  RotateCcw,
  RefreshCw,
  Users,
  ShieldCheck,
  Check,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  PageHeader,
  Button,
  Input,
  Badge,
  EmptyState,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  StatCard,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  FormField,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox,
} from '@/components/ui';
import { toast } from 'sonner';

interface ScheduleTask {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  periodMonth: number;
  periodYear: number;
  reportType: string;
  kickoffTime: string;
  deadlineTime: string;
  status: 'PENDING' | 'COMPLETED' | 'BREACHED';
  completedAt?: string | null;
  completedReportId?: string | null;
  processedByName?: string | null;
  createdAt: string;
}

interface ScheduleStats {
  total: number;
  completed: number;
  pending: number;
  breached: number;
  completionRate: number;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SchedulePage() {
  const now = new Date();
  // Default to previous month
  const defaultPrevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultPrevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(defaultPrevMonth);
  const [selectedYear, setSelectedYear] = useState<number>(defaultPrevYear);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'BREACHED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({
    total: 0,
    completed: 0,
    pending: 0,
    breached: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  // Kickoff Modal
  const [isKickoffModalOpen, setIsKickoffModalOpen] = useState(false);
  const [kickoffMonth, setKickoffMonth] = useState<number>(defaultPrevMonth);
  const [kickoffYear, setKickoffYear] = useState<number>(defaultPrevYear);
  const [includeAllCustomers, setIncludeAllCustomers] = useState(false);
  const [isSubmittingKickoff, setIsSubmittingKickoff] = useState(false);

  // SLA 24H Countdown Timer state
  const [timeRemainingStr, setTimeRemainingStr] = useState<string>('--:--:--');
  const [slaUrgency, setSlaUrgency] = useState<'SAFE' | 'WARNING' | 'CRITICAL' | 'EXPIRED' | 'COMPLETED' | 'IDLE'>('IDLE');
  const [slaProgressPercent, setSlaProgressPercent] = useState<number>(0);

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        toast.error(data.error || 'Gagal memuat daftar jadwal rutin.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghubungi server jadwal.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // SLA 24-Hour Countdown ticker
  useEffect(() => {
    // Find active kickoff deadline (the earliest deadline among pending tasks)
    const pendingTasks = tasks.filter((t) => t.status === 'PENDING');

    if (tasks.length === 0) {
      setSlaUrgency('IDLE');
      setTimeRemainingStr('Not Started');
      setSlaProgressPercent(0);
      return;
    }

    if (pendingTasks.length === 0 && tasks.length > 0) {
      setSlaUrgency('COMPLETED');
      setTimeRemainingStr('All Tasks Completed 🎉');
      setSlaProgressPercent(100);
      return;
    }

    const updateCountdown = () => {
      const targetDeadline = new Date(pendingTasks[0].deadlineTime).getTime();
      const kickoffTime = new Date(pendingTasks[0].kickoffTime).getTime();
      const current = Date.now();
      const diffMs = targetDeadline - current;
      const totalDuration = targetDeadline - kickoffTime || 24 * 60 * 60 * 1000;

      // Elapsed percentage (0 to 100%)
      const elapsed = current - kickoffTime;
      const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      setSlaProgressPercent(pct);

      if (diffMs <= 0) {
        setSlaUrgency('EXPIRED');
        const overdueHours = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60));
        const overdueMins = Math.floor((Math.abs(diffMs) % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemainingStr(`${overdueHours}h ${overdueMins}m Overdue`);
        return;
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const formatted = `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
      setTimeRemainingStr(formatted);

      if (hours >= 12) {
        setSlaUrgency('SAFE');
      } else if (hours >= 6) {
        setSlaUrgency('WARNING');
      } else {
        setSlaUrgency('CRITICAL');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  // Handle Trigger Kickoff
  const handleKickoffSubmit = async () => {
    setIsSubmittingKickoff(true);
    try {
      const res = await fetch('/api/schedule/kickoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodMonth: kickoffMonth,
          periodYear: kickoffYear,
          includeAll: includeAllCustomers,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Kickoff berhasil dimulai!');
        setIsKickoffModalOpen(false);
        setSelectedMonth(kickoffMonth);
        setSelectedYear(kickoffYear);
        fetchTasks();
      } else {
        toast.error(data.error || 'Gagal memulai kickoff.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Terjadi kesalahan saat memulai kickoff.');
    } finally {
      setIsSubmittingKickoff(false);
    }
  };

  // Quick toggle status for task
  const handleToggleTaskStatus = async (task: ScheduleTask, newStatus: 'PENDING' | 'COMPLETED') => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: task.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Status ${task.customerName} diubah ke ${newStatus}.`);
        fetchTasks();
      } else {
        toast.error(data.error || 'Gagal mengubah status tugas.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memperbarui status.');
    }
  };

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.customerName.toLowerCase().includes(q) ||
          t.customerId.toLowerCase().includes(q) ||
          t.serviceId.toLowerCase().includes(q) ||
          t.serviceName.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Routine Schedule & 24h SLA"
        description="Track and monitor routine monthly customer reports within 24-hour SLA."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href="/customers">
              <Button variant="secondary" size="sm">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                <span>Manage Routine Customers</span>
              </Button>
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsKickoffModalOpen(true)}
              className="bg-[#EA580C] hover:bg-[#C2410C]"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              <span>Trigger Monthly Kickoff</span>
            </Button>
          </div>
        }
      />

      {/* SLA 24 Jam Countdown Countdown Widget Banner */}
      <div
        className={`p-5 rounded-xl border transition-all ${
          slaUrgency === 'COMPLETED'
            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            : slaUrgency === 'EXPIRED'
            ? 'bg-rose-50/80 border-rose-200 text-rose-950'
            : slaUrgency === 'CRITICAL'
            ? 'bg-rose-50/90 border-rose-300 text-rose-950 animate-pulse'
            : slaUrgency === 'WARNING'
            ? 'bg-amber-50/80 border-amber-200 text-amber-950'
            : slaUrgency === 'SAFE'
            ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock
                className={`w-5 h-5 ${
                  slaUrgency === 'EXPIRED' || slaUrgency === 'CRITICAL'
                    ? 'text-rose-600'
                    : slaUrgency === 'WARNING'
                    ? 'text-amber-600'
                    : slaUrgency === 'COMPLETED'
                    ? 'text-emerald-600'
                    : 'text-[#EA580C]'
                }`}
              />
              <span className="font-bold text-sm tracking-tight">
                24-HOUR SLA COUNTDOWN
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white/80 border border-current/20">
                Period {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {slaUrgency === 'COMPLETED'
                ? 'All routine contract reports for this period have been completed and archived.'
                : slaUrgency === 'EXPIRED'
                ? 'The 24-hour SLA window has expired. Please process remaining pending reports.'
                : slaUrgency === 'IDLE'
                ? 'No routine kickoff triggered for this period. Click "Trigger Monthly Kickoff" to start.'
                : 'Reports must be completed within 24 hours of routine kickoff. Telegram alerts are active.'}
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end shrink-0">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
              {slaUrgency === 'EXPIRED' ? 'SLA Status' : 'Time Remaining'}
            </span>
            <div
              className={`font-mono font-bold text-lg md:text-xl tracking-tight flex items-center gap-2 ${
                slaUrgency === 'EXPIRED' || slaUrgency === 'CRITICAL'
                  ? 'text-rose-700'
                  : slaUrgency === 'WARNING'
                  ? 'text-amber-700'
                  : slaUrgency === 'COMPLETED'
                  ? 'text-emerald-700'
                  : 'text-[#EA580C]'
              }`}
            >
              {slaUrgency === 'CRITICAL' && <Flame className="w-5 h-5 text-rose-600 animate-bounce" />}
              {slaUrgency === 'COMPLETED' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              <span>{timeRemainingStr}</span>
            </div>
          </div>
        </div>

        {/* SLA Progress Bar */}
        {slaUrgency !== 'IDLE' && (
          <div className="mt-4 pt-3 border-t border-current/10">
            <div className="flex justify-between text-[11px] font-medium mb-1.5">
              <span>24-Hour Window ({slaProgressPercent}% elapsed)</span>
              <span>
                {stats.completed} of {stats.total} Reports Completed ({stats.completionRate}%)
              </span>
            </div>
            <div className="w-full bg-black/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  slaUrgency === 'COMPLETED'
                    ? 'bg-emerald-600'
                    : slaUrgency === 'EXPIRED' || slaUrgency === 'CRITICAL'
                    ? 'bg-rose-600'
                    : slaUrgency === 'WARNING'
                    ? 'bg-amber-500'
                    : 'bg-[#EA580C]'
                }`}
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Routine Customers"
          value={stats.total}
          icon={Users}
          subtext={`Period ${monthNames[selectedMonth - 1]} ${selectedYear}`}
        />
        <StatCard
          label="Completed Reports"
          value={stats.completed}
          icon={CheckCircle2}
          subtext={`${stats.completionRate}% completion rate`}
          badge={<Badge variant="success">{stats.completionRate}%</Badge>}
        />
        <StatCard
          label="Pending Tasks"
          value={stats.pending}
          icon={Clock}
          subtext="Due within 24 hours"
          badge={stats.pending > 0 ? <Badge variant="warning">{stats.pending}</Badge> : undefined}
        />
        <StatCard
          label="SLA Breached"
          value={stats.breached}
          icon={AlertTriangle}
          subtext="Exceeded 24-hour SLA"
          badge={stats.breached > 0 ? <Badge variant="destructive">{stats.breached}</Badge> : undefined}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-2">
            <div className="w-36">
              <Select
                value={String(selectedMonth)}
                onValueChange={(val) => setSelectedMonth(parseInt(val, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((m, idx) => (
                    <SelectItem key={idx + 1} value={String(idx + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Select
                value={String(selectedYear)}
                onValueChange={(val) => setSelectedYear(parseInt(val, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" size="icon-sm" onClick={fetchTasks} title="Refresh Data">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer or Service ID..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
          <Button
            variant={statusFilter === 'ALL' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className={statusFilter === 'ALL' ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white h-7 px-2.5 text-xs' : 'text-slate-600 h-7 px-2.5 text-xs'}
          >
            All ({stats.total})
          </Button>
          <Button
            variant={statusFilter === 'PENDING' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('PENDING')}
            className={statusFilter === 'PENDING' ? 'bg-amber-600 text-white hover:bg-amber-700 hover:text-white h-7 px-2.5 text-xs' : 'text-slate-600 h-7 px-2.5 text-xs'}
          >
            Pending ({stats.pending})
          </Button>
          <Button
            variant={statusFilter === 'COMPLETED' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('COMPLETED')}
            className={statusFilter === 'COMPLETED' ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:text-white h-7 px-2.5 text-xs' : 'text-slate-600 h-7 px-2.5 text-xs'}
          >
            Completed ({stats.completed})
          </Button>
          <Button
            variant={statusFilter === 'BREACHED' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setStatusFilter('BREACHED')}
            className={statusFilter === 'BREACHED' ? 'bg-rose-600 text-white hover:bg-rose-700 hover:text-white h-7 px-2.5 text-xs' : 'text-slate-600 h-7 px-2.5 text-xs'}
          >
            SLA Breached ({stats.breached})
          </Button>
        </div>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Spinner size="md" className="mx-auto text-[#EA580C] mb-2" />
            <span>Loading routine schedule tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CalendarCheck}
              title={`No Tasks Generated for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
              description="Click 'Trigger Monthly Kickoff' to compile routine tasks and initiate the 24-hour SLA countdown."
              actionLabel="Trigger Kickoff Now"
              onAction={() => {
                setKickoffMonth(selectedMonth);
                setKickoffYear(selectedYear);
                setIsKickoffModalOpen(true);
              }}
            />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Search}
              title="No Tasks Found"
              description="Try adjusting your search query or status filter."
              actionLabel="Reset Filter"
              onAction={() => {
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service ID &amp; Plan</TableHead>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Kickoff &amp; SLA Deadline</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((t, idx) => {
                  const kickoffDate = new Date(t.kickoffTime);
                  const deadlineDate = new Date(t.deadlineTime);

                  return (
                    <TableRow key={t.id} className="hover:bg-slate-50/70">
                      <TableCell className="text-center text-slate-400 text-xs tabular-nums">
                        {idx + 1}
                      </TableCell>

                      {/* Customer */}
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-xs">{t.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{t.customerId}</div>
                      </TableCell>

                      {/* Service ID & Plan */}
                      <TableCell>
                        <div className="text-xs font-mono font-medium text-slate-800">{t.serviceId}</div>
                        <div className="text-[11px] text-slate-500">{t.serviceName}</div>
                      </TableCell>

                      {/* Report Type */}
                      <TableCell>
                        <Badge
                          variant={t.reportType === 'SLA' ? 'info' : t.reportType === 'MRTG' ? 'warning' : 'neutral'}
                        >
                          {t.reportType === 'BOTH' ? 'SLA & MRTG' : t.reportType}
                        </Badge>
                      </TableCell>

                      {/* Kickoff & SLA */}
                      <TableCell>
                        <div className="text-xs text-slate-700">
                          {kickoffDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}{' '}
                          {kickoffDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>Deadline:</span>
                          <span className="font-semibold text-rose-700">
                            {deadlineDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}{' '}
                            {deadlineDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        {t.status === 'COMPLETED' ? (
                          <div className="inline-flex flex-col items-center">
                            <Badge variant="success">✓ Completed</Badge>
                            {t.processedByName && (
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                by {t.processedByName}
                              </span>
                            )}
                          </div>
                        ) : t.status === 'BREACHED' ? (
                          <div className="inline-flex flex-col items-center">
                            <Badge variant="destructive">⚠️ SLA Breached</Badge>
                            <span className="text-[10px] text-rose-600 mt-0.5">Pending</span>
                          </div>
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <Badge variant="warning">⏳ Pending</Badge>
                            <span className="text-[10px] text-amber-700 mt-0.5">Within 24h</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status !== 'COMPLETED' ? (
                            <Link
                              href={`/?customerId=${encodeURIComponent(t.customerId)}&customerName=${encodeURIComponent(
                                t.customerName
                              )}&serviceId=${encodeURIComponent(t.serviceId)}&month=${t.periodMonth}&year=${
                                t.periodYear
                              }&type=${t.reportType === 'MRTG' ? 'MRTG' : 'SLA'}&scheduleTaskId=${t.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
                              title="Process in Report Generator"
                            >
                              <span>Process Task</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-emerald-600 font-medium px-2 py-1">
                                Done
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleTaskStatus(t, 'PENDING')}
                                className="text-[11px] h-7 px-2 text-slate-500 hover:text-slate-800"
                                title="Reopen task"
                              >
                                Reopen
                              </Button>
                            </div>
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

      {/* Kickoff Confirmation Modal */}
      <Dialog open={isKickoffModalOpen} onOpenChange={setIsKickoffModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-4 h-4 text-[#EA580C] fill-current" />
              <span>Initiate Monthly Kickoff</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Starting kickoff compiles all customers marked with <b>Monthly Routine Report</b>, sets the 24-hour SLA deadline, and broadcasts an alert to Telegram.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Report Month">
                <Select
                  value={String(kickoffMonth)}
                  onValueChange={(val) => setKickoffMonth(parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNames.map((m, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Report Year">
                <Select
                  value={String(kickoffYear)}
                  onValueChange={(val) => setKickoffYear(parseInt(val, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeAll"
                  checked={includeAllCustomers}
                  onCheckedChange={(checked) => setIncludeAllCustomers(Boolean(checked))}
                />
                <label
                  htmlFor="includeAll"
                  className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                >
                  Include all customers if none marked routine
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              onClick={() => setIsKickoffModalOpen(false)}
              disabled={isSubmittingKickoff}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleKickoffSubmit}
              loading={isSubmittingKickoff}
              className="bg-[#EA580C] hover:bg-[#C2410C]"
            >
              Start Kickoff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
