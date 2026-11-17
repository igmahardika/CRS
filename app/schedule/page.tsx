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
  Activity,
  Building2,
  SlidersHorizontal,
  X,
  Layers,
  UserPlus,
  Trash2,
  Plus,
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
  SegmentedControl,
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
  InfoTooltip,
} from '@/components/ui';
import { toast } from 'sonner';
import { DEPARTMENTS as SYSTEM_DEPARTMENTS } from '@/lib/permissions';

interface ScheduleTask {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  periodMonth: number;
  periodYear: number;
  reportType: 'SLA' | 'MRTG' | 'BOTH';
  assignedDepartment: string;
  executionType: 'AUTO_SCHEDULED' | 'MANUAL';
  kickoffTime: string;
  deadlineTime: string;
  status: 'PENDING' | 'COMPLETED' | 'BREACHED' | 'FAILED_MANUAL_REQUIRED';
  errorMessage?: string | null;
  completedAt?: string | null;
  completedReportId?: string | null;
  processedByName?: string | null;
  createdAt: string;
}

interface RoutineCustomer {
  id: string;
  customerId: string;
  customerName: string;
  serviceId: string;
  serviceName: string;
  isMonthlyRoutine: boolean;
  routineGroup: string;
  routineReportType: string;
}

interface ScheduleStats {
  total: number;
  completed: number;
  pending: number;
  failed: number;
  breached: number;
  completionRate: number;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEPARTMENTS = SYSTEM_DEPARTMENTS.filter((d) => d !== 'Network Operation');

export default function SchedulePage() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Target period: default to current month and year
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MRTG' | 'SLA'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'BREACHED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [routineCustomers, setRoutineCustomers] = useState<RoutineCustomer[]>([]);
  const [stats, setStats] = useState<ScheduleStats>({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    breached: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  // Auto-MRTG Batch trigger state
  const [isRunningMrtgBatch, setIsRunningMrtgBatch] = useState(false);

  // Routine Management Modal state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [modalActiveDept, setModalActiveDept] = useState<string>('Customer Experience');
  const [allMasterCustomers, setAllMasterCustomers] = useState<RoutineCustomer[]>([]);
  const [loadingMasterCustomers, setLoadingMasterCustomers] = useState(false);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState<string>('');
  const [selectedCustomerIdsToAdd, setSelectedCustomerIdsToAdd] = useState<string[]>([]);
  const [selectedReportTypeToAdd, setSelectedReportTypeToAdd] = useState<string>('MRTG');
  const [isSavingRoutineAction, setIsSavingRoutineAction] = useState(false);

  // Fetch tasks and enrolled routine list
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/schedule?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (res.ok) {
        setTasks(data.tasks || []);
        setRoutineCustomers(data.routineCustomers || []);
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        toast.error(data.error || 'Failed to load routine schedule tasks.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to communicate with schedule server.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Fetch master customer catalog
  const fetchMasterCustomers = async () => {
    setLoadingMasterCustomers(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (res.ok) {
        setAllMasterCustomers(data.customers || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load master customers.');
    } finally {
      setLoadingMasterCustomers(false);
    }
  };

  const handleOpenCustomerModal = () => {
    setIsCustomerModalOpen(true);
    fetchMasterCustomers();
  };

  // Reset picker selection when closed or dept changes
  useEffect(() => {
    if (!isAddPickerOpen) {
      setSelectedCustomerIdsToAdd([]);
      setPickerSearchQuery('');
    }
  }, [isAddPickerOpen, modalActiveDept]);

  // Toggle selection for a single customer
  const handleToggleCustomerSelection = (id: string) => {
    setSelectedCustomerIdsToAdd((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add customer(s) to routine list (Single or Batch)
  const handleAddCustomersToRoutine = async () => {
    if (selectedCustomerIdsToAdd.length === 0) {
      toast.error('Select at least one customer to enroll.');
      return;
    }

    setIsSavingRoutineAction(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch_add_to_routine',
          customerIds: selectedCustomerIdsToAdd,
          routineGroup: modalActiveDept,
          routineReportType: selectedReportTypeToAdd,
          periodMonth: selectedMonth,
          periodYear: selectedYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Added ${selectedCustomerIdsToAdd.length} customer(s) to ${modalActiveDept}.`);
        setIsAddPickerOpen(false);
        setSelectedCustomerIdsToAdd([]);
        setPickerSearchQuery('');
        fetchTasks();
        fetchMasterCustomers();
      } else {
        toast.error(data.error || 'Failed to add customer(s) to routine queue.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An error occurred while adding customers.');
    } finally {
      setIsSavingRoutineAction(false);
    }
  };

  // Remove customer from routine list
  const handleRemoveCustomerFromRoutine = async (cust: RoutineCustomer) => {
    if (!confirm(`Are you sure you want to remove "${cust.customerName}" from monthly routine reporting?`)) {
      return;
    }

    setIsSavingRoutineAction(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_from_routine',
          customerId: cust.id,
          periodMonth: selectedMonth,
          periodYear: selectedYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Customer removed from routine list.');
        fetchTasks();
        fetchMasterCustomers();
      } else {
        toast.error(data.error || 'Failed to remove customer.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error removing customer.');
    } finally {
      setIsSavingRoutineAction(false);
    }
  };

  // Update routine report type directly
  const handleUpdateReportType = async (cust: RoutineCustomer, newType: string) => {
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_enrollment',
          customerId: cust.id,
          routineReportType: newType,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Updated ${cust.customerName} report type to ${newType}.`);
        fetchTasks();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update report type.');
    }
  };

  // Trigger manual MRTG batch generation
  const handleRunMrtgBatch = async () => {
    setIsRunningMrtgBatch(true);
    const toastId = toast.loading('Running automated MRTG batch generation (pacing 1.5s per item)...');
    try {
      const res = await fetch('/api/schedule/auto-mrtg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          `MRTG Batch completed: ${data.processed} generated, ${data.failed} manual required.`,
          { id: toastId }
        );
        fetchTasks();
      } else {
        toast.error(data.error || 'Failed to run MRTG batch.', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('MRTG batch execution failed.', { id: toastId });
    } finally {
      setIsRunningMrtgBatch(false);
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
        toast.success(`Task status updated to ${newStatus}.`);
        fetchTasks();
      } else {
        toast.error(data.error || 'Failed to update task status.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task.');
    }
  };

  // Calculate task counts per department
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'ALL': tasks.length,
      'Customer Experience': 0,
      'Account Executive': 0,
      'Finance': 0,
    };
    tasks.forEach((t) => {
      const dept = t.assignedDepartment || 'Customer Experience';
      if (counts[dept] !== undefined) {
        counts[dept]++;
      }
    });
    return counts;
  }, [tasks]);

  // Enrolled customers grouped by department
  const routineCustomersByDept = useMemo(() => {
    const map: Record<string, RoutineCustomer[]> = {
      'Customer Experience': [],
      'Account Executive': [],
      'Finance': [],
    };
    routineCustomers.forEach((c) => {
      const dept = c.routineGroup || 'Customer Experience';
      if (map[dept]) {
        map[dept].push(c);
      } else {
        map['Customer Experience'].push(c);
      }
    });
    return map;
  }, [routineCustomers]);

  // Available master customers not enrolled in routine
  const availableToAdd = useMemo(() => {
    const enrolledIds = new Set(routineCustomers.map((c) => c.id));
    return allMasterCustomers.filter((c) => !enrolledIds.has(c.id));
  }, [allMasterCustomers, routineCustomers]);

  // Filtered available customers based on search query in the picker
  const filteredAvailableToAdd = useMemo(() => {
    if (!pickerSearchQuery.trim()) return availableToAdd;
    const q = pickerSearchQuery.toLowerCase().trim();
    return availableToAdd.filter(
      (c) =>
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.customerId && c.customerId.toLowerCase().includes(q)) ||
        (c.serviceId && c.serviceId.toLowerCase().includes(q)) ||
        (c.serviceName && c.serviceName.toLowerCase().includes(q))
    );
  }, [availableToAdd, pickerSearchQuery]);

  // Toggle select all visible/filtered items
  const handleToggleSelectAllFiltered = () => {
    const filteredIds = filteredAvailableToAdd.map((c) => c.id);
    const areAllSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedCustomerIdsToAdd.includes(id));

    if (areAllSelected) {
      setSelectedCustomerIdsToAdd((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedCustomerIdsToAdd((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    let baseTasks = tasks;
    if (selectedDepartment !== 'ALL') {
      baseTasks = baseTasks.filter((t) => (t.assignedDepartment || 'Customer Experience') === selectedDepartment);
    }
    return {
      ALL: baseTasks.length,
      MRTG: baseTasks.filter((t) => t.reportType === 'MRTG').length,
      SLA: baseTasks.filter((t) => t.reportType === 'SLA').length,
    };
  }, [tasks, selectedDepartment]);

  // Filtered tasks based on department, category, status, search
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Department Filter
      if (selectedDepartment !== 'ALL') {
        const dept = t.assignedDepartment || 'Customer Experience';
        if (dept !== selectedDepartment) return false;
      }

      // 2. Category Filter (MRTG vs SLA)
      if (selectedCategory !== 'ALL') {
        if (t.reportType !== selectedCategory) return false;
      }

      // 3. Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'FAILED' && t.status !== 'FAILED_MANUAL_REQUIRED') return false;
        if (statusFilter !== 'FAILED' && t.status !== statusFilter) return false;
      }

      // 4. Search Query
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
  }, [tasks, selectedDepartment, selectedCategory, statusFilter, searchQuery]);

  const getDepartmentBadge = (dept: string) => {
    switch (dept) {
      case 'Customer Experience':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <Building2 className="w-3 h-3 text-sky-600" />
            <span>Customer Experience</span>
          </span>
        );
      case 'Account Executive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Building2 className="w-3 h-3 text-indigo-600" />
            <span>Account Executive</span>
          </span>
        );
      case 'Finance':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Building2 className="w-3 h-3 text-emerald-600" />
            <span>Finance</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{dept}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Schedule"
        description="Monthly routine reporting queue and SLA tracking. Automated kickoff occurs on the 1st of each month."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCustomerModal}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              <span>Manage Routine Customers ({routineCustomers.length})</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRunMrtgBatch}
              disabled={isRunningMrtgBatch || tasks.filter((t) => t.reportType === 'MRTG' && t.status === 'PENDING').length === 0}
              className="bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 font-semibold"
              title="Execute MRTG batch generation immediately for this period"
            >
              {isRunningMrtgBatch ? (
                <Spinner size="sm" className="mr-1.5 text-indigo-600" />
              ) : (
                <Play className="w-3.5 h-3.5 mr-1.5 text-indigo-600 fill-indigo-600" />
              )}
              <span>Run MRTG Batch Now</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchTasks}
              className="text-slate-700 border-slate-300"
              title="Re-sync tasks with enrolled routine customers"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              <span>Re-sync Tasks</span>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Routine Tasks"
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
          label="Manual Action Needed"
          value={stats.failed + stats.breached}
          icon={AlertTriangle}
          subtext={`${stats.failed} failed, ${stats.breached} breached`}
          badge={
            stats.failed + stats.breached > 0 ? (
              <Badge variant="destructive">{stats.failed + stats.breached}</Badge>
            ) : undefined
          }
        />
      </div>

      {/* Filter and Tab Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs space-y-4 p-4">
        {/* Top Controls: Period selector + Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-40">
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
                  {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="secondary" size="icon-sm" onClick={fetchTasks} title="Refresh Tasks">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by customer name or Service ID..."
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Level 1: Department Group Tabs (NOC Grouping) */}
        <div className="border-b border-slate-200">
          <div className="flex items-center gap-1 overflow-x-auto pb-px">
            <button
              type="button"
              onClick={() => setSelectedDepartment('ALL')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                selectedDepartment === 'ALL'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Departments</span>
              <span className="px-1.5 py-0.2 rounded-full text-xs bg-slate-100 text-slate-700 font-bold">
                {deptCounts['ALL']}
              </span>
            </button>

            {DEPARTMENTS.map((dept) => {
              const active = selectedDepartment === dept;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDepartment(dept)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    active
                      ? 'border-orange-600 text-orange-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{dept}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                      active ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {deptCounts[dept] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Level 2: Sub-category Tabs (MRTG vs SLA) + Status Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          {/* Sub-Category Segmented Control */}
          <SegmentedControl
            size="sm"
            value={selectedCategory}
            onChange={(val) => setSelectedCategory(val as 'ALL' | 'MRTG' | 'SLA')}
            options={[
              { value: 'ALL', label: `All Reports (${categoryCounts.ALL})` },
              { value: 'MRTG', label: `MRTG (${categoryCounts.MRTG})` },
              { value: 'SLA', label: `SLA (${categoryCounts.SLA})` },
            ]}
          />

          {/* Status Filter Segmented Control */}
          <SegmentedControl
            size="sm"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as 'ALL' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'BREACHED')}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'PENDING', label: `Pending (${stats.pending})` },
              { value: 'COMPLETED', label: `Completed (${stats.completed})` },
              ...(stats.failed > 0 ? [{ value: 'FAILED', label: `Failed (${stats.failed})` }] : []),
              ...(stats.breached > 0 ? [{ value: 'BREACHED', label: `Breached (${stats.breached})` }] : []),
            ]}
          />
        </div>
      </div>

      {/* Task List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
            <span>Loading routine schedule tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={CalendarCheck}
              title={`No Tasks Generated for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
              description="Tasks auto-compile from enrolled routine customers. Click 'Manage Routine Customers' to enroll accounts into Customer Experience, Account Executive, or Finance."
              actionLabel="Manage Routine Customers"
              onAction={handleOpenCustomerModal}
            />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Search}
              title="No Tasks Matching Criteria"
              description="Try adjusting your department tab, report type filter, or search keywords."
              actionLabel="Reset Filters"
              onAction={() => {
                setSelectedDepartment('ALL');
                setSelectedCategory('ALL');
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
                  <TableHead>Customer &amp; Department</TableHead>
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
                      <TableCell className="text-center text-slate-500 font-medium text-xs tabular-nums">
                        {idx + 1}
                      </TableCell>

                      {/* Customer & Department Group */}
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-xs">{t.customerName}</div>
                        <div className="text-xs text-slate-500 font-sans tabular-nums mb-1">{t.customerId}</div>
                        <div>{getDepartmentBadge(t.assignedDepartment || 'Customer Experience')}</div>
                      </TableCell>

                      {/* Service ID & Plan */}
                      <TableCell>
                        <div className="text-xs font-sans font-medium text-slate-800 tabular-nums">{t.serviceId}</div>
                        <div className="text-xs text-slate-500">{t.serviceName}</div>
                      </TableCell>

                      {/* Report Type & Execution Engine */}
                      <TableCell>
                        <Badge
                          variant={t.reportType === 'SLA' ? 'info' : t.reportType === 'MRTG' ? 'warning' : 'neutral'}
                          className="font-semibold text-xs"
                        >
                          {t.reportType}
                        </Badge>
                      </TableCell>

                      {/* Kickoff & SLA */}
                      <TableCell>
                        <div className="text-xs text-slate-700">
                          {kickoffDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}{' '}
                          {kickoffDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
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
                          <Badge
                            variant="success"
                            dot
                            title={t.processedByName ? `Processed by ${t.processedByName}` : 'Completed'}
                          >
                            Completed
                          </Badge>
                        ) : t.status === 'FAILED_MANUAL_REQUIRED' ? (
                          <Badge
                            variant="destructive"
                            dot
                            title={t.errorMessage || 'Manual processing required'}
                          >
                            Failed (Manual)
                          </Badge>
                        ) : t.status === 'BREACHED' ? (
                          <Badge
                            variant="destructive"
                            dot
                            title="SLA Breached - Pending manual intervention"
                          >
                            SLA Breached
                          </Badge>
                        ) : (
                          <Badge
                            variant="warning"
                            dot
                            title="Pending generation (Scheduled within 24h cycle)"
                          >
                            Pending
                          </Badge>
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
                              }&type=${t.reportType === 'MRTG' ? 'MRTG' : 'SLA'}&scheduleTaskId=${t.id}${t.assignedDepartment ? `&dept=${encodeURIComponent(t.assignedDepartment)}` : ''}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-xs font-semibold shadow-xs transition-colors"
                              title="Process in Report Generator"
                            >
                              <span>Process in Generator</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/history?search=${encodeURIComponent(t.customerName)}`}
                                className="text-xs text-emerald-600 font-semibold hover:underline px-2 py-1"
                              >
                                View Report
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleTaskStatus(t, 'PENDING')}
                                className="text-xs h-7 px-2 text-slate-500 hover:text-slate-800"
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

      {/* Routine Customers Management Modal with Add / Remove per Department */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-600" />
                <span>Manage Routine Monthly Subscriptions</span>
                <InfoTooltip content="Customers enrolled in routine schedules persist automatically each month until removed." />
              </div>
              <Badge variant="neutral" className="text-xs">
                {routineCustomers.length} Total Enrolled
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
            {/* Department Selector Tabs inside Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                {DEPARTMENTS.map((dept) => {
                  const active = modalActiveDept === dept;
                  const count = (routineCustomersByDept[dept] || []).length;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => {
                        setModalActiveDept(dept);
                        setIsAddPickerOpen(false);
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-orange-50 text-orange-600 border border-orange-300'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{dept}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                          active ? 'bg-orange-200 text-orange-700' : 'bg-white text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Add Customer Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddPickerOpen(!isAddPickerOpen)}
                className="bg-orange-600 hover:bg-orange-700 text-xs h-8"
              >
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                <span>+ Add Customer to {modalActiveDept}</span>
              </Button>
            </div>

            {/* Quick Add Customer Form Banner (Search & Multi-Add Supported) */}
            {isAddPickerOpen && (
              <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-xl space-y-3 shadow-xs">
                {/* Header banner */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Search &amp; Add Customers to {modalActiveDept}
                    </span>
                    <Badge variant="neutral" className="text-xs">
                      {availableToAdd.length} Available in Catalog
                    </Badge>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddPickerOpen(false)}
                    className="text-slate-500 hover:text-slate-800 p-0.5 rounded"
                    title="Close picker"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter and Configuration Row */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                  <div className="sm:col-span-8">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Search Customer (Name, Customer ID, Service ID, or Plan)
                    </label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                      <Input
                        value={pickerSearchQuery}
                        onChange={(e) => setPickerSearchQuery(e.target.value)}
                        placeholder="Search by customer name, 01.xxxx, service ID..."
                        className="pl-8 text-xs h-8 bg-white"
                      />
                      {pickerSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setPickerSearchQuery('')}
                          className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-800 text-xs"
                          title="Clear search"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Default Report Type
                    </label>
                    <select
                      value={selectedReportTypeToAdd}
                      onChange={(e) => setSelectedReportTypeToAdd(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-orange-600 h-8"
                    >
                      <option value="MRTG">MRTG Only (Auto)</option>
                      <option value="SLA">SLA Only (Manual)</option>
                      <option value="BOTH">SLA &amp; MRTG (Both)</option>
                    </select>
                  </div>
                </div>

                {/* Batch Selection Controls Bar */}
                <div className="flex items-center justify-between text-xs bg-white/90 px-3 py-1.5 rounded-lg border border-orange-200/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleSelectAllFiltered}
                      disabled={filteredAvailableToAdd.length === 0}
                      className="h-6 text-xs px-2 text-slate-700 hover:text-slate-900 font-medium"
                    >
                      {filteredAvailableToAdd.length > 0 &&
                      filteredAvailableToAdd.every((c) => selectedCustomerIdsToAdd.includes(c.id))
                        ? 'Deselect All Filtered'
                        : `Select All Filtered (${filteredAvailableToAdd.length})`}
                    </Button>
                    {selectedCustomerIdsToAdd.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCustomerIdsToAdd([])}
                        className="h-6 text-xs px-2 text-rose-600 hover:text-rose-800"
                      >
                        Clear Selection
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-600">Selected:</span>
                    <Badge
                      variant={selectedCustomerIdsToAdd.length > 0 ? 'warning' : 'neutral'}
                      className={
                        selectedCustomerIdsToAdd.length > 0
                          ? 'bg-orange-600 text-white text-xs font-bold border-transparent'
                          : 'text-xs'
                      }
                    >
                      {selectedCustomerIdsToAdd.length} Customer{selectedCustomerIdsToAdd.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Scrollable Customer Multi-Select List */}
                <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                  {filteredAvailableToAdd.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">No matching customers found.</p>
                      <p className="text-xs text-slate-500 mt-0.5">Try searching with a different keyword or ID.</p>
                    </div>
                  ) : (
                    <>
                      {filteredAvailableToAdd.slice(0, 100).map((c) => {
                        const isSelected = selectedCustomerIdsToAdd.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => handleToggleCustomerSelection(c.id)}
                            className={`p-2.5 flex items-center justify-between gap-3 text-xs cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-orange-50/80 border-l-2 border-l-orange-600'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleCustomerSelection(c.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 truncate">{c.customerName}</div>
                                <div className="text-xs text-slate-500 flex items-center gap-2 truncate">
                                  <span>ID: <code className="font-sans tabular-nums">{c.customerId}</code></span>
                                  <span>•</span>
                                  <span>Service: <code className="font-sans tabular-nums">{c.serviceId}</code></span>
                                  {c.serviceName && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-600">{c.serviceName}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              <Badge variant="neutral" className="text-xs">
                                {c.serviceId}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                      {filteredAvailableToAdd.length > 100 && (
                        <div className="p-2 text-center text-xs text-slate-500 bg-slate-50 font-medium border-t border-slate-100">
                          Showing top 100 of {filteredAvailableToAdd.length} matching customers. Refine search to see specific entries.
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Enrolled customers will automatically have monthly schedule tasks generated for <strong>{modalActiveDept}</strong>.
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddPickerOpen(false)}
                      className="text-xs h-7 text-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleAddCustomersToRoutine}
                      loading={isSavingRoutineAction}
                      disabled={selectedCustomerIdsToAdd.length === 0 || isSavingRoutineAction}
                      className="bg-orange-600 hover:bg-orange-700 text-xs h-7 font-semibold"
                    >
                      {selectedCustomerIdsToAdd.length > 0
                        ? `Add ${selectedCustomerIdsToAdd.length} Customer${selectedCustomerIdsToAdd.length !== 1 ? 's' : ''} to ${modalActiveDept}`
                        : 'Select Customer(s) to Add'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Enrolled Customers Table for active department */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
              {(routineCustomersByDept[modalActiveDept] || []).length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No customers enrolled in {modalActiveDept} yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Click &quot;+ Add Customer to {modalActiveDept}&quot; above to enroll customers.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center">No</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service ID &amp; Plan</TableHead>
                      <TableHead>Report Type</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(routineCustomersByDept[modalActiveDept] || []).map((cust, idx) => (
                      <TableRow key={cust.id} className="hover:bg-slate-50 text-xs">
                        <TableCell className="text-center text-slate-500 font-medium tabular-nums">
                          {idx + 1}
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-slate-900">{cust.customerName}</div>
                          <div className="text-xs text-slate-500 font-sans tabular-nums">{cust.customerId}</div>
                        </TableCell>

                        <TableCell>
                          <div className="font-sans text-slate-800 tabular-nums">{cust.serviceId}</div>
                          <div className="text-xs text-slate-500">{cust.serviceName}</div>
                        </TableCell>

                        {/* Routine Report Type selector */}
                        <TableCell>
                          <select
                            value={cust.routineReportType || 'SLA'}
                            onChange={(e) => handleUpdateReportType(cust, e.target.value)}
                            className="text-xs bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-orange-600"
                          >
                            <option value="SLA">SLA Only (Manual)</option>
                            <option value="MRTG">MRTG Only (Auto)</option>
                            <option value="BOTH">SLA &amp; MRTG (Both)</option>
                          </select>
                        </TableCell>

                        {/* Remove Button */}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCustomerFromRoutine(cust)}
                            disabled={isSavingRoutineAction}
                            className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 h-7 px-2 text-xs"
                            title="Remove from routine monthly reporting"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>Remove</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <Button variant="secondary" onClick={() => setIsCustomerModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
