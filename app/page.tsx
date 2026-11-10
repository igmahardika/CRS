'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  ShieldCheck,
  Search,
  RefreshCw,
  Upload,
  Download,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle,
  AlertCircle,
  Server,
  Layers,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  History,
  FileCheck,
  Inbox,
} from 'lucide-react';
import Link from 'next/link';
import LivePreview from '@/components/LivePreview';
import TicketCaseManager from '@/components/TicketCaseManager';
import CustomerModal, { CustomerData } from '@/components/CustomerModal';
import { ReportData } from '@/lib/pdf-template';
import { TicketItem, CaseItem, calculateSla } from '@/lib/sla-calculator';
import { generateDocumentNumber } from '@/lib/doc-number';
import { toast } from 'sonner';
import {
  ConfirmDialog,
  PageHeader,
  Button,
  Input,
  FormField,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui';
import { getSlaByServiceName } from '@/lib/service-sla';
import { extractNodeFromServiceId } from '@/lib/service-utils';

function GeneratorPageContent() {
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get('customerId');
  const serviceIdParam = searchParams.get('serviceId');
  const customerNameParam = searchParams.get('customerName');
  const typeParam = searchParams.get('type');
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const requestIdParam = searchParams.get('requestId');
  const ticketParam = searchParams.get('ticket');

  const [activeRequestId, setActiveRequestId] = useState<string | null>(requestIdParam);
  const [activeRequestTicket, setActiveRequestTicket] = useState<string | null>(ticketParam);

  // Report mode: MRTG or SLA
  const [reportType, setReportType] = useState<'MRTG' | 'SLA'>('SLA');

  // Customer metadata
  const [customerName, setCustomerName] = useState('RSJ. Dr. Soeharto Heerdjan');
  const [customerId, setCustomerId] = useState('01.2180.1124');
  const [serviceId, setServiceId] = useState('01.2180.1');
  const [serviceName, setServiceName] = useState('Prime 300 Mbps');
  const [nodeCount, setNodeCount] = useState<number>(1);
  const [targetSla, setTargetSla] = useState<number>(99.5);

  // Period & Document Number
  const [month, setMonth] = useState<number>(10); // October default
  const [year, setYear] = useState<number>(2026);
  const [seqNumber, setSeqNumber] = useState<number>(1);
  const [documentNumber, setDocumentNumber] = useState<string>('01/IMUN.01/SLA/10/2026');
  const [isManualDocNumber, setIsManualDocNumber] = useState(false);
  const [isLoadingDocNumber, setIsLoadingDocNumber] = useState(false);

  // MRTG / PRTG Engine Selection (MRTG default)
  const [graphEngine, setGraphEngine] = useState<'MRTG' | 'PRTG'>('MRTG');
  const [cactiGraphId, setCactiGraphId] = useState<string>('2180');
  const [prtgSensorId, setPrtgSensorId] = useState<string>('');
  const [graphId, setGraphId] = useState<string>('2180');
  const [graphImage, setGraphImage] = useState<string>('');
  const [trafficDirection, setTrafficDirection] = useState<'NORMAL' | 'REVERSED'>('REVERSED');
  const [dlAvg, setDlAvg] = useState<number>(14.23);
  const [dlMax, setDlMax] = useState<number>(57.83);
  const [ulAvg, setUlAvg] = useState<number>(69.38);
  const [ulMax, setUlMax] = useState<number>(267.75);
  const [dlUnit, setDlUnit] = useState<string>('Mbps');
  const [ulUnit, setUlUnit] = useState<string>('Mbps');
  const [isGraphIdSynced, setIsGraphIdSynced] = useState(false);

  // Tickets & Cases
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);

  // UI state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isFetchingCacti, setIsFetchingCacti] = useState(false);
  const [isFetchingPrtg, setIsFetchingPrtg] = useState(false);
  const [cactiStatusMessage, setCactiStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [savedDocInfo, setSavedDocInfo] = useState<{ docNum: string; id: string; status?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [directApprove, setDirectApprove] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const reportPeriod = `${monthNames[month - 1]} ${year}`;

  // 1. Fetch next document number automatically based on month, year, and reportType
  const fetchNextDocNumber = useCallback(async (m: number, y: number, type: 'MRTG' | 'SLA') => {
    setIsLoadingDocNumber(true);
    try {
      const res = await fetch(`/api/reports/next-number?month=${m}&year=${y}&type=${type}`);
      const data = await res.json();
      if (data.documentNumber) {
        setSeqNumber(data.seq);
        setDocumentNumber(data.documentNumber);
        setIsManualDocNumber(false);
      }
    } catch (err) {
      console.error('Error fetching next document number:', err);
    } finally {
      setIsLoadingDocNumber(false);
    }
  }, []);

  // Trigger next document number calculation when month, year, or type changes
  useEffect(() => {
    if (!isManualDocNumber) {
      fetchNextDocNumber(month, year, reportType);
    }
  }, [month, year, reportType, isManualDocNumber, fetchNextDocNumber]);

  // 2. Load parameters from URL search param if present (e.g. from Request Queue or Customer list)
  useEffect(() => {
    if (customerNameParam) setCustomerName(customerNameParam);
    if (serviceIdParam) setServiceId(serviceIdParam);
    if (customerIdParam) setCustomerId(customerIdParam);
    if (typeParam === 'SLA' || typeParam === 'MRTG') setReportType(typeParam);
    if (monthParam) {
      const m = parseInt(monthParam, 10);
      if (m >= 1 && m <= 12) setMonth(m);
    }
    if (yearParam) {
      const y = parseInt(yearParam, 10);
      if (y >= 2020 && y <= 2035) setYear(y);
    }
    if (requestIdParam) setActiveRequestId(requestIdParam);
    if (ticketParam) setActiveRequestTicket(ticketParam);

    if (serviceIdParam || customerIdParam) {
      fetch('/api/customers')
        .then((res) => res.json())
        .then((data) => {
          if (data.customers) {
            const found = serviceIdParam
              ? data.customers.find((c: CustomerData) => c.serviceId === serviceIdParam)
              : data.customers.find((c: CustomerData) => c.customerId === customerIdParam);
            if (found) {
              handleSelectCustomer(found);
            }
          }
        })
        .catch(console.error);
    }
  }, [serviceIdParam, customerIdParam, customerNameParam, typeParam, monthParam, yearParam, requestIdParam, ticketParam]);

  // Handle selecting customer from Master Modal
  const handleSelectCustomer = (customer: CustomerData) => {
    setCustomerName(customer.customerName);
    setCustomerId(customer.customerId);
    setServiceId(customer.serviceId);
    setServiceName(customer.serviceName || 'Prime 300 Mbps');
    setNodeCount(customer.nodeCount || extractNodeFromServiceId(customer.serviceId));

    const resolvedSla = customer.targetSla !== undefined ? customer.targetSla : getSlaByServiceName(customer.serviceName).targetSla;
    setTargetSla(resolvedSla);

    // Jika layanan tanpa SLA (0%), otomatis arahkan ke MRTG Report
    if (resolvedSla === 0) {
      setReportType('MRTG');
    }

    const cId = customer.cactiGraphId || (customer.graphType === 'MRTG' ? customer.graphId : '') || '';
    const pId = customer.prtgSensorId || (customer.graphType === 'PRTG' ? customer.graphId : '') || '';

    setCactiGraphId(cId);
    setPrtgSensorId(pId);

    // Determine engine preference: if customer explicitly prefers PRTG or only has PRTG
    const preferredEngine: 'MRTG' | 'PRTG' =
      customer.graphType === 'PRTG' || (!cId && Boolean(pId)) ? 'PRTG' : 'MRTG';

    setGraphEngine(preferredEngine);
    setGraphId(preferredEngine === 'PRTG' ? pId : cId);

    if (customer.trafficDirection === 'NORMAL' || customer.trafficDirection === 'REVERSED') {
      setTrafficDirection(customer.trafficDirection);
    }
  };

  // Switch between MRTG and PRTG engine tabs smoothly
  const switchEngine = (newEngine: 'MRTG' | 'PRTG') => {
    setGraphEngine(newEngine);
    if (newEngine === 'MRTG') {
      setGraphId(cactiGraphId);
    } else {
      setGraphId(prtgSensorId);
    }
  };

  // 3. Auto-save Graph ID to Customer Master
  const autoSaveGraphIdToMaster = async (cid: string, gid: string, dir?: string, engine?: 'MRTG' | 'PRTG') => {
    if (!cid) return;
    const currentEngine = engine || graphEngine;
    const newCactiId = currentEngine === 'MRTG' ? gid : cactiGraphId;
    const newPrtgId = currentEngine === 'PRTG' ? gid : prtgSensorId;

    try {
      const res = await fetch('/api/customers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: cid,
          serviceId: serviceId,
          cactiGraphId: newCactiId,
          prtgSensorId: newPrtgId,
          graphId: currentEngine === 'MRTG' ? newCactiId : newPrtgId,
          graphType: currentEngine,
          trafficDirection: dir || trafficDirection,
        }),
      });
      if (res.ok) {
        setIsGraphIdSynced(true);
        setTimeout(() => setIsGraphIdSynced(false), 3500);
      }
    } catch (err) {
      console.error('Error auto-syncing Graph ID:', err);
    }
  };

  // 4. Fetch from MRTG / Cacti API
  const handleFetchCacti = async () => {
    if (!graphId) {
      toast.error('Please enter a Cacti Graph ID first.');
      return;
    }

    setIsFetchingCacti(true);
    setCactiStatusMessage(null);

    try {
      const res = await fetch('/api/cacti/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphId, month, year }),
      });
      const data = await res.json();

      if (data.imageBase64) {
        setGraphImage(data.imageBase64);
      }

      if (data.metrics) {
        if (trafficDirection === 'NORMAL') {
          setDlAvg(data.metrics.inAvg);
          setDlMax(data.metrics.inMax);
          setUlAvg(data.metrics.outAvg);
          setUlMax(data.metrics.outMax);
        } else {
          setDlAvg(data.metrics.outAvg);
          setDlMax(data.metrics.outMax);
          setUlAvg(data.metrics.inAvg);
          setUlMax(data.metrics.inMax);
        }
      }

      // Auto-save Graph ID to master
      setCactiGraphId(graphId);
      await autoSaveGraphIdToMaster(customerId, graphId, trafficDirection, 'MRTG');

      if (data.isFallback) {
        setCactiStatusMessage({
          type: 'warning',
          text: `MRTG/Cacti server unreachable. Using local template graph & estimated metrics for ${monthNames[month - 1]} ${year}.`,
        });
      } else {
        setCactiStatusMessage({
          type: 'success',
          text: `Fetched MRTG graph (Graph ID: ${graphId}) for ${monthNames[month - 1]} ${year} (UTC+7) & auto-populated traffic metrics!`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCactiStatusMessage({
        type: 'error',
        text: `Failed to connect to MRTG/Cacti server: ${msg}`,
      });
    } finally {
      setIsFetchingCacti(false);
    }
  };

  // 4b. Fetch from PRTG Network Monitor API
  const handleFetchPrtg = async () => {
    if (!graphId) {
      toast.error('Please enter a PRTG Sensor ID first.');
      return;
    }

    setIsFetchingPrtg(true);
    setCactiStatusMessage(null);

    try {
      const res = await fetch('/api/prtg/graph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensorId: graphId, month, year }),
      });
      const data = await res.json();

      if (data.imageBase64) {
        setGraphImage(data.imageBase64);
      }

      if (data.metrics) {
        if (trafficDirection === 'NORMAL') {
          setDlAvg(data.metrics.inAvg);
          setDlMax(data.metrics.inMax);
          setUlAvg(data.metrics.outAvg);
          setUlMax(data.metrics.outMax);
        } else {
          setDlAvg(data.metrics.outAvg);
          setDlMax(data.metrics.outMax);
          setUlAvg(data.metrics.inAvg);
          setUlMax(data.metrics.inMax);
        }
        if (data.metrics.inUnit) {
          setDlUnit(trafficDirection === 'NORMAL' ? data.metrics.inUnit : data.metrics.outUnit);
          setUlUnit(trafficDirection === 'NORMAL' ? data.metrics.outUnit : data.metrics.inUnit);
        } else if (data.metrics.unit) {
          setDlUnit(data.metrics.unit);
          setUlUnit(data.metrics.unit);
        }
      }

      // Auto-save Graph ID to master
      setPrtgSensorId(graphId);
      await autoSaveGraphIdToMaster(customerId, graphId, trafficDirection, 'PRTG');

      if (data.isFallback) {
        setCactiStatusMessage({
          type: 'warning',
          text: `PRTG server unreachable: ${data.fallbackReason || 'Using local graph template & estimated metrics for ' + monthNames[month - 1] + ' ' + year + '.'}`,
        });
      } else {
        setCactiStatusMessage({
          type: 'success',
          text: `Fetched PRTG graph (Sensor ID: ${graphId}) for ${monthNames[month - 1]} ${year} & auto-populated traffic metrics!`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setCactiStatusMessage({
        type: 'error',
        text: `Failed to connect to PRTG Network Monitor: ${msg}`,
      });
    } finally {
      setIsFetchingPrtg(false);
    }
  };

  // Handle manual image upload
  const handleManualImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setGraphImage(event.target.result as string);
          setCactiStatusMessage({
            type: 'success',
            text: `Graph image "${file.name}" uploaded successfully.`,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Current report data object for Live Preview and PDF Export
  const currentReportData: ReportData = {
    reportType,
    graphType: graphEngine,
    documentNumber,
    customerName,
    customerId,
    serviceId,
    serviceName,
    nodeCount,
    targetSla,
    reportPeriod,
    graphId,
    cactiGraphId: cactiGraphId || undefined,
    prtgSensorId: prtgSensorId || undefined,
    graphImage: graphImage || undefined,
    dlAvg,
    dlMax,
    ulAvg,
    ulMax,
    dlUnit,
    ulUnit,
    trafficDirection,
    tickets,
    cases,
  };

  const isSupervisorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR';

  // 5. Generate Report Handler (Saves to History & Dispatches Approval Workflow)
  const handleGenerateReport = async () => {
    setIsSavingReport(true);
    setSavedDocInfo(null);
    try {
      const slaCalc = calculateSla(cases, tickets, year, month);

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentReportData,
          periodMonth: month,
          periodYear: year,
          onlinePercent: slaCalc.onlinePercent,
          downtimePercent: slaCalc.downtimePercent,
          availabilityPercent: slaCalc.availabilityPercent,
          totalDowntimeMinutes: slaCalc.totalDowntimeMinutes,
          downtimeDurationStr: slaCalc.downtimeDurationStr,
          directApprove: isSupervisorOrAdmin && directApprove,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      const reportStatus = data.report?.status || (isSupervisorOrAdmin && directApprove ? 'APPROVED' : 'PENDING_APPROVAL');

      setSavedDocInfo({
        docNum: currentReportData.documentNumber,
        id: data.report?.id || '',
        status: reportStatus,
      });

      // Also ensure Graph ID is synced
      autoSaveGraphIdToMaster(customerId, graphId, trafficDirection, graphEngine);

      // Auto update next doc number after save
      fetchNextDocNumber(month, year, reportType);

      // If generated from an active request ticket, mark request as completed
      if (activeRequestId && data.report?.id) {
        fetch('/api/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeRequestId,
            status: 'COMPLETED',
            processedReportId: data.report.id,
          }),
        }).catch((e) => console.error('[Update Request Status Error]', e));
      }

      if (reportStatus === 'APPROVED') {
        toast.success('Laporan berhasil di-generate dan langsung disetujui (Approved)!');
      } else {
        toast.success('Laporan berhasil di-generate dan masuk antrean persetujuan Supervisor.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal membuat laporan: ${msg}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  // Keyboard shortcut listener
  const handleGenerateReportRef = useRef(handleGenerateReport);
  handleGenerateReportRef.current = handleGenerateReport;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Enter or Cmd + Enter: Trigger Report Generation
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerateReportRef.current();
      }

      // Ctrl + Shift + K: Open Customer Modal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        setIsCustomerModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dlDirectionLabel = trafficDirection === 'NORMAL' ? 'Inbound' : 'Outbound';
  const ulDirectionLabel = trafficDirection === 'NORMAL' ? 'Outbound' : 'Inbound';

  return (
    <div className="space-y-6">
      {/* Page Header with Mode Switcher */}
      <PageHeader
        title="Report Generator"
        description="Generate compliance-ready A4 MRTG and SLA reports with automated telemetry."
        actions={
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              type="button"
              variant={reportType === 'MRTG' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setReportType('MRTG');
                fetchNextDocNumber(month, year, 'MRTG');
              }}
              className={reportType === 'MRTG' ? 'text-[#C2410C] font-semibold shadow-xs' : 'text-slate-600'}
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-[#EA580C]" />
              <span>MRTG (2 Pages)</span>
            </Button>
            <Button
              type="button"
              variant={reportType === 'SLA' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setReportType('SLA');
                fetchNextDocNumber(month, year, 'SLA');
              }}
              className={reportType === 'SLA' ? 'text-[#C2410C] font-semibold shadow-xs' : 'text-slate-600'}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-[#EA580C]" />
              <span>SLA (3 Pages)</span>
            </Button>
          </div>
        }
      />

      {/* Active Request Ticket Banner */}
      {activeRequestTicket && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">Sedang Memproses Tiket Permintaan: </span>
              <code className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold text-[11px] border border-amber-200">
                {activeRequestTicket}
              </code>
              <span className="ml-2 text-amber-700 font-medium">({customerName})</span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setActiveRequestTicket(null);
              setActiveRequestId(null);
            }}
            className="h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100/50"
            title="Tutup banner permintaan"
          >
            ✕
          </Button>
        </div>
      )}

      {/* Main 2-Column Split: Left = Input Form, Right = Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* ================= LEFT COLUMN: DYNAMIC FORM ================= */}
        <div className="xl:col-span-6 2xl:col-span-5 space-y-5">
          {/* 1. Customer & Document Metadata Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-[#C2410C] text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <span>Customer & Report Period</span>
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                title="Open Customer Directory (Ctrl+Shift+K)"
              >
                <Search className="w-3.5 h-3.5 mr-1 text-slate-500" />
                <span>Select Customer</span>
                <kbd className="hidden sm:inline-block ml-1.5 text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded border border-slate-200">
                  Ctrl+Shift+K
                </kbd>
              </Button>
            </div>

            <div className="space-y-3.5">
              <FormField label="Customer Name" required>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. RSJ. Dr. Soeharto Heerdjan"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Customer ID" required>
                  <Input
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className=""
                    placeholder="e.g. 01.2180.1124"
                  />
                </FormField>
                <FormField label="Service ID" required>
                  <Input
                    value={serviceId}
                    onChange={(e) => {
                      const newSid = e.target.value;
                      setServiceId(newSid);
                      setNodeCount(extractNodeFromServiceId(newSid));
                    }}
                    className=""
                    placeholder="e.g. 01.2180.1"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700">Service Plan / Bandwidth</label>
                    {serviceName && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          targetSla > 0
                            ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                            : 'border-slate-200 text-slate-500 bg-slate-50'
                        }`}
                      >
                        {targetSla > 0 ? `Target SLA: ${targetSla}%` : 'No SLA'}
                      </Badge>
                    )}
                  </div>
                  <Input
                    value={serviceName}
                    onChange={(e) => {
                      const newServiceName = e.target.value;
                      setServiceName(newServiceName);
                      const match = getSlaByServiceName(newServiceName);
                      setTargetSla(match.targetSla);
                    }}
                    placeholder="e.g. Prime 300 Mbps or Impressive 100Mbps"
                  />
                </div>
                <div className="sm:col-span-1">
                  <FormField label="Node Count">
                    <Input
                      type="number"
                      min="1"
                      value={nodeCount}
                      onChange={(e) => setNodeCount(parseInt(e.target.value, 10) || 1)}
                      className="text-center font-medium"
                    />
                  </FormField>
                </div>
              </div>

              {/* Period & Document Number Row */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-4">
                  <FormField label="Report Month">
                    <Select
                      value={String(month)}
                      onValueChange={(val) => {
                        const newM = parseInt(val, 10);
                        setMonth(newM);
                        fetchNextDocNumber(newM, year, reportType);
                      }}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue placeholder="Select Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((m, idx) => (
                          <SelectItem key={idx} value={String(idx + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
                <div className="sm:col-span-3">
                  <FormField label="Report Year">
                    <Input
                      type="number"
                      value={year}
                      onChange={(e) => {
                        const newY = parseInt(e.target.value, 10) || 2026;
                        setYear(newY);
                        fetchNextDocNumber(month, newY, reportType);
                      }}
                      className="text-center"
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-700">Document Number</label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fetchNextDocNumber(month, year, reportType)}
                      className="h-auto p-0 text-[11px] text-[#C2410C] hover:text-[#EA580C] hover:bg-transparent font-medium flex items-center gap-1 transition"
                      title="Auto-generate sequence number"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoadingDocNumber ? 'animate-spin' : ''}`} />
                      <span>Auto</span>
                    </Button>
                  </div>
                  <Input
                    value={documentNumber}
                    onChange={(e) => {
                      setDocumentNumber(e.target.value);
                      setIsManualDocNumber(true);
                    }}
                    className="text-xs"
                    placeholder="01/IMUN.01/SLA/10/2026"
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  Format:{' '}
                  <code className="">{`{01}/IMUN.01/{${reportType}}/{${String(month).padStart(2, '0')}}/{${year}}`}</code>
                </span>
                {isManualDocNumber && (
                  <span className="text-amber-600 font-medium">(Manually Edited)</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. MRTG / PRTG Integration Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-[#FFF7ED] text-[#C2410C] text-[11px] font-bold flex items-center justify-center">
                  2
                </span>
                <span>Traffic Graph Integration</span>
              </h3>
              {isGraphIdSynced && (
                <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px] gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>ID Synced</span>
                </Badge>
              )}
            </div>

            {/* Engine Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg gap-1 text-xs">
              <Button
                type="button"
                variant={graphEngine === 'MRTG' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => switchEngine('MRTG')}
                className={`h-auto py-2 px-3 text-xs justify-between font-medium ${
                  graphEngine === 'MRTG'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold hover:bg-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Server className="w-3.5 h-3.5 text-slate-500" />
                  <span>MRTG (Cacti)</span>
                </div>
                {cactiGraphId ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    ID: {cactiGraphId}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Default</span>
                )}
              </Button>
              <Button
                type="button"
                variant={graphEngine === 'PRTG' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => switchEngine('PRTG')}
                className={`h-auto py-2 px-3 text-xs justify-between font-medium ${
                  graphEngine === 'PRTG'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200 font-semibold hover:bg-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>PRTG Monitor</span>
                </div>
                {prtgSensorId ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    ID: {prtgSensorId}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">None</span>
                )}
              </Button>
            </div>

            <div className="space-y-3.5">
              <div>
                <FormField
                  label={graphEngine === 'PRTG' ? 'PRTG Sensor ID / Object ID' : 'Cacti Graph ID (Local Graph ID)'}
                >
                  <div className="flex gap-2">
                    <Input
                      value={graphId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGraphId(val);
                        if (graphEngine === 'MRTG') {
                          setCactiGraphId(val);
                        } else {
                          setPrtgSensorId(val);
                        }
                      }}
                      placeholder={graphEngine === 'PRTG' ? 'e.g. 10542' : 'e.g. 2180'}
                      className="flex-1 font-medium"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={graphEngine === 'PRTG' ? handleFetchPrtg : handleFetchCacti}
                      disabled={
                        graphEngine === 'PRTG'
                          ? isFetchingPrtg || !graphId
                          : isFetchingCacti || !graphId
                      }
                      className="shrink-0"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 mr-1.5 ${
                          (graphEngine === 'PRTG' ? isFetchingPrtg : isFetchingCacti) ? 'animate-spin' : ''
                        }`}
                      />
                      <span>
                        {graphEngine === 'PRTG'
                          ? isFetchingPrtg
                            ? 'Fetching...'
                            : 'Fetch Graph'
                          : isFetchingCacti
                          ? 'Fetching...'
                          : 'Fetch Graph'}
                      </span>
                    </Button>
                  </div>
                </FormField>
                <p className="text-[11px] text-slate-400 mt-1">
                  {graphEngine === 'PRTG'
                    ? `PRTG graph fetched via Historic Data & Chart API: ${monthNames[month - 1]} ${year}.`
                    : `Graph query cycle: ${monthNames[month - 1]} ${year} (01/${String(month).padStart(2, '0')} 00:00 - End of Month 23:59 WIB).`}
                </p>
              </div>

              {/* Status Message */}
              {cactiStatusMessage && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-start gap-2.5 ${
                    cactiStatusMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : cactiStatusMessage.type === 'warning'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {cactiStatusMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{cactiStatusMessage.text}</span>
                </div>
              )}

              {/* Manual Upload Fallback */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-700 shrink-0">Upload Graph Image (Fallback)</span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleManualImageUpload}
                  inputSize="sm"
                  className="w-auto h-8 text-xs text-slate-500 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                />
              </div>

              {/* Traffic Direction */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-700">Traffic Direction ({graphEngine})</label>
                  <span className="text-[11px] text-slate-500">Switch port or sensor mapping</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={trafficDirection === 'NORMAL' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setTrafficDirection('NORMAL');
                      autoSaveGraphIdToMaster(customerId, graphId, 'NORMAL', graphEngine);
                    }}
                    className={`h-auto p-2.5 rounded-lg flex-col items-center justify-center border transition ${
                      trafficDirection === 'NORMAL'
                        ? 'bg-[#FFF7ED] text-[#C2410C] border-[#EA580C] font-semibold hover:bg-[#FFF7ED]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-xs">Normal</div>
                    <div className="text-[10px] text-slate-500 font-normal">In: DL | Out: UL</div>
                  </Button>
                  <Button
                    type="button"
                    variant={trafficDirection === 'REVERSED' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setTrafficDirection('REVERSED');
                      autoSaveGraphIdToMaster(customerId, graphId, 'REVERSED', graphEngine);
                    }}
                    className={`h-auto p-2.5 rounded-lg flex-col items-center justify-center border transition ${
                      trafficDirection === 'REVERSED'
                        ? 'bg-[#FFF7ED] text-[#C2410C] border-[#EA580C] font-semibold hover:bg-[#FFF7ED]'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="font-medium text-xs">Reversed</div>
                    <div className="text-[10px] text-slate-500 font-normal">Out: DL | In: UL</div>
                  </Button>
                </div>
              </div>

              {/* Traffic Metrics */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Traffic Metrics (Average & Maximum)</span>
                  <span className="text-[11px] text-slate-400">Auto-populated or manual</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-800 block">
                      Download ({dlDirectionLabel})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label={`Average (${dlUnit})`}>
                        <Input
                          type="number"
                          step="0.01"
                          value={dlAvg}
                          onChange={(e) => setDlAvg(parseFloat(e.target.value) || 0)}
                          className="text-center text-xs"
                        />
                      </FormField>
                      <FormField label={`Maximum (${dlUnit})`}>
                        <Input
                          type="number"
                          step="0.01"
                          value={dlMax}
                          onChange={(e) => setDlMax(parseFloat(e.target.value) || 0)}
                          className="text-center text-xs"
                        />
                      </FormField>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-xs font-semibold text-slate-800 block">
                      Upload ({ulDirectionLabel})
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label={`Average (${ulUnit})`}>
                        <Input
                          type="number"
                          step="0.01"
                          value={ulAvg}
                          onChange={(e) => setUlAvg(parseFloat(e.target.value) || 0)}
                          className="text-center text-xs"
                        />
                      </FormField>
                      <FormField label={`Maximum (${ulUnit})`}>
                        <Input
                          type="number"
                          step="0.01"
                          value={ulMax}
                          onChange={(e) => setUlMax(parseFloat(e.target.value) || 0)}
                          className="text-center text-xs"
                        />
                      </FormField>
                    </div>
                  </div>
                </div>

                {/* Conclusion Sentence Preview */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1 text-slate-700">
                  <div className="font-semibold text-slate-800">Summary Sentence Preview:</div>
                  <p className="leading-relaxed">
                    <span>{`○ Download Traffic (${dlDirectionLabel}): Average usage is `}</span>
                    <strong className="text-slate-900 ">{`${dlAvg} ${dlUnit}`}</strong>
                    <span>{`, maximum usage reaching `}</span>
                    <strong className="text-slate-900 ">{`${dlMax} ${dlUnit}`}</strong>
                    <span>.</span>
                  </p>
                  <p className="leading-relaxed">
                    <span>{`○ Upload Traffic (${ulDirectionLabel}): Average usage is `}</span>
                    <strong className="text-slate-900 ">{`${ulAvg} ${ulUnit}`}</strong>
                    <span>{`, maximum usage reaching `}</span>
                    <strong className="text-slate-900 ">{`${ulMax} ${ulUnit}`}</strong>
                    <span>.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. SLA Dynamic Tickets & Cases */}
          {reportType === 'SLA' && (
            <TicketCaseManager
              tickets={tickets}
              setTickets={setTickets}
              cases={cases}
              setCases={setCases}
              year={year}
              month={month}
              targetSla={targetSla}
            />
          )}

          {/* Actions Bar */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-wrap gap-2.5 items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowResetConfirm(true)}
              className="text-slate-600 hover:text-slate-900"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              <span>Reset</span>
            </Button>

            <div className="flex items-center space-x-3">
              {isSupervisorOrAdmin && (
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-700 cursor-pointer select-none bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={directApprove}
                    onChange={(e) => setDirectApprove(e.target.checked)}
                    className="w-3.5 h-3.5 text-[#EA580C] rounded border-slate-300 focus:ring-[#EA580C]"
                  />
                  <span>Langsung Setujui (Auto-Approve)</span>
                </label>
              )}

              <Button
                type="button"
                variant="primary"
                onClick={handleGenerateReport}
                disabled={isSavingReport}
                title="Generate Report (Ctrl+Enter)"
                className="bg-[#EA580C] hover:bg-[#C2410C] text-white px-5 py-2 font-semibold shadow-xs"
              >
                {isSavingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    <span>Generating Report...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 mr-2" />
                    <span>Generate Report</span>
                    <kbd className="hidden sm:inline-block ml-2 text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded font-medium">
                      Ctrl+↵
                    </kbd>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Success Save Banner */}
          {savedDocInfo && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {savedDocInfo.status === 'APPROVED'
                      ? 'Laporan berhasil di-generate dan langsung disetujui (Approved)!'
                      : 'Laporan berhasil di-generate dan masuk antrean persetujuan Supervisor!'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSavedDocInfo(null)}
                  className="h-6 w-6 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/50"
                  title="Tutup pemberitahuan"
                >
                  ✕
                </Button>
              </div>
              <p className="text-[11px] text-emerald-700">
                Dokumen <strong>{savedDocInfo.docNum}</strong> tersimpan di riwayat arsip.
                {savedDocInfo.status === 'APPROVED'
                  ? ' Dokumen resmi telah disetujui dan siap didistribusikan.'
                  : ' Dokumen membutuhkan verifikasi Supervisor sebelum PDF resmi dapat didistribusikan.'}
              </p>
              <div className="pt-1 flex items-center space-x-3 text-[11px]">
                <Link
                  href="/history"
                  className="font-semibold text-emerald-800 underline hover:text-emerald-950 flex items-center gap-1"
                >
                  <span>Buka Riwayat & Approval Laporan</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                {savedDocInfo.status === 'APPROVED' && (
                  <a
                    href={`/api/reports/download?id=${savedDocInfo.id}`}
                    className="font-semibold text-[#C2410C] underline hover:text-[#EA580C] flex items-center gap-1"
                  >
                    <span>Download PDF</span>
                    <Download className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: LIVE PREVIEW ================= */}
        <div className="xl:col-span-6 2xl:col-span-7 sticky top-20 h-[calc(100vh-6rem)]">
          <LivePreview
            data={currentReportData}
            isGeneratingPdf={isSavingReport}
          />
        </div>
      </div>

      {/* Customer Master Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSelectCustomer={handleSelectCustomer}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="Reset Form"
        description="Are you sure you want to reset all form fields and data back to defaults? Any unsaved changes will be lost."
        confirmText="Reset Form"
        variant="destructive"
        onConfirm={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-400">Loading Report Generator...</div>}>
      <GeneratorPageContent />
    </Suspense>
  );
}
