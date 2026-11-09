'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Radio,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Server,
  Network,
  ArrowLeft,
  Link2,
  Copy,
  Check,
  FolderOpen,
  Folder,
  Activity,
  ExternalLink,
  AlertCircle,
  X,
  Users,
  CheckCircle2,
  Layers,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  FormField,
  Badge,
  PageHeader,
} from '@/components/ui';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
interface InterfaceItem {
  id: string;
  interfaceName: string;
  fullTitle: string;
  targetId: string;
  detectedSid: string | null;
  detectedCid: string | null;
  status: string;
  lastDiscovered: string;
}

interface DeviceNode {
  deviceName: string;
  deviceIp: string | null;
  interfaces: InterfaceItem[];
}

interface TreeGroup {
  groupName: string;
  devices: DeviceNode[];
}

interface DiscoverySummary {
  mrtgCount: number;
  prtgCount: number;
  lastMrtgSync: string | null;
  lastPrtgSync: string | null;
}

interface MappingState {
  targetId: string;
  engine: 'MRTG' | 'PRTG';
  fullTitle: string;
  detectedSid: string | null;
  customerId: string;
  searching: boolean;
  matched: { id: string; customerName: string; customerId: string; serviceId: string } | null;
}

// ----------------------------------------------------------------
// Utility Helpers
// ----------------------------------------------------------------
function formatRelative(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function getStatusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes('up')) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  if (s.includes('down')) return 'text-rose-600 bg-rose-50 border-rose-200';
  if (s.includes('paused') || s.includes('warning')) return 'text-amber-600 bg-amber-50 border-amber-200';
  return 'text-slate-600 bg-slate-100 border-slate-200';
}

// ----------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor(status)}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {status}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={handleCopy}
      title={`Salin ${label || value}`}
      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------
