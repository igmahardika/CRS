'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Building2,
  Check,
  ArrowLeft,
  Download,
  Upload,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  RefreshCw,
  SlidersHorizontal,
  ShieldCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SearchX,
  RotateCcw,
  Radio,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { CustomerData } from '@/components/CustomerModal';
import CustomerFormModal from '@/components/CustomerFormModal';
import ExcelImportModal from '@/components/ExcelImportModal';
import { extractNodeFromServiceId } from '@/lib/service-utils';
import { toast } from 'sonner';
import {
  ConfirmDialog,
  PageHeader,
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui';
import { getSlaByServiceName } from '@/lib/service-sla';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'HAS_CACTI' | 'HAS_PRTG' | 'HAS_BOTH' | 'NO_GRAPH'>('ALL');
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
    const toUpdate = customers.filter(c => {
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
  const countWithCacti = customers.filter(c => Boolean(c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId))).length;
  const countWithPrtg = customers.filter(c => Boolean(c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId))).length;
  const countWithBoth = customers.filter(c => Boolean(c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId)) && Boolean(c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId))).length;
  const countNoGraph = customers.filter(c => !c.cactiGraphId && !c.prtgSensorId && !c.graphId).length;

  const countSla995 = customers.filter(c => c.targetSla === 99.5).length;
  const countSla98 = customers.filter(c => c.targetSla === 98.0).length;
  const countSla95 = customers.filter(c => c.targetSla === 95.0).length;
  const countNoSla = customers.filter(c => !c.targetSla || c.targetSla === 0).length;

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

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Customer Directory"
        description="Manage customer records, telemetry configurations, and SLA targets."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium">
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, CID, SID, or sensor ID..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Service Plan Dropdown Filter */}
          <div className="flex items-center space-x-2 shrink-0">
            <div className="relative flex items-center">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="pl-8 pr-8 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition appearance-none cursor-pointer"
                title="Filter by service plan"
              >
                <option value="ALL">All Plans ({customers.length})</option>
                {uniqueServices.map((serviceName) => {
                  const count = customers.filter(c => c.serviceName === serviceName).length;
                  return (
                    <option key={serviceName} value={serviceName}>
                      {serviceName} ({count})
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute right-2.5 text-[10px] text-slate-400">▼</div>
            </div>

            {/* Target SLA Dropdown Filter */}
            <div className="relative flex items-center">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value as 'ALL' | '99.5' | '98' | '95' | 'NO_SLA')}
                className="pl-8 pr-8 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition appearance-none cursor-pointer"
                title="Filter by SLA target"
              >
                <option value="ALL">All SLAs ({customers.length})</option>
                <option value="99.5">SLA 99.5% ({countSla995})</option>
                <option value="98">SLA 98.0% ({countSla98})</option>
                <option value="95">SLA 95.0% ({countSla95})</option>
                <option value="NO_SLA">No SLA ({countNoSla})</option>
              </select>
              <div className="pointer-events-none absolute right-2.5 text-[10px] text-slate-400">▼</div>
            </div>
          </div>
        </div>

        {/* Quick Filter Tabs & Active Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              All ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('HAS_CACTI')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === 'HAS_CACTI'
                ? 'bg-orange-600 text-white shadow-2xs'
                : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
            >
              Has Cacti ({countWithCacti})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('HAS_PRTG')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === 'HAS_PRTG'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
            >
              Has PRTG ({countWithPrtg})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('HAS_BOTH')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === 'HAS_BOTH'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
            >
              Dual Engine ({countWithBoth})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('NO_GRAPH')}
              className={`px-3 py-1.5 rounded-lg transition ${filterTab === 'NO_GRAPH'
                ? 'bg-slate-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
            >
              Unconfigured ({countNoGraph})
            </button>
          </div>

          {/* Reset Filters button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:text-orange-700 font-semibold hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-orange-950">
            <span className="font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
              {selectedIds.size.toLocaleString()} customer(s) selected
            </span>
            {selectedIds.size < filtered.length && (
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="font-bold text-orange-700 underline hover:text-orange-900 cursor-pointer ml-1"
              >
                Select all {filtered.length.toLocaleString()} customers in view
              </button>
            )}
            <span className="text-orange-300 hidden sm:inline">•</span>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer underline"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isBulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.size})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Customer Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-orange-500 mb-2" />
            <span>Loading customers...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mb-3 shadow-xs">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Customer Directory is Empty
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              No customer records available. Import your 4-column Excel file or add a customer record manually.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Customer</span>
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 mb-3 shadow-xs">
              <SearchX className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              No Customers Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
              {search ? (
                <>No records matching keyword &quot;<span className="font-semibold text-slate-700">{search}</span>&quot;.</>
              ) : (
                'Current filter combination returned zero records.'
              )}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[700px] overflow-y-auto relative scrollbar-thin">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 shadow-xs">
                <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomePageSelected && !isAllPageSelected;
                      }}
                      onChange={handleToggleSelectPage}
                      className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                      title={isAllPageSelected ? 'Deselect this page' : 'Select all on this page'}
                    />
                  </th>
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th
                    onClick={() => handleSort('customerName')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Customer Name"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer Name</span>
                      {sortColumn === 'customerName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('customerId')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Customer ID"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Customer ID</span>
                      {sortColumn === 'customerId' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('serviceId')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Service ID"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Service ID</span>
                      {sortColumn === 'serviceId' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('serviceName')}
                    className="py-3.5 px-4 cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Service Plan"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Service Plan</span>
                      {sortColumn === 'serviceName' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('nodeCount')}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Nodes"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Nodes</span>
                      {sortColumn === 'nodeCount' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('targetSla')}
                    className="py-3.5 px-4 text-center cursor-pointer select-none hover:bg-slate-100/70 hover:text-slate-900 transition group"
                    title="Sort by Target SLA"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Target SLA</span>
                      {sortColumn === 'targetSla' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-orange-600 shrink-0" /> : <ArrowDown className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      )}
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Cacti Graph ID</th>
                  <th className="py-3.5 px-4">PRTG Sensor ID</th>
                  <th className="py-3.5 px-4">Direction</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCustomers.map((c, idx) => {
                  const isSelected = Boolean(c.id && selectedIds.has(c.id));
                  return (
                    <tr
                      key={c.id || idx}
                      className={`transition ${isSelected ? 'bg-orange-50/70 hover:bg-orange-100/60' : 'hover:bg-slate-50/80'
                        }`}
                    >
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => c.id && handleToggleSelectOne(c.id)}
                          className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          aria-label={`Select ${c.customerName}`}
                        />
                      </td>
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                        {startIndex + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.customerName}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.customerId}</td>
                      <td className="py-3 px-4 font-mono text-slate-600">{c.serviceId}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                          {c.serviceName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs" title={`Node otomatis dari Service ID: ${c.nodeCount}`}>
                          {c.nodeCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.targetSla === 99.5 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]" title="SLA 99.5%">
                            99.5%
                          </span>
                        ) : c.targetSla === 98.0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]" title="SLA 98.0%">
                            98%
                          </span>
                        ) : c.targetSla === 95.0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px]" title="SLA 95.0%">
                            95%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 font-medium text-[11px]" title="No SLA">
                            No SLA
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {(c.cactiGraphId || (c.graphType === 'MRTG' && c.graphId)) ? (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-orange-100 text-orange-700 border border-orange-200">
                            {c.cactiGraphId || c.graphId}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {(c.prtgSensorId || (c.graphType === 'PRTG' && c.graphId)) ? (
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-blue-100 text-blue-700 border border-blue-200">
                            {c.prtgSensorId || c.graphId}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic font-mono">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${c.trafficDirection === 'REVERSED'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                        >
                          {c.trafficDirection || 'NORMAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <Link
                          href={`/?serviceId=${encodeURIComponent(c.serviceId)}&customerId=${encodeURIComponent(c.customerId)}`}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 rounded-lg text-[11px] font-semibold transition"
                          title="Use customer service in Report Generator"
                        >
                          <span>Select</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => handleOpenEdit(c)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setCustomerToDelete({ id: c.id!, name: c.customerName })}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            {/* Range info */}
            <div className="font-medium">
              Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> - <span className="font-bold text-slate-800">{endIndex}</span> of <span className="font-bold text-slate-800">{totalItems}</span> customers
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Rows per page selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-500 font-medium">Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <span className="px-3 py-1 font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-semibold"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
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
