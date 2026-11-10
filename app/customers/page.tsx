'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowLeft,
  Download,
  Upload,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SearchX,
  RotateCcw,
  ChevronDown,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { CustomerData } from '@/components/CustomerFormModal';
import CustomerFormModal from '@/components/CustomerFormModal';
import ExcelImportModal from '@/components/ExcelImportModal';
import { extractNodeFromServiceId } from '@/lib/service-utils';
import { toast } from 'sonner';
import {
  ConfirmDialog,
  PageHeader,
  Button,
  Input,
  Checkbox,
  Badge,
  EmptyState,
  Spinner,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ROUTINE' | 'HAS_CACTI' | 'HAS_PRTG' | 'HAS_BOTH' | 'NO_GRAPH'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [slaFilter, setSlaFilter] = useState<'ALL' | '99.5' | '98' | '95' | 'NO_SLA'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerData | null>(null);
  const [isSyncingNodes, setIsSyncingNodes] = useState(false);
  const [isSyncingSla, setIsSyncingSla] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<{ id: string; name: string } | null>(null);
  const [nodesToSync, setNodesToSync] = useState<CustomerData[] | null>(null);
  const [syncSlaOpen, setSyncSlaOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Sorting state
  type SortColumn = 'customerName' | 'customerId' | 'serviceId' | 'serviceName' | 'nodeCount' | 'targetSla';
  type SortDirection = 'asc' | 'desc';
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() !== '' ||
    filterTab !== 'ALL' ||
    serviceFilter !== 'ALL' ||
    slaFilter !== 'ALL' ||
    sortColumn !== null
  );

  const handleResetAllFilters = () => {
    setSearch('');
    setFilterTab('ALL');
    setServiceFilter('ALL');
    setSlaFilter('ALL');
    setSortColumn(null);
    setCurrentPage(1);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.customers) setCustomers(data.customers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Unique service names list for dropdown
  const uniqueServices = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      if (c.serviceName && c.serviceName.trim()) {
        set.add(c.serviceName.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer: CustomerData) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (data: CustomerData) => {
    try {
      if (editingCustomer?.id) {
        const res = await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCustomer.id, ...data }),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || 'Failed to save changes.');
          return;
        }
        toast.success(`Customer "${data.customerName}" updated successfully.`);
      } else {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json();
          toast.error(err.error || 'Failed to add customer.');
          return;
        }
        toast.success(`Customer "${data.customerName}" added successfully.`);
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save customer.');
    }
  };

  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;
    try {
      const res = await fetch(`/api/customers?id=${customerToDelete.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Customer "${customerToDelete.name}" deleted.`);
        fetchCustomers();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Failed to delete customer.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete customer.');
    } finally {
      setCustomerToDelete(null);
    }
  };

  // Feature: Auto-sync all customer nodes in database based on Service ID
  const handleAutoSyncAllNodes = () => {
    const toUpdate = customers.filter((c) => {
      const expected = extractNodeFromServiceId(c.serviceId);
      return expected !== c.nodeCount;
    });

    if (toUpdate.length === 0) {
      toast.info('All customer nodes are already synchronized with their Service IDs.');
      return;
    }

    setNodesToSync(toUpdate);
  };

  const confirmAutoSyncNodes = async () => {
    if (!nodesToSync || nodesToSync.length === 0) return;
    setIsSyncingNodes(true);
    try {
      let updatedCount = 0;
      for (const cust of nodesToSync) {
        const newNode = extractNodeFromServiceId(cust.serviceId);
        await fetch('/api/customers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...cust,
            nodeCount: newNode,
          }),
        });
        updatedCount++;
      }
      toast.success(`Successfully updated ${updatedCount} customer nodes based on Service IDs.`);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      toast.error('Error occurred while synchronizing nodes.');
    } finally {
      setIsSyncingNodes(false);
      setNodesToSync(null);
    }
  };

  // Sync SLA Otomatis untuk semua pelanggan berdasarkan nama layanan
  const handleAutoSyncAllSla = () => {
    setSyncSlaOpen(true);
  };

  const confirmAutoSyncSla = async () => {
    setSyncSlaOpen(false);
    setIsSyncingSla(true);
    try {
      const res = await fetch('/api/customers/sync-sla', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `SLA sync complete: ${data.updatedCount} records updated out of ${data.totalCustomers} customers.`
        );
        fetchCustomers();
      } else {
        toast.error(`Failed: ${data.error || 'An unexpected error occurred'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error occurred while synchronizing SLAs.');
    } finally {
      setIsSyncingSla(false);
    }
  };

  // Filtered dataset
  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = search.trim().toLowerCase();
      const hasCacti = Boolean(c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId));
      const hasPrtg = Boolean(c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId));

      const matchesSearch =
        !q ||
        c.customerName.toLowerCase().includes(q) ||
        c.customerId.toLowerCase().includes(q) ||
        c.serviceId.toLowerCase().includes(q) ||
        c.serviceName.toLowerCase().includes(q) ||
        (c.cactiGraphId && c.cactiGraphId.toLowerCase().includes(q)) ||
        (c.prtgSensorId && c.prtgSensorId.toLowerCase().includes(q)) ||
        (c.graphId && c.graphId.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (filterTab === 'ROUTINE' && !c.isMonthlyRoutine) return false;
      if (filterTab === 'HAS_CACTI' && !hasCacti) return false;
      if (filterTab === 'HAS_PRTG' && !hasPrtg) return false;
      if (filterTab === 'HAS_BOTH' && (!hasCacti || !hasPrtg)) return false;
      if (filterTab === 'NO_GRAPH' && (hasCacti || hasPrtg)) return false;
      if (serviceFilter !== 'ALL' && c.serviceName.trim() !== serviceFilter) return false;

      // SLA Filter
      if (slaFilter === '99.5' && c.targetSla !== 99.5) return false;
      if (slaFilter === '98' && c.targetSla !== 98.0) return false;
      if (slaFilter === '95' && c.targetSla !== 95.0) return false;
      if (slaFilter === 'NO_SLA' && Boolean(c.targetSla && c.targetSla > 0)) return false;

      return true;
    });
  }, [customers, search, filterTab, serviceFilter, slaFilter]);

  // Counters
  const countRoutine = customers.filter((c) => Boolean(c.isMonthlyRoutine)).length;
  const countWithCacti = customers.filter(
    (c) => Boolean(c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId))
  ).length;
  const countWithPrtg = customers.filter(
    (c) => Boolean(c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId))
  ).length;
  const countWithBoth = customers.filter(
    (c) =>
      Boolean(c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId)) &&
      Boolean(c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId))
  ).length;
  const countNoGraph = customers.filter((c) => !c.cactiGraphId && !c.prtgSensorId && !c.graphId).length;

  const countSla995 = customers.filter((c) => c.targetSla === 99.5).length;
  const countSla98 = customers.filter((c) => c.targetSla === 98.0).length;
  const countSla95 = customers.filter((c) => c.targetSla === 95.0).length;
  const countNoSla = customers.filter((c) => !c.targetSla || c.targetSla === 0).length;

  // Sorted dataset
  const sorted = useMemo(() => {
    if (!sortColumn) return filtered;

    return [...filtered].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
        return sortDirection === 'asc' ? cmp : -cmp;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortColumn, sortDirection]);

  // Pagination calculation
  const totalItems = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedCustomers = sorted.slice(startIndex, endIndex);

  // Multiple selection helpers
  const currentPageIds = paginatedCustomers.map((c) => c.id).filter(Boolean) as string[];
  const isAllPageSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.has(id));
  const isSomePageSelected = currentPageIds.some((id) => selectedIds.has(id));

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filtered.map((c) => c.id).filter(Boolean) as string[];
    setSelectedIds(new Set(allFilteredIds));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    const isAll = count === customers.length && count > 0;
    setBulkDeleteOpen(false);
    setIsBulkDeleting(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isAll ? { all: true } : { ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully deleted ${count} customer(s).`);
        setSelectedIds(new Set());
        fetchCustomers();
      } else {
        toast.error(data.error || 'Failed to delete selected customers.');
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred while deleting customers.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Reset page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterTab, serviceFilter, slaFilter, pageSize, sortColumn, sortDirection]);

  const filterOptions: { id: typeof filterTab; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: customers.length },
    { id: 'ROUTINE', label: 'Wajib Bulanan', count: countRoutine },
    { id: 'HAS_CACTI', label: 'Has Cacti', count: countWithCacti },
    { id: 'HAS_PRTG', label: 'Has PRTG', count: countWithPrtg },
    { id: 'HAS_BOTH', label: 'Dual Engine', count: countWithBoth },
    { id: 'NO_GRAPH', label: 'Unconfigured', count: countNoGraph },
  ];

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Customer Directory"
        description="Manage customer records, telemetry configurations, and SLA targets."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAutoSyncAllNodes}
              disabled={isSyncingNodes || customers.length === 0}
              title="Auto-calculate and sync node count from Service ID"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingNodes ? 'animate-spin' : ''}`} />
              <span>{isSyncingNodes ? 'Syncing...' : 'Sync Nodes'}</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleAutoSyncAllSla}
              disabled={isSyncingSla || customers.length === 0}
              title="Auto-sync target SLA for all customers based on service name"
            >
              <ShieldCheck className={`w-3.5 h-3.5 mr-1.5 ${isSyncingSla ? 'animate-spin' : ''}`} />
              <span>{isSyncingSla ? 'Syncing...' : 'Auto-Sync SLA'}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <span>Excel Tools</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <a href="/api/customers/template">
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Download Template</span>
                  </DropdownMenuItem>
                </a>
                <DropdownMenuItem
                  onClick={() => setIsImportModalOpen(true)}
                  className="gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Import Excel</span>
                </DropdownMenuItem>
                <a href="/api/customers/export" download>
                  <DropdownMenuItem className="gap-2 cursor-pointer">
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Export All (.xlsx)</span>
                  </DropdownMenuItem>
                </a>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add Customer</span>
            </Button>
          </div>
        }
      />

      {/* Filter & Search Bar Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, CID, SID, or sensor ID..."
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

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Service Plan Filter */}
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger selectSize="sm" className="w-[190px] h-9">
                <div className="flex items-center gap-1.5 truncate">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="All Plans" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Plans ({customers.length})</SelectItem>
                {uniqueServices.map((serviceName) => {
                  const count = customers.filter((c) => c.serviceName === serviceName).length;
                  return (
                    <SelectItem key={serviceName} value={serviceName}>
                      {serviceName} ({count})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Target SLA Filter */}
            <Select
              value={slaFilter}
              onValueChange={(val) => setSlaFilter(val as 'ALL' | '99.5' | '98' | '95' | 'NO_SLA')}
            >
              <SelectTrigger selectSize="sm" className="w-[160px] h-9">
                <div className="flex items-center gap-1.5 truncate">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="All SLAs" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All SLAs ({customers.length})</SelectItem>
                <SelectItem value="99.5">SLA 99.5% ({countSla995})</SelectItem>
                <SelectItem value="98">SLA 98.0% ({countSla98})</SelectItem>
                <SelectItem value="95">SLA 95.0% ({countSla95})</SelectItem>
                <SelectItem value="NO_SLA">No SLA ({countNoSla})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Filter Tabs & Active Filter Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {filterOptions.map((opt) => {
              const isActive = filterTab === opt.id;
              return (
                <Button
                  key={opt.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setFilterTab(opt.id)}
                  className={
                    isActive
                      ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-7 px-2.5 text-xs font-semibold'
                      : 'text-slate-600 hover:bg-slate-100 h-7 px-2.5 text-xs'
                  }
                >
                  <span>{opt.label}</span>
                  <span
                    className={`ml-1 text-[11px] tabular-nums ${
                      isActive ? 'text-slate-300' : 'text-slate-400'
                    }`}
                  >
                    ({opt.count})
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAllFilters}
              className="text-xs text-[#EA580C] hover:text-[#C2410C] hover:bg-orange-50 h-7 px-2 font-medium"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              <span>Reset Filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Batch Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-[#FFF7ED] border border-orange-200 rounded-lg p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-orange-950">
            <span className="font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#EA580C] animate-pulse" />
              {selectedIds.size.toLocaleString()} customer(s) selected
            </span>
            {selectedIds.size < filtered.length && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllFiltered}
                className="text-xs h-6 px-1.5 text-[#C2410C] hover:text-[#EA580C] hover:bg-orange-100 font-semibold underline"
              >
                Select all {filtered.length.toLocaleString()} customers in view
              </Button>
            )}
            <span className="text-orange-300 hidden sm:inline">•</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSelection}
              className="text-xs h-6 px-1.5 text-slate-600 hover:text-slate-900 hover:bg-orange-100 font-medium underline"
            >
              Clear selection
            </Button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              loading={isBulkDeleting}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Delete Selected ({selectedIds.size})</span>
            </Button>
          </div>
        </div>
      )}

      {/* Customer Table Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <Spinner size="md" className="mx-auto text-[#EA580C] mb-2" />
            <span>Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="Customer Directory is Empty"
              description="No customer records available. Import your 4-column Excel file or add a customer record manually."
              action={
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    <span>Import Excel</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenAdd}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span>Add Customer</span>
                  </Button>
                </div>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={SearchX}
              title="No Customers Found"
              description={
                search
                  ? `No records matching keyword "${search}".`
                  : 'Current filter combination returned zero records.'
              }
              actionLabel={hasActiveFilters ? 'Reset Filters' : undefined}
              onAction={hasActiveFilters ? handleResetAllFilters : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto relative scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={isAllPageSelected ? true : isSomePageSelected ? 'indeterminate' : false}
                        onCheckedChange={handleToggleSelectPage}
                        aria-label="Select all customers on this page"
                      />
                    </div>
                  </TableHead>
                  <TableHead className="w-12 text-center ">No</TableHead>
                  <TableHead
                    onClick={() => handleSort('customerName')}
                    className="cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Customer Name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer Name</span>
                      {sortColumn === 'customerName' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('customerId')}
                    className="cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Customer ID"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer ID</span>
                      {sortColumn === 'customerId' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('serviceId')}
                    className="cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Service ID"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Service ID</span>
                      {sortColumn === 'serviceId' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('serviceName')}
                    className="cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Service Plan"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Service Plan</span>
                      {sortColumn === 'serviceName' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('nodeCount')}
                    className="text-center cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Nodes"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Nodes</span>
                      {sortColumn === 'nodeCount' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    onClick={() => handleSort('targetSla')}
                    className="text-center cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Target SLA"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Target SLA</span>
                      {sortColumn === 'targetSla' ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Cacti Graph ID</TableHead>
                  <TableHead>PRTG Sensor ID</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCustomers.map((c, idx) => {
                  const isSelected = Boolean(c.id && selectedIds.has(c.id));
                  return (
                    <TableRow
                      key={c.id || idx}
                      className={isSelected ? 'bg-orange-50/60 hover:bg-orange-100/50' : undefined}
                    >
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => c.id && handleToggleSelectOne(c.id)}
                            aria-label={`Select ${c.customerName}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-slate-400 text-[11px] tabular-nums">
                        {startIndex + idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{c.customerName}</span>
                          {c.isMonthlyRoutine && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-[#EA580C] border border-orange-200"
                              title={`Wajib Laporan Bulanan (${c.routineReportType || 'SLA'})`}
                            >
                              📅 {c.routineReportType || 'SLA'}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 text-xs tabular-nums">{c.customerId}</TableCell>
                      <TableCell className="text-slate-600 text-xs tabular-nums">{c.serviceId}</TableCell>
                      <TableCell className="text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {c.serviceName}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-blue-50 text-blue-700 font-semibold text-[11px] tabular-nums"
                          title={`Node from Service ID: ${c.nodeCount}`}
                        >
                          {c.nodeCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {c.targetSla === 99.5 ? (
                          <Badge variant="success">99.5%</Badge>
                        ) : c.targetSla === 98.0 ? (
                          <Badge variant="info">98%</Badge>
                        ) : c.targetSla === 95.0 ? (
                          <Badge variant="warning">95%</Badge>
                        ) : (
                          <Badge variant="neutral">No SLA</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId) ? (
                          <span className="px-1.5 py-0.5 rounded font-medium text-[11px] bg-orange-50 text-orange-700 border border-orange-200">
                            {c.cactiGraphId || c.graphId}
                          </span>
                        ) : (
                          <span className="text-slate-300 ">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId) ? (
                          <span className="px-1.5 py-0.5 rounded font-medium text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                            {c.prtgSensorId || c.graphId}
                          </span>
                        ) : (
                          <span className="text-slate-300 ">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.trafficDirection === 'REVERSED' ? (
                          <Badge variant="warning">REVERSED</Badge>
                        ) : (
                          <Badge variant="neutral">NORMAL</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/?serviceId=${encodeURIComponent(c.serviceId)}&customerId=${encodeURIComponent(
                              c.customerId
                            )}`}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200 hover:border-orange-200 rounded-md text-[11px] font-medium transition-colors"
                            title="Use customer service in Report Generator"
                          >
                            <span>Select</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Customer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setCustomerToDelete({ id: c.id!, name: c.customerName })}
                            title="Delete Customer"
                            className="hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            {/* Range info */}
            <div className="font-medium">
              Showing <span className="font-semibold text-slate-900 tabular-nums">{startIndex + 1}</span> -{' '}
              <span className="font-semibold text-slate-900 tabular-nums">{endIndex}</span> of{' '}
              <span className="font-semibold text-slate-900 tabular-nums">{totalItems}</span> customers
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Rows per page selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">Rows:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => setPageSize(Number(val))}
                >
                  <SelectTrigger selectSize="sm" className="w-[72px] h-8 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center space-x-1">
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  title="Previous Page"
                  className="gap-1 font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </Button>

                <span className="px-3 py-1 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg text-xs tabular-nums">
                  {safeCurrentPage} / {totalPages}
                </span>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  title="Next Page"
                  className="gap-1 font-semibold"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon-sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Import Excel */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchCustomers();
        }}
      />

      {/* Modal Add / Edit Customer */}
      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveCustomer}
        initialData={editingCustomer}
      />

      {/* Confirm Dialog: Single Customer Delete */}
      <ConfirmDialog
        open={customerToDelete !== null}
        onOpenChange={(open) => !open && setCustomerToDelete(null)}
        title="Delete Customer"
        description={`Permanently delete customer "${customerToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Customer"
        variant="destructive"
        onConfirm={confirmDeleteCustomer}
      />

      {/* Confirm Dialog: Sync Nodes */}
      <ConfirmDialog
        open={nodesToSync !== null}
        onOpenChange={(open) => !open && setNodesToSync(null)}
        title="Sync Customer Nodes"
        description={`Found ${nodesToSync?.length ?? 0} customer(s) with mismatched node counts. Run auto-synchronization now?`}
        confirmLabel="Sync Nodes"
        onConfirm={confirmAutoSyncNodes}
      />

      {/* Confirm Dialog: Sync Target SLA */}
      <ConfirmDialog
        open={syncSlaOpen}
        onOpenChange={setSyncSlaOpen}
        title="Auto-Sync Target SLA"
        description="Auto-synchronize target SLAs for all customers based on their service plans?"
        confirmLabel="Sync Target SLAs"
        onConfirm={confirmAutoSyncSla}
      />

      {/* Confirm Dialog: Bulk Delete */}
      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title="Delete Selected Customers"
        description={
          selectedIds.size === customers.length && customers.length > 0
            ? `Permanently delete ALL ${selectedIds.size} customers in the database? This action cannot be undone.`
            : `Permanently delete ${selectedIds.size} selected customer(s)? This action cannot be undone.`
        }
        confirmLabel={`Delete ${selectedIds.size} Customer${selectedIds.size === 1 ? '' : 's'}`}
        variant="destructive"
        onConfirm={confirmBulkDelete}
      />
    </div>
  );
}
