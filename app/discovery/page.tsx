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
  CheckCircle2,
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
  Spinner,
  EmptyState,
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
  serviceId: string;
  searching: boolean;
  matched: { id: string; customerName: string; customerId: string; serviceId: string } | null;
}

function formatRelative(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      title={`Copy ${label || value}`}
      className="h-7 w-7 text-slate-500 hover:text-slate-800"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

export default function DiscoveryPage() {
  const [activeEngine, setActiveEngine] = useState<'MRTG' | 'PRTG'>('MRTG');
  const [tree, setTree] = useState<TreeGroup[]>([]);
  const [summary, setSummary] = useState<DiscoverySummary>({
    mrtgCount: 0,
    prtgCount: 0,
    lastMrtgSync: null,
    lastPrtgSync: null,
  });
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
          msg: `Discovery completed: Found ${data.totalInterfaces.toLocaleString()} active interfaces across ${data.totalDevices.toLocaleString()} ${activeEngine} devices.`,
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
  const totalInterfaces = useMemo(
    () => tree.reduce((s, g) => g.devices.reduce((d, dev) => d + dev.interfaces.length, 0) + s, 0),
    [tree]
  );

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
    const sid = item.detectedSid || '';
    const initial: MappingState = {
      targetId: item.targetId,
      engine,
      fullTitle: item.fullTitle,
      detectedSid: item.detectedSid,
      serviceId: sid,
      searching: Boolean(sid),
      matched: null,
    };
    setMapping(initial);

    try {
      // 1. Cek apakah monitoring targetId ini sudah ter-map ke customer tertentu
      const res = await fetch(`/api/discovery/map-customer?targetId=${item.targetId}&engine=${engine}`);
      const data = await res.json();
      if (data.customers?.length > 0) {
        const found = data.customers[0];
        setMapping({
          ...initial,
          matched: found,
          serviceId: found.serviceId || sid,
          searching: false,
        });
        return;
      }

      // 2. Jika belum ter-map, cari customer berdasarkan Service ID (SID)
      if (sid) {
        const cusRes = await fetch(`/api/customers?serviceId=${encodeURIComponent(sid)}`);
        const cusData = await cusRes.json();
        let found = cusData.customers?.find((c: { serviceId: string }) => c.serviceId.toLowerCase() === sid.toLowerCase());

        // Jika tidak ketemu exact SID, cari dengan search general
        if (!found) {
          const searchRes = await fetch(`/api/customers?search=${encodeURIComponent(sid)}`);
          const searchData = await searchRes.json();
          found = searchData.customers?.find((c: { serviceId: string }) => c.serviceId.toLowerCase() === sid.toLowerCase()) || searchData.customers?.[0];
        }

        setMapping({
          ...initial,
          matched: found || null,
          serviceId: found?.serviceId || sid,
          searching: false,
        });
      } else {
        setMapping({ ...initial, searching: false });
      }
    } catch {
      setMapping({ ...initial, searching: false });
    }
  };

  const confirmMapping = async () => {
    if (!mapping) return;
    try {
      const res = await fetch('/api/discovery/map-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: mapping.serviceId,
          engine: mapping.engine,
          targetId: mapping.targetId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMappingStatus({ success: true, msg: data.message });
        setMapping(null);
        await fetchTree(activeEngine, search);
      } else {
        setMappingStatus({ success: false, msg: data.error });
      }
    } catch (err) {
      setMappingStatus({ success: false, msg: String(err) });
    }
  };

  const currentSync = activeEngine === 'MRTG' ? summary.lastMrtgSync : summary.lastPrtgSync;

  return (
    <div className="space-y-6">
      {/* Standard Page Header */}
      <PageHeader
        title="Network Discovery"
        description="Discover telemetry devices, interfaces, and sensor IDs directly from MRTG (Cacti) and PRTG servers."
        breadcrumb={
          <Link href="/" className="hover:text-slate-800 flex items-center gap-1 font-medium text-slate-500">
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
            <Button
              variant="primary"
              size="sm"
              onClick={handleSync}
              loading={syncing}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>Sync from Servers</span>
            </Button>
          </div>
        }
      />

      {/* Engine Selector & Controls Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Engine Tabs */}
        <div className="flex items-center gap-1 self-start">
          <Button
            variant={activeEngine === 'MRTG' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveEngine('MRTG');
              setSyncResult(null);
            }}
            className={
              activeEngine === 'MRTG'
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold gap-1.5'
                : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs gap-1.5'
            }
          >
            <Network className="w-3.5 h-3.5" />
            <span>MRTG / Cacti</span>
            {summary.mrtgCount > 0 && (
              <span className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded-full text-xs">
                {summary.mrtgCount}
              </span>
            )}
          </Button>

          <Button
            variant={activeEngine === 'PRTG' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => {
              setActiveEngine('PRTG');
              setSyncResult(null);
            }}
            className={
              activeEngine === 'PRTG'
                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white border-slate-900 h-8 px-3 text-xs font-semibold gap-1.5'
                : 'text-slate-600 hover:bg-slate-100 h-8 px-3 text-xs gap-1.5'
            }
          >
            <Activity className="w-3.5 h-3.5" />
            <span>PRTG Monitor</span>
            {summary.prtgCount > 0 && (
              <span className="bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded-full text-xs">
                {summary.prtgCount}
              </span>
            )}
          </Button>
        </div>

        {/* Right Info & Expand Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {currentSync && (
            <span className="text-xs text-slate-500 font-medium hidden sm:block mr-2">
              Synced: {formatRelative(currentSync)}
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="secondary" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Sync Result Banner */}
      {syncResult && (
        <div
          className={`flex items-start gap-3 p-4 rounded-lg border text-xs font-medium shadow-xs ${syncResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
            }`}
        >
          {syncResult.success ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <p className="font-semibold">{syncResult.msg}</p>
            {!syncResult.success && (
              <p className="text-xs text-red-700">
                Please verify server URLs and credentials in{' '}
                <Link href="/settings" className="font-semibold underline hover:text-red-950">
                  Settings
                </Link>
                .
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setSyncResult(null)}
            className="h-6 w-6 text-slate-500 hover:text-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Mapping Status Banner */}
      {mappingStatus && (
        <div
          className={`flex items-center gap-3 p-3.5 rounded-lg border text-xs font-medium shadow-xs ${mappingStatus.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
            }`}
        >
          {mappingStatus.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          )}
          <span className="flex-1">{mappingStatus.msg}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMappingStatus(null)}
            className="h-6 w-6 text-slate-500 hover:text-slate-800"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Search Input Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari perangkat, interface, SID, atau nama pelanggan..."
            className="pl-9 pr-9 h-9 text-[13px]"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearch('')}
              className="absolute right-1 top-0.5 h-8 w-8 text-slate-500 hover:text-slate-800"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="text-xs text-slate-500 shrink-0 font-medium">
          {totalGroups} groups • {totalDevices} devices • {totalInterfaces} interfaces
        </div>
      </div>

      {/* Structured Tree View Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-xs text-slate-500">
            <Spinner size="md" className="mx-auto text-orange-600 mb-2" />
            <p>Loading discovery data...</p>
          </div>
        ) : tree.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Radio}
              title="No Discovery Data Yet"
              description="Click 'Sync from Servers' to fetch devices and interfaces from the monitoring servers."
              actionLabel="Sync from Servers"
              onAction={handleSync}
            />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tree.map((group) => {
              const groupKey = group.groupName;
              const isGroupOpen = expandedGroups.has(groupKey);
              const groupInterfaces = group.devices.reduce((s, d) => s + d.interfaces.length, 0);

              return (
                <div key={groupKey}>
                  {/* Group Header Button */}
                  <Button
                    variant="ghost"
                    onClick={() => toggleGroup(groupKey)}
                    className="w-full justify-between h-auto px-5 py-3 hover:bg-slate-50 text-left rounded-none font-sans"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">
                        {isGroupOpen ? (
                          <FolderOpen className="w-4 h-4 text-orange-600" />
                        ) : (
                          <Folder className="w-4 h-4 text-slate-500" />
                        )}
                      </span>
                      <span className="text-xs font-semibold text-slate-900">{groupKey}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span className="text-xs tabular-nums">
                        {group.devices.length} devices • {groupInterfaces} interfaces
                      </span>
                      {isGroupOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </Button>

                  {/* Device Rows */}
                  {isGroupOpen &&
                    group.devices.map((device) => {
                      const deviceKey = `${groupKey}::${device.deviceName}`;
                      const isDeviceOpen = expandedDevices.has(deviceKey);

                      return (
                        <div key={deviceKey} className="border-t border-slate-100 bg-slate-50/40">
                          <Button
                            variant="ghost"
                            onClick={() => toggleDevice(deviceKey)}
                            className="w-full justify-between h-auto pl-10 pr-5 py-2.5 hover:bg-slate-100/70 text-left rounded-none font-sans"
                          >
                            <div className="flex items-center gap-2.5">
                              <Server className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="text-xs font-medium text-slate-800">{device.deviceName}</span>
                              {device.deviceIp && (
                                <span className="text-xs text-slate-500 font-mono hidden sm:inline tabular-nums">
                                  ({device.deviceIp})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-slate-500">
                              <span className="text-xs tabular-nums font-medium">
                                {device.interfaces.length} interfaces
                              </span>
                              {isDeviceOpen ? (
                                <ChevronDown className="w-3 h-3 text-slate-500" />
                              ) : (
                                <ChevronRight className="w-3 h-3 text-slate-500" />
                              )}
                            </div>
                          </Button>

                          {/* Interface Rows */}
                          {isDeviceOpen &&
                            device.interfaces.map((iface) => (
                              <div
                                key={iface.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pl-14 pr-4 py-2.5 border-t border-slate-100 bg-white hover:bg-orange-50/30 transition-colors"
                              >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Network className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span
                                    className="text-xs text-slate-800 font-mono font-medium truncate max-w-[280px]"
                                    title={iface.fullTitle}
                                  >
                                    {iface.interfaceName}
                                  </span>
                                  <Badge
                                    variant={
                                      iface.status.toLowerCase().includes('up')
                                        ? 'success'
                                        : iface.status.toLowerCase().includes('down')
                                          ? 'destructive'
                                          : 'neutral'
                                    }
                                    dot={true}
                                  >
                                    {iface.status}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                                    ID: {iface.targetId}
                                  </span>

                                  {iface.detectedSid && (
                                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 tabular-nums">
                                      SID: {iface.detectedSid}
                                    </span>
                                  )}

                                  <div className="flex items-center gap-1 ml-1">
                                    <CopyButton value={iface.targetId} label={`${activeEngine} ID`} />
                                    <Link
                                      href={`/?graphId=${iface.targetId}&engine=${activeEngine}`}
                                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-white hover:bg-orange-50 text-slate-700 hover:text-orange-700 border border-slate-200 hover:border-orange-200 rounded-md transition-colors"
                                      title="Use this ID in Report Generator"
                                    >
                                      <span>Generator</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => openMapping(iface, activeEngine)}
                                      className="h-6 px-2 text-xs gap-1"
                                      title="Map to Customer Record"
                                    >
                                      <Link2 className="w-3 h-3" />
                                      <span>Map</span>
                                    </Button>
                                  </div>
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
            <DialogTitle>Map to Customer Service (SID)</DialogTitle>
          </DialogHeader>

          {mapping && (
            <div className="space-y-4 text-xs font-sans py-2">
              <p className="text-slate-500">
                Associate {mapping.engine} monitoring ID ({mapping.targetId}) with a customer service record in directory.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-500">Interface:</span>
                  <span className="font-semibold text-slate-900 truncate">{mapping.fullTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="soft" className="text-xs">
                    {mapping.engine} ID: {mapping.targetId}
                  </Badge>
                  {mapping.detectedSid && (
                    <Badge variant="success" className="text-xs">
                      Detected SID: {mapping.detectedSid}
                    </Badge>
                  )}
                </div>
              </div>

              {mapping.searching ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-center animate-pulse">
                  Searching customer directory for Service ID...
                </div>
              ) : mapping.matched ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Customer Service Matched
                  </div>
                  <div className="text-emerald-700">
                    <strong>{mapping.matched.customerName}</strong>
                    <div className="text-xs text-emerald-600 mt-0.5">
                      SID: <span className="font-semibold">{mapping.matched.serviceId}</span> | CID: {mapping.matched.customerId}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  <span>No customer with this Service ID found in directory. Enter a valid Service ID (SID) to map.</span>
                </div>
              )}

              <FormField label="Service ID (SID)" required>
                <Input
                  value={mapping.serviceId}
                  onChange={async (e) => {
                    const sid = e.target.value;
                    setMapping((prev) => (prev ? { ...prev, serviceId: sid, matched: null } : null));
                    if (sid.trim().length >= 3) {
                      try {
                        const cusRes = await fetch(`/api/customers?serviceId=${encodeURIComponent(sid.trim())}`);
                        const cusData = await cusRes.json();
                        const found = cusData.customers?.find((c: { serviceId: string }) => c.serviceId.toLowerCase() === sid.trim().toLowerCase());
                        if (found) {
                          setMapping((prev) => (prev ? { ...prev, matched: found } : null));
                        }
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  className="text-xs"
                />
              </FormField>

              <DialogFooter className="pt-3 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setMapping(null)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={confirmMapping}
                  disabled={!mapping.serviceId.trim()}
                >
                  <Link2 className="w-4 h-4 mr-1.5" />
                  <span>Save Mapping</span>
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