export default function DiscoveryPage() {
  const [activeEngine, setActiveEngine] = useState<'MRTG' | 'PRTG'>('MRTG');
  const [tree, setTree] = useState<TreeGroup[]>([]);
  const [summary, setSummary] = useState<DiscoverySummary>({ mrtgCount: 0, prtgCount: 0, lastMrtgSync: null, lastPrtgSync: null });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; msg: string; isFallback?: boolean } | null>(null);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedDevices, setExpandedDevices] = useState<Set<string>>(new Set());
  const [mapping, setMapping] = useState<MappingState | null>(null);
  const [mappingStatus, setMappingStatus] = useState<{ success: boolean; msg: string } | null>(null);

  // ---- Data Fetching ----
  const fetchTree = useCallback(async (eng: 'MRTG' | 'PRTG', q: string = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ engine: eng });
      if (q) params.set('search', q);
      const res = await fetch(`/api/discovery/tree?${params}`);
      const data = await res.json();
      if (data.tree) {
        setTree(data.tree);
        setSummary(data.summary || {});
        // Auto-expand first group if tree is small
        if (data.tree.length <= 3) {
          setExpandedGroups(new Set(data.tree.map((g: TreeGroup) => g.groupName)));
        } else {
          setExpandedGroups(new Set([data.tree[0]?.groupName].filter(Boolean)));
        }
        setExpandedDevices(new Set());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree(activeEngine, search);
  }, [activeEngine, fetchTree]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      fetchTree(activeEngine, search);
    }, 350);
    return () => clearTimeout(t);
  }, [search, activeEngine, fetchTree]);

  // ---- Sync Handler ----
  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/discovery/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: activeEngine }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncResult({
          success: true,
          msg: `Live Discovery completed! Found ${data.totalInterfaces.toLocaleString()} active interfaces across ${data.totalDevices.toLocaleString()} ${activeEngine} devices.`,
        });
        await fetchTree(activeEngine, search);
      } else {
        setSyncResult({ success: false, msg: data.error || 'Failed to connect to monitoring server.' });
      }
    } catch (err) {
      setSyncResult({ success: false, msg: String(err) });
    } finally {
      setSyncing(false);
    }
  };

  // ---- Tree Expand/Collapse ----
  const totalGroups = tree.length;
  const totalDevices = useMemo(() => tree.reduce((s, g) => s + g.devices.length, 0), [tree]);
  const totalInterfaces = useMemo(() => tree.reduce((s, g) => g.devices.reduce((d, dev) => d + dev.interfaces.length, 0) + s, 0), [tree]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleDevice = (key: string) => {
    setExpandedDevices((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(tree.map((g) => g.groupName)));
    setExpandedDevices(new Set(tree.flatMap((g) => g.devices.map((d) => `${g.groupName}::${d.deviceName}`))));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
    setExpandedDevices(new Set());
  };

  // ---- Mapping Dialog ----
  const openMapping = async (item: InterfaceItem, engine: 'MRTG' | 'PRTG') => {
    setMappingStatus(null);
    const initial: MappingState = {
      targetId: item.targetId,
      engine,
      fullTitle: item.fullTitle,
      detectedSid: item.detectedSid,
      customerId: item.detectedSid || '',
      searching: false,
      matched: null,
    };
    setMapping(initial);

    // Auto-search if SID detected
    if (item.detectedSid) {
      setMapping({ ...initial, searching: true });
      try {
        const res = await fetch(`/api/discovery/map-customer?targetId=${item.targetId}&engine=${engine}`);
        const data = await res.json();
        if (data.customers?.length > 0) {
          setMapping({ ...initial, matched: data.customers[0], customerId: data.customers[0].customerId });
        } else {
          // Try searching by SID
          const cusRes = await fetch(`/api/customers?search=${encodeURIComponent(item.detectedSid || '')}`);
          const cusData = await cusRes.json();
          const found = cusData.customers?.[0];
          setMapping({ ...initial, matched: found || null, customerId: found?.customerId || item.detectedSid || '' });
        }
      } catch {
        setMapping({ ...initial, searching: false });
      }
    }
  };

  const confirmMapping = async () => {
    if (!mapping) return;
    try {
      const res = await fetch('/api/discovery/map-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: mapping.customerId,
          engine: mapping.engine,
          targetId: mapping.targetId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMappingStatus({ success: true, msg: data.message });
        setMapping(null);
      } else {
        setMappingStatus({ success: false, msg: data.error });
      }
    } catch (err) {
      setMappingStatus({ success: false, msg: String(err) });
    }
  };

  const currentSync = activeEngine === 'MRTG' ? summary.lastMrtgSync : summary.lastPrtgSync;
  const currentCount = activeEngine === 'MRTG' ? summary.mrtgCount : summary.prtgCount;

  // ----------------------------------------------------------------
  return (
    <div className="space-y-5">
      {/* Standard Page Header */}
      <PageHeader
        title="Network Discovery"
        description="Discover devices, interfaces, and sensor IDs directly from MRTG (Cacti) and PRTG servers."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Generator</span>
          </Link>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="neutral" className="gap-1.5 py-1 px-2.5">
              <Network className="w-3.5 h-3.5 text-slate-500" />
              <span suppressHydrationWarning>
                MRTG: <strong className="text-slate-900">{new Intl.NumberFormat('en-US').format(summary.mrtgCount)}</strong>
              </span>
            </Badge>
            <Badge variant="neutral" className="gap-1.5 py-1 px-2.5">
              <Activity className="w-3.5 h-3.5 text-slate-500" />
              <span suppressHydrationWarning>
                PRTG: <strong className="text-slate-900">{new Intl.NumberFormat('en-US').format(summary.prtgCount)}</strong>
              </span>
            </Badge>
          </div>
        }
      />

      {/* Engine Selector & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Engine Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold self-start">
          <button
            onClick={() => { setActiveEngine('MRTG'); setSyncResult(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${activeEngine === 'MRTG' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>MRTG / Cacti</span>
            {summary.mrtgCount > 0 && (
              <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {summary.mrtgCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveEngine('PRTG'); setSyncResult(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition ${activeEngine === 'PRTG' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>PRTG Network Monitor</span>
            {summary.prtgCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full text-[10px]">
                {summary.prtgCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Last Sync Time */}
          {currentSync && (
            <span className="text-[11px] text-slate-400 hidden sm:block">
              Synced: {formatRelative(currentSync)}
            </span>
          )}

          {/* Discover Button */}
          <button
            onClick={handleSync}
            disabled={syncing}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60 active:scale-95 ${activeEngine === 'MRTG'
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Connecting to server...' : `Run ${activeEngine} Discovery`}</span>
          </button>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <div className={`flex items-start gap-3 p-4 rounded-2xl border text-xs font-medium shadow-xs ${syncResult.success
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
          {syncResult.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <p className="font-semibold">{syncResult.msg}</p>
            {!syncResult.success && (
              <p className="text-[11px] text-rose-700">
                Please verify server URLs and credentials in{' '}
                <Link href="/settings" className="font-bold underline hover:text-rose-950">
                  Server Settings
                </Link>{' '}
                and verify the monitoring host is reachable.
              </p>
            )}
          </div>
          <button onClick={() => setSyncResult(null)} className="shrink-0 opacity-60 hover:opacity-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mapping Status Banner */}
      {mappingStatus && (
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-medium shadow-xs ${mappingStatus.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
          {mappingStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
          <span className="flex-1">{mappingStatus.msg}</span>
          <button onClick={() => setMappingStatus(null)}><X className="w-4 h-4 opacity-60" /></button>
        </div>
      )}

      {/* Search + Expand Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search device, interface, Service ID, or Graph ID..."
            className="w-full pl-10 pr-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          <span className="text-slate-400 hidden sm:block">
            {totalGroups} groups • {totalDevices} devices • {totalInterfaces} interfaces
          </span>
          <button onClick={expandAll} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition">
            Collapse All
          </button>
        </div>
      </div>

      {/* Tree View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-6 h-6 text-orange-500 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-400">Loading discovery data...</p>
          </div>
        ) : tree.length === 0 ? (
          <div className="py-20 px-6 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-400">
              <Radio className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">No Discovery Data Yet</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {currentCount === 0
                  ? `Click "Run ${activeEngine} Discovery" to fetch devices and interfaces from the monitoring server.`
                  : 'No interfaces match your search query.'}
              </p>
            </div>
            {currentCount === 0 && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                <span>{syncing ? 'Connecting...' : `Run ${activeEngine} Discovery Now`}</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tree.map((group) => {
              const groupKey = group.groupName;
              const isGroupOpen = expandedGroups.has(groupKey);
              const groupInterfaces = group.devices.reduce((s, d) => s + d.interfaces.length, 0);

              return (
                <div key={groupKey}>
                  {/* Group Row */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition text-left group"
                  >
                    <span className="text-slate-400 group-hover:text-slate-600 transition">
                      {isGroupOpen ? <FolderOpen className="w-4 h-4 text-orange-400" /> : <Folder className="w-4 h-4" />}
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex-1">{groupKey}</span>
                    <span className="text-[11px] text-slate-400 font-mono mr-2">
                      {group.devices.length} device • {groupInterfaces} interface
                    </span>
                    {isGroupOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  </button>

                  {/* Device Rows */}
                  {isGroupOpen && group.devices.map((device) => {
                    const deviceKey = `${groupKey}::${device.deviceName}`;
                    const isDeviceOpen = expandedDevices.has(deviceKey);

                    return (
                      <div key={deviceKey} className="border-t border-slate-100">
                        {/* Device Row */}
                        <button
                          onClick={() => toggleDevice(deviceKey)}
                          className="w-full flex items-center gap-3 pl-10 pr-5 py-2.5 hover:bg-slate-50 transition text-left group"
                        >
                          <Server className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600 shrink-0 transition" />
                          <span className="text-xs font-semibold text-slate-700 flex-1">{device.deviceName}</span>
                          {device.deviceIp && (
                            <span className="font-mono text-[10px] text-slate-400 hidden sm:block">{device.deviceIp}</span>
                          )}
                          <span className="text-[11px] text-slate-400 font-mono mr-2">
                            {device.interfaces.length} interface
                          </span>
                          {isDeviceOpen ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                        </button>

                        {/* Interface Rows */}
                        {isDeviceOpen && device.interfaces.map((iface) => (
                          <div
                            key={iface.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 pl-16 pr-4 py-2.5 border-t border-slate-50 hover:bg-orange-50/40 transition group"
                          >
                            {/* Interface info */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Network className="w-3 h-3 text-slate-300 group-hover:text-orange-400 shrink-0 transition" />
                              <span className="text-[11px] text-slate-700 font-medium truncate max-w-[260px]" title={iface.fullTitle}>
                                {iface.interfaceName}
                              </span>
                              <StatusBadge status={iface.status} />
                            </div>

                            {/* Badges row */}
                            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                              {/* Target ID badge */}
                              <span className={`flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${activeEngine === 'MRTG'
                                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                                }`}>
                                ID: {iface.targetId}
                              </span>

                              {/* Detected SID badge */}
                              {iface.detectedSid && (
                                <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                  SID: {iface.detectedSid}
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <CopyButton value={iface.targetId} label={`${activeEngine} ID`} />
                              <Link
                                href={`/?graphId=${iface.targetId}&engine=${activeEngine}`}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-slate-50 hover:bg-orange-50 text-slate-600 hover:text-orange-700 border border-slate-200 hover:border-orange-200 rounded-lg transition"
                                title="Use this ID in Report Generator"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span className="hidden sm:inline">Generator</span>
                              </Link>
                              <button
                                onClick={() => openMapping(iface, activeEngine)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition active:scale-95 shadow-xs"
                                title="Map to Customer"
                              >
                                <Link2 className="w-3 h-3" />
                                <span className="hidden sm:inline">Map</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mapping Dialog Modal */}
      <Dialog open={Boolean(mapping)} onOpenChange={(open) => !open && setMapping(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Map to Customer Record</DialogTitle>
          </DialogHeader>

          {mapping && (
            <div className="space-y-4 text-[13px] font-sans py-2">
              <p className="text-[12px] text-slate-500">
                Associate {mapping.engine} monitoring ID with customer directory.
              </p>

              {/* Interface Info Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Interface:</span>
                  <span className="font-semibold text-slate-900 truncate">{mapping.fullTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="soft" className="font-mono text-[11px]">
                    {mapping.engine} ID: {mapping.targetId}
                  </Badge>
                  {mapping.detectedSid && (
                    <Badge variant="success" className="font-mono text-[11px]">
                      SID: {mapping.detectedSid}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Auto-matched customer info */}
              {mapping.matched && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[12px] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Customer auto-detected
                  </div>
                  <div className="text-emerald-700">
                    <strong>{mapping.matched.customerName}</strong> — CID: {mapping.matched.customerId} | SID: {mapping.matched.serviceId}
                  </div>
                </div>
              )}

              {/* Customer ID Input */}
              <FormField label="Customer ID" required hint="Enter an existing Customer ID from directory">
                <Input
                  value={mapping.customerId}
                  onChange={(e) => setMapping({ ...mapping, customerId: e.target.value, matched: null })}
                  placeholder="e.g. 01.2180.1124"
                  className="font-mono text-[12px]"
                />
              </FormField>

              {/* Actions */}
              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setMapping(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmMapping}
                  disabled={!mapping.customerId.trim()}
                >
                  <Link2 className="w-4 h-4 mr-1.5" />
                  Save Mapping
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

