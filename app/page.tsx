'use client';

import React, { useState, useEffect, Suspense, useCallback, useRef, useMemo } from 'react';
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
  CheckCircle2,
  ExternalLink,
  History,
  FileCheck,
  Inbox,
  Clock,
  Edit3,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Building2,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react';
import Link from 'next/link';
import LivePreview from '@/components/LivePreview';
import TicketCaseManager from '@/components/TicketCaseManager';
import CustomerModal, { CustomerData } from '@/components/CustomerModal';
import { ReportData } from '@/lib/pdf-template';
import { TicketItem, CaseItem, calculateSla } from '@/lib/sla-calculator';
import { generateDocumentNumber } from '@/lib/doc-number';
import { TARGET_DEPARTMENTS } from '@/lib/permissions';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  InfoTooltip,
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
  const scheduleTaskIdParam = searchParams.get('scheduleTaskId');
  const revisingReportIdParam = searchParams.get('revisingReportId');
  const isBothParam = searchParams.get('isBoth') === '1' || typeParam === 'BOTH';
  const deptParam = searchParams.get('dept');
  const periodsParam = searchParams.get('periods');

  const requestedPeriods = useMemo(() => {
    try {
      if (!periodsParam) return [];
      const parsed = JSON.parse(periodsParam);
      return Array.isArray(parsed) ? (parsed as Array<{ month: number; year: number }>) : [];
    } catch {
      return [];
    }
  }, [periodsParam]);

  const [activeRequestId, setActiveRequestId] = useState<string | null>(requestIdParam);
  const [activeRequestTicket, setActiveRequestTicket] = useState<string | null>(ticketParam);
  const [activeScheduleTaskId, setActiveScheduleTaskId] = useState<string | null>(scheduleTaskIdParam);

  // Revision mode state
  const [isRevising, setIsRevising] = useState<boolean>(Boolean(revisingReportIdParam));
  const [revisingReportId, setRevisingReportId] = useState<string | null>(revisingReportIdParam);
  const [revisionNotes, setRevisionNotes] = useState<string | null>(null);

  // BOTH Dual-Report Wizard state
  const [bothWizardStep, setBothWizardStep] = useState<'STEP1_SLA' | 'STEP2_MRTG' | null>(
    isBothParam ? 'STEP1_SLA' : null
  );
  const [processedSlaReportId, setProcessedSlaReportId] = useState<string | null>(null);
  const [showBothTransitionModal, setShowBothTransitionModal] = useState<boolean>(false);

  // Routine schedule queue navigation
  const [queueTasks, setQueueTasks] = useState<any[]>([]);
  const [queueIndex, setQueueIndex] = useState<number>(-1);
  const [isLoadingQueue, setIsLoadingQueue] = useState<boolean>(false);

  // Draft PDF downloading
  const [isDownloadingDraft, setIsDownloadingDraft] = useState<boolean>(false);

  // Report mode: MRTG or SLA
  const [reportType, setReportType] = useState<'MRTG' | 'SLA'>(
    isBothParam ? 'SLA' : (typeParam === 'MRTG' ? 'MRTG' : 'SLA')
  );

  // Customer metadata (Default kosong agar operator memilih customer dari direktori)
  const [customerName, setCustomerName] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [serviceId, setServiceId] = useState<string>('');
  const [serviceName, setServiceName] = useState<string>('');
  const [nodeCount, setNodeCount] = useState<number>(1);
  const [targetSla, setTargetSla] = useState<number>(99.5);

  // Period & Document Number (Defaults automatically to previous reporting month)
  const now = new Date();
  const defaultReportingMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultReportingYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  const [month, setMonth] = useState<number>(monthParam ? parseInt(monthParam, 10) : defaultReportingMonth);
  const [year, setYear] = useState<number>(yearParam ? parseInt(yearParam, 10) : defaultReportingYear);
  const [seqNumber, setSeqNumber] = useState<number>(1);
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [isManualDocNumber, setIsManualDocNumber] = useState(false);
  const [isLoadingDocNumber, setIsLoadingDocNumber] = useState(false);

  // MRTG / PRTG Engine Selection (MRTG default)
  const [graphEngine, setGraphEngine] = useState<'MRTG' | 'PRTG'>('MRTG');
  const [cactiGraphId, setCactiGraphId] = useState<string>('');
  const [prtgSensorId, setPrtgSensorId] = useState<string>('');
  const [graphId, setGraphId] = useState<string>('');
  const [graphImage, setGraphImage] = useState<string>('');
  const [trafficDirection, setTrafficDirection] = useState<'NORMAL' | 'REVERSED'>('REVERSED');
  const [dlAvg, setDlAvg] = useState<number>(0);
  const [dlMax, setDlMax] = useState<number>(0);
  const [ulAvg, setUlAvg] = useState<number>(0);
  const [ulMax, setUlMax] = useState<number>(0);
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
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [savedDocInfo, setSavedDocInfo] = useState<{ docNum: string; id: string; status?: string; isRevision?: boolean } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [directApprove, setDirectApprove] = useState(false);
  const [targetDepartment, setTargetDepartment] = useState<string>('Internal NOC');
  const [docPrefix, setDocPrefix] = useState<string>('IMUN.01');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {});

    fetch('/api/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config?.documentNumberPrefix) {
          setDocPrefix(data.config.documentNumberPrefix);
        }
      })
      .catch(() => {});
  }, []);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const reportPeriod = `${monthNames[month - 1]} ${year}`;

  // Creation date for document numbers (Nomor dokumen mencerminkan waktu dokumen dibuat)
  const creationDate = new Date();
  const creationMonth = creationDate.getMonth() + 1;
  const creationYear = creationDate.getFullYear();

  // 1. Fetch next document number automatically based on creation time and reportType
  const fetchNextDocNumber = useCallback(async (
    arg1?: number | 'MRTG' | 'SLA',
    _arg2?: number,
    arg3?: 'MRTG' | 'SLA'
  ) => {
    // If in revision mode, lock document number and never overwrite
    if (isRevising) return;

    let targetType: 'MRTG' | 'SLA' = reportType;
    if (typeof arg1 === 'string') {
      targetType = arg1;
    } else if (typeof arg3 === 'string') {
      targetType = arg3;
    }

    setIsLoadingDocNumber(true);
    try {
      const res = await fetch(`/api/reports/next-number?type=${targetType}`);
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
  }, [isRevising, reportType]);

  // Trigger next document number calculation when reportType changes
  useEffect(() => {
    if (!isManualDocNumber && !isRevising) {
      fetchNextDocNumber(reportType);
    }
  }, [reportType, isManualDocNumber, isRevising, fetchNextDocNumber]);

  // Telemetry Auto-Fetch Helper
  const triggerAutoFetchTelemetry = useCallback(async (
    engine: 'MRTG' | 'PRTG',
    targetGraphId: string,
    m: number,
    y: number,
    direction: 'NORMAL' | 'REVERSED'
  ) => {
    if (!targetGraphId) return;
    setCactiStatusMessage(null);
    try {
      if (engine === 'PRTG') {
        setIsFetchingPrtg(true);
        const res = await fetch('/api/prtg/graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sensorId: targetGraphId, month: m, year: y }),
        });
        const data = await res.json();
        if (data.imageBase64) setGraphImage(data.imageBase64);
        if (data.metrics) {
          if (direction === 'NORMAL') {
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
            setDlUnit(direction === 'NORMAL' ? data.metrics.inUnit : data.metrics.outUnit);
            setUlUnit(direction === 'NORMAL' ? data.metrics.outUnit : data.metrics.inUnit);
          } else if (data.metrics.unit) {
            setDlUnit(data.metrics.unit);
            setUlUnit(data.metrics.unit);
          }
        }
        if (!data.isFallback) {
          toast.success(`Grafik & metrik PRTG (${targetGraphId}) otomatis dimuat.`);
        }
      } else {
        setIsFetchingCacti(true);
        const res = await fetch('/api/cacti/graph', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graphId: targetGraphId, month: m, year: y }),
        });
        const data = await res.json();
        if (data.imageBase64) setGraphImage(data.imageBase64);
        if (data.metrics) {
          if (direction === 'NORMAL') {
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
        if (!data.isFallback) {
          toast.success(`Grafik & metrik MRTG (${targetGraphId}) otomatis dimuat.`);
        }
      }
    } catch (e) {
      console.error('[AutoFetch Error]', e);
    } finally {
      setIsFetchingCacti(false);
      setIsFetchingPrtg(false);
    }
  }, []);

  // Handle selecting customer from Master Modal or URL parameters
  const handleSelectCustomer = useCallback((customer: CustomerData) => {
    setCustomerName(customer.customerName);
    setCustomerId(customer.customerId);
    setServiceId(customer.serviceId);
    setServiceName(customer.serviceName || 'Prime 300 Mbps');
    setNodeCount(customer.nodeCount || extractNodeFromServiceId(customer.serviceId));

    const resolvedSla = customer.targetSla !== undefined ? customer.targetSla : getSlaByServiceName(customer.serviceName).targetSla;
    setTargetSla(resolvedSla);

    // Jika layanan tanpa SLA (0%), otomatis arahkan ke MRTG Report
    if (resolvedSla === 0 && !bothWizardStep) {
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
    const chosenGraphId = preferredEngine === 'PRTG' ? pId : cId;
    setGraphId(chosenGraphId);

    const chosenDir: 'NORMAL' | 'REVERSED' =
      customer.trafficDirection === 'NORMAL' || customer.trafficDirection === 'REVERSED'
        ? customer.trafficDirection
        : 'REVERSED';
    setTrafficDirection(chosenDir);

    // Automatic Telemetry Fetch on Customer Select
    if (chosenGraphId) {
      triggerAutoFetchTelemetry(preferredEngine, chosenGraphId, month, year, chosenDir);
    }
  }, [bothWizardStep, month, year, triggerAutoFetchTelemetry]);

  // 2. Load parameters from URL search param if present
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
    if (scheduleTaskIdParam) setActiveScheduleTaskId(scheduleTaskIdParam);
    if (deptParam) setTargetDepartment(deptParam);

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
  }, [serviceIdParam, customerIdParam, customerNameParam, typeParam, monthParam, yearParam, requestIdParam, ticketParam, scheduleTaskIdParam, deptParam, handleSelectCustomer]);

  // 2b. Load Revision Data if revisingReportId is present
  useEffect(() => {
    if (revisingReportIdParam) {
      setIsRevising(true);
      setRevisingReportId(revisingReportIdParam);
      fetch(`/api/reports?id=${revisingReportIdParam}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.report) {
            const r = data.report;
            setReportType(r.reportType as 'MRTG' | 'SLA');
            setCustomerName(r.customerName);
            setCustomerId(r.customerId);
            setServiceId(r.serviceId);
            setServiceName(r.serviceName || '');
            setNodeCount(r.nodeCount || 1);
            setTargetSla(r.targetSla || 99.5);
            setMonth(r.periodMonth);
            setYear(r.periodYear);
            setDocumentNumber(r.documentNumber);
            setIsManualDocNumber(true); // Lock original document number
            if (r.assignedDepartment) setTargetDepartment(r.assignedDepartment);
            const engine = r.graphType === 'PRTG' ? 'PRTG' : 'MRTG';
            setGraphEngine(engine);
            setGraphId(r.graphId || '');
            setCactiGraphId(r.cactiGraphId || (engine === 'MRTG' ? r.graphId : ''));
            setPrtgSensorId(r.prtgSensorId || (engine === 'PRTG' ? r.graphId : ''));
            if (r.graphImage) setGraphImage(r.graphImage);
            setTrafficDirection(r.trafficDirection || 'REVERSED');
            setDlAvg(r.dlAvg || 0);
            setDlMax(r.dlMax || 0);
            setUlAvg(r.ulAvg || 0);
            setUlMax(r.ulMax || 0);
            setDlUnit(r.dlUnit || 'Mbps');
            setUlUnit(r.ulUnit || 'Mbps');

            // Robust parsing of SLA tickets and cases for revision
            if (r.tickets) {
              try {
                const parsedTickets = typeof r.tickets === 'string' ? JSON.parse(r.tickets) : r.tickets;
                if (Array.isArray(parsedTickets)) setTickets(parsedTickets);
              } catch (e) {
                console.error('[Parse Revision Tickets Error]', e);
              }
            }
            if (r.cases) {
              try {
                const parsedCases = typeof r.cases === 'string' ? JSON.parse(r.cases) : r.cases;
                if (Array.isArray(parsedCases)) setCases(parsedCases);
              } catch (e) {
                console.error('[Parse Revision Cases Error]', e);
              }
            }

            if (r.rejectionNotes) setRevisionNotes(r.rejectionNotes);
            toast.info(`Loading revision data for: ${r.documentNumber}`);
          }
        })
        .catch((e) => console.error('[Load Revising Report Error]', e));
    }
  }, [revisingReportIdParam]);

  // 2c. Routine Schedule Queue Loading
  useEffect(() => {
    if (scheduleTaskIdParam) {
      setActiveScheduleTaskId(scheduleTaskIdParam);
      setIsLoadingQueue(true);
      const m = monthParam ? parseInt(monthParam, 10) : month;
      const y = yearParam ? parseInt(yearParam, 10) : year;
      fetch(`/api/schedule?month=${m}&year=${y}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.tasks && data.tasks.length > 0) {
            const pendingOrCurrent = data.tasks.filter(
              (t: any) => t.status === 'PENDING' || t.status === 'IN_PROGRESS' || t.id === scheduleTaskIdParam
            );
            setQueueTasks(pendingOrCurrent);
            const idx = pendingOrCurrent.findIndex((t: any) => t.id === scheduleTaskIdParam);
            if (idx !== -1) setQueueIndex(idx);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingQueue(false));
    }
  }, [scheduleTaskIdParam, monthParam, yearParam, month, year]);

  // Queue Navigation Helpers
  const loadQueueTask = async (task: any, newIdx: number) => {
    setActiveScheduleTaskId(task.id);
    setQueueIndex(newIdx);
    setCustomerName(task.customerName);
    setCustomerId(task.customerId);
    setServiceId(task.serviceId);
    setServiceName(task.serviceName || '');
    if (task.reportType === 'SLA' || task.reportType === 'MRTG') {
      setReportType(task.reportType);
    }
    setMonth(task.periodMonth);
    setYear(task.periodYear);
    setIsManualDocNumber(false);
    fetchNextDocNumber(task.reportType || 'SLA');
    // Auto-set department from schedule task (routineGroup)
    if (task.assignedDepartment) {
      setTargetDepartment(task.assignedDepartment);
    }

    // Fetch customer details to get graph credentials and auto-fetch telemetry
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data?.customers) {
        const found = data.customers.find(
          (c: CustomerData) => c.serviceId === task.serviceId || c.customerId === task.customerId
        );
        if (found) {
          handleSelectCustomer(found);
        }
      }
    } catch (e) {
      console.error('[Queue Customer Lookup Error]', e);
    }
  };

  const handlePrevQueueTask = () => {
    if (queueIndex > 0) {
      loadQueueTask(queueTasks[queueIndex - 1], queueIndex - 1);
    }
  };

  const handleNextQueueTask = () => {
    if (queueIndex < queueTasks.length - 1) {
      loadQueueTask(queueTasks[queueIndex + 1], queueIndex + 1);
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

  // 4. Manual Fetch from MRTG / Cacti API
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

  // 4b. Manual Fetch from PRTG Network Monitor API
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

  // Draft PDF Download Handler
  const handleDownloadDraftPdf = async () => {
    setIsDownloadingDraft(true);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentReportData,
          isDraft: true,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to download draft PDF');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanName = (currentReportData.customerName || 'Customer').replace(/[/\\?%*:|"<>]/g, '-');
      a.download = `DRAFT-${currentReportData.reportType}-${cleanName}-${monthNames[month - 1]}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Draft PDF downloaded with preview watermark.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to download draft PDF: ${msg}`);
    } finally {
      setIsDownloadingDraft(false);
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

  const slaCalc = calculateSla(cases, tickets, year, month);
  const isSupervisorOrAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPERVISOR';

  // 5. Generate / Save Report Handler
  const handleGenerateReport = async () => {
    if (!customerName || !customerName.trim()) {
      toast.error('Please select or enter Customer Name first.');
      setIsCustomerModalOpen(true);
      return;
    }
    if (!serviceId || !serviceId.trim()) {
      toast.error('Service ID is required.');
      return;
    }

    setIsSavingReport(true);
    setSavedDocInfo(null);
    try {
      // A. If in Revision Mode -> PUT to /api/reports
      if (isRevising && revisingReportId) {
        const res = await fetch('/api/reports', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: revisingReportId,
            ...currentReportData,
            periodMonth: month,
            periodYear: year,
            onlinePercent: slaCalc.onlinePercent,
            downtimePercent: slaCalc.downtimePercent,
            availabilityPercent: slaCalc.availabilityPercent,
            totalDowntimeMinutes: slaCalc.totalDowntimeMinutes,
            downtimeDurationStr: slaCalc.downtimeDurationStr,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update revision');
        }

        setSavedDocInfo({
          docNum: currentReportData.documentNumber,
          id: revisingReportId,
          status: 'PENDING_NOC_APPROVAL',
          isRevision: true,
        });

        toast.success(`Revision for report ${currentReportData.documentNumber} updated and resubmitted to Supervisor!`);
        setIsRevising(false);
        setRevisingReportId(null);
        setRevisionNotes(null);
        setIsSavingReport(false);
        return;
      }

      // B. Standard Generation -> POST to /api/reports
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
          assignedDepartment: targetDepartment,
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

      // Auto-save Graph ID to master
      autoSaveGraphIdToMaster(customerId, graphId, trafficDirection, graphEngine);

      // Handle BOTH Wizard Flow
      if (bothWizardStep === 'STEP1_SLA' && activeRequestId) {
        setProcessedSlaReportId(data.report.id);
        await fetch('/api/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeRequestId,
            status: 'IN_PROGRESS',
            processedSlaReportId: data.report.id,
          }),
        }).catch((e) => console.error('[Update Request Step 1 Error]', e));

        setShowBothTransitionModal(true);
        setIsSavingReport(false);
        return;
      } else if (bothWizardStep === 'STEP2_MRTG' && activeRequestId) {
        await fetch('/api/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeRequestId,
            status: 'IN_PROGRESS', // Kept in IN_PROGRESS until reports are fully APPROVED
            processedMrtgReportId: data.report.id,
          }),
        }).catch((e) => console.error('[Update Request Step 2 Error]', e));

        setBothWizardStep(null);
        toast.success('Step 2 (MRTG) report created and submitted to approval queue! Request ticket remains active in progress.');
      } else if (activeRequestId && data.report?.id) {
        // Standard single request: update linked report ID, keep IN_PROGRESS until final approval
        await fetch('/api/requests', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeRequestId,
            status: 'IN_PROGRESS',
            processedReportId: data.report.id,
          }),
        }).catch((e) => console.error('[Update Request Status Error]', e));
      }

      // If generated from an active routine schedule task
      if (activeScheduleTaskId && data.report?.id) {
        await fetch('/api/schedule', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: activeScheduleTaskId,
            status: 'COMPLETED',
            completedReportId: data.report.id,
          }),
        }).catch((e) => console.error('[Update Schedule Task Status Error]', e));
      }

      // Auto update next doc number after save
      fetchNextDocNumber(month, year, reportType);

      if (reportStatus === 'APPROVED') {
        toast.success('Report generated and directly approved!');
      } else {
        toast.success('Report generated and submitted to Supervisor approval queue.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to generate report: ${msg}`);
    } finally {
      setIsSavingReport(false);
    }
  };

  // Queue Save & Next handler
  const handleSaveAndNextInQueue = async () => {
    await handleGenerateReport();
    if (queueIndex < queueTasks.length - 1) {
      const nextTask = queueTasks[queueIndex + 1];
      loadQueueTask(nextTask, queueIndex + 1);
      toast.info(`Loading next queue item: ${nextTask.customerName}`);
    } else {
      toast.success('All scheduled routine queue tasks for this period are completed.');
    }
  };

  // Step 2 Transition modal action
  const handleProceedToBothStep2 = () => {
    setShowBothTransitionModal(false);
    setBothWizardStep('STEP2_MRTG');
    setReportType('MRTG');
    fetchNextDocNumber(month, year, 'MRTG');
    toast.info('Step 2 (MRTG Report) active. Verify MRTG graph and save to complete the BOTH request ticket.');
  };

  // Keyboard shortcut listener
  const handleGenerateReportRef = useRef(handleGenerateReport);
  handleGenerateReportRef.current = handleGenerateReport;

  const handleSaveAndNextRef = useRef(handleSaveAndNextInQueue);
  handleSaveAndNextRef.current = handleSaveAndNextInQueue;

  const handleDownloadDraftRef = useRef(handleDownloadDraftPdf);
  handleDownloadDraftRef.current = handleDownloadDraftPdf;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + Shift + Enter: Save and Next in queue
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        handleSaveAndNextRef.current();
        return;
      }

      // Ctrl + Enter: Trigger Report Generation or Save Revision
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerateReportRef.current();
        return;
      }

      // Ctrl + Shift + K: Open Customer Modal
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'K' || e.key === 'k')) {
        e.preventDefault();
        setIsCustomerModalOpen(true);
        return;
      }

      // Ctrl + Shift + D: Download Draft PDF
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        handleDownloadDraftRef.current();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const dlDirectionLabel = trafficDirection === 'NORMAL' ? 'Inbound' : 'Outbound';
  const ulDirectionLabel = trafficDirection === 'NORMAL' ? 'Outbound' : 'Inbound';

  return (
    <div className="space-y-6 pb-36">
      {/* Page Header with Mode Switcher */}
      <PageHeader
        title="Report Generator"
        description="Telemetry automation and compliant PDF generation workstation."
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
              className={reportType === 'MRTG' ? 'text-orange-700 font-semibold shadow-xs' : 'text-slate-600'}
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-orange-600" />
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
              className={reportType === 'SLA' ? 'text-orange-700 font-semibold shadow-xs' : 'text-slate-600'}
            >
              <ShieldCheck className="w-3.5 h-3.5 mr-1 text-orange-600" />
              <span>SLA (3 Pages)</span>
            </Button>
          </div>
        }
      />

      {/* 1. Revision Mode Banner */}
      {isRevising && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-950 text-xs shadow-xs flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Edit3 className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-rose-900">Document Revision Mode:</span>
                <code className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-sans font-bold text-xs border border-rose-200">
                  {documentNumber}
                </code>
                <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-100/50 text-xs">
                  Document Number Locked
                </Badge>
              </div>
              {revisionNotes && (
                <p className="text-rose-800 font-medium bg-white/70 p-2 rounded border border-rose-200/60">
                  <span className="font-semibold">Supervisor Review Notes:</span> &ldquo;{revisionNotes}&rdquo;
                </p>
              )}
              <p className="text-xs text-rose-600">
                Please adjust the ticket or telemetry data, then click <strong>&ldquo;Resubmit Revision&rdquo;</strong> in the bottom dock to update the archive and request re-approval.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsRevising(false);
              setRevisingReportId(null);
              setRevisionNotes(null);
              setIsManualDocNumber(false);
              fetchNextDocNumber(month, year, reportType);
            }}
            className="text-rose-600 hover:text-rose-800 hover:bg-rose-100/50 h-7 text-xs shrink-0"
          >
            Cancel Revision
          </Button>
        </div>
      )}

      {/* 2. BOTH Dual-Report Wizard Banner */}
      {bothWizardStep && (
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-950 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-purple-600 shrink-0" />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-purple-900">Wizard Dual-Report (BOTH):</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold inline-flex items-center gap-1 ${
                  bothWizardStep === 'STEP1_SLA'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                <span>Step 1: SLA Report</span>
                {bothWizardStep === 'STEP2_MRTG' && <Check className="w-3 h-3 text-purple-700" />}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  bothWizardStep === 'STEP2_MRTG'
                    ? 'bg-purple-600 text-white'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                Step 2: MRTG Report
              </span>
            </div>
          </div>
          {activeRequestTicket && (
            <span className="text-xs text-purple-700 font-medium">Tiket: {activeRequestTicket}</span>
          )}
        </div>
      )}

      {/* 3. Routine Schedule Queue Taskbar */}
      {queueTasks.length > 0 && queueIndex !== -1 && (
        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-950 text-xs flex items-center justify-between shadow-xs flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <ListOrdered className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900">Antrean Jadwal Rutin:</span>
              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs border border-blue-200">
                {queueIndex + 1} dari {queueTasks.length} Customer
              </span>
              <span className="text-blue-700 font-medium hidden sm:inline">
                (Sisa {queueTasks.length - (queueIndex + 1)} antrean)
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handlePrevQueueTask}
              disabled={queueIndex <= 0}
              className="h-7 text-xs px-2 gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleNextQueueTask}
              disabled={queueIndex >= queueTasks.length - 1}
              className="h-7 text-xs px-2 gap-1"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Active Request Ticket Banner (Single) */}
      {!bothWizardStep && activeRequestTicket && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Inbox className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-semibold">Processing Request Ticket: </span>
              <code className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-sans font-bold text-xs border border-amber-200">
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
            title="Close banner"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Main 2-Column Split: Left = Input Form, Right = Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start min-w-0 max-w-full">
        {/* ================= LEFT COLUMN: DYNAMIC FORM ================= */}
        <div className="xl:col-span-6 2xl:col-span-5 space-y-5 min-w-0 max-w-full">
          {/* 1. Customer & Document Metadata Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span className="font-sans text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 tabular-nums">01</span>
                <span>Customer &amp; Report Period</span>
              </h3>
              <Button
                type="button"
                variant={!customerName ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                title="Open Customer Directory (Ctrl+Shift+K)"
                className={!customerName ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs' : ''}
              >
                <Search className="w-3.5 h-3.5 mr-1" />
                <span>Select Customer</span>
                <kbd className={`hidden sm:inline-block ml-1.5 text-xs px-1 py-0.5 rounded border ${
                  !customerName ? 'bg-white/20 text-white border-white/30' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  Ctrl+Shift+K
                </kbd>
              </Button>
            </div>

            <div className="space-y-3.5">
              <FormField label="Customer Name" required>
                <Input
                  value={customerName}
                  placeholder="Search or enter customer name..."
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Customer ID" required>
                  <Input
                    value={customerId}
                    placeholder="e.g. 01.2180.1124"
                    onChange={(e) => setCustomerId(e.target.value)}
                  />
                </FormField>
                <FormField label="Service ID" required>
                  <Input
                    value={serviceId}
                    placeholder="e.g. 01.2180.1"
                    onChange={(e) => {
                      const newSid = e.target.value;
                      setServiceId(newSid);
                      setNodeCount(extractNodeFromServiceId(newSid));
                    }}
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
                        className={`text-xs ${
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
                    placeholder="e.g. Prime 300 Mbps"
                    onChange={(e) => {
                      const newServiceName = e.target.value;
                      setServiceName(newServiceName);
                      const match = getSlaByServiceName(newServiceName);
                      setTargetSla(match.targetSla);
                    }}
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
                {requestedPeriods.length > 1 && (
                  <div className="sm:col-span-12 flex items-center gap-2 flex-wrap p-2.5 bg-orange-50/80 border border-orange-200/80 rounded-lg text-xs mb-1">
                    <span className="font-semibold text-orange-900">Selected Periods ({requestedPeriods.length}):</span>
                    {requestedPeriods.map((p, idx) => {
                      const isSelected = month === p.month && year === p.year;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setMonth(p.month);
                            setYear(p.year);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-medium transition flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'bg-orange-600 text-white shadow-xs font-semibold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <span>{monthNames[p.month - 1]} {p.year}</span>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="sm:col-span-4">
                  <FormField label="Report Month">
                    <Select
                      value={String(month)}
                      onValueChange={(val) => {
                        const newM = parseInt(val, 10);
                        setMonth(newM);
                      }}
                    >
                      <SelectTrigger className="h-9 w-full text-xs">
                        <SelectValue />
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
                        const newY = parseInt(e.target.value, 10) || defaultReportingYear;
                        setYear(newY);
                      }}
                      className="text-center"
                    />
                  </FormField>
                </div>
                <div className="sm:col-span-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-medium text-slate-700">Document Number</label>
                      <InfoTooltip
                        content={`Sequence format: {01}/${docPrefix}/{${reportType}}/{${String(creationMonth).padStart(2, '0')}}/{${creationYear}} (based on creation date)`}
                      />
                    </div>
                    {!isRevising && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchNextDocNumber(reportType)}
                        className="h-auto p-0 text-xs text-orange-700 hover:text-orange-600 hover:bg-transparent font-medium flex items-center gap-1 transition"
                        title="Auto-generate sequence number"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingDocNumber ? 'animate-spin' : ''}`} />
                        <span>Auto</span>
                      </Button>
                    )}
                  </div>
                  <Input
                    value={documentNumber}
                    disabled={isRevising}
                    onChange={(e) => {
                      setDocumentNumber(e.target.value);
                      setIsManualDocNumber(true);
                    }}
                    className={`text-xs ${isRevising ? 'bg-slate-50 font-sans text-slate-600 cursor-not-allowed' : ''}`}
                  />
                  {(isRevising || isManualDocNumber) && (
                    <div className="mt-1 text-xs flex items-center justify-end">
                      {isRevising ? (
                        <span className="text-rose-600 font-semibold">(Locked for Revision)</span>
                      ) : (
                        <span className="text-amber-600 font-medium">(Manually Edited)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Target Department & Approval Tier */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 py-2.5 bg-slate-50/80 rounded-lg border border-slate-200/80">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-white border border-slate-200/90 flex items-center justify-center shrink-0 text-slate-500 shadow-3xs">
                      <Building2 className="w-3.5 h-3.5 text-slate-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-800">Target Department</span>
                      <InfoTooltip
                        content={
                          targetDepartment === 'Internal NOC'
                            ? '1-Tier Workflow: Document is finalized directly upon NOC Supervisor approval.'
                            : `2-Tier Workflow: Requires NOC Supervisor review, followed by ${targetDepartment} Supervisor sign-off.`
                        }
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={targetDepartment}
                      onValueChange={(val) => setTargetDepartment(val)}
                    >
                      <SelectTrigger className="h-8 text-xs w-full sm:w-52 bg-white border-slate-200/90 shadow-3xs font-medium">
                        <SelectValue placeholder="Select Target Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {TARGET_DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {targetDepartment === 'Internal NOC' ? (
                      <Badge
                        variant="outline"
                        className="h-8 px-2.5 border-emerald-200 text-emerald-700 bg-emerald-50 text-xs whitespace-nowrap shrink-0 font-medium inline-flex items-center gap-1.5 shadow-3xs"
                        title="1-Tier Workflow: NOC Supervisor Approval Only"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>1-Tier (Internal)</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-8 px-2.5 border-amber-200 text-amber-700 bg-amber-50 text-xs whitespace-nowrap shrink-0 font-medium inline-flex items-center gap-1.5 shadow-3xs"
                        title={`2-Tier Workflow: NOC Review + ${targetDepartment} Supervisor Approval`}
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>2-Tier ({targetDepartment === 'Customer Experience' ? 'CE' : 'AE'})</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. MRTG / PRTG Integration Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
                <span className="font-sans text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 tabular-nums">02</span>
                <span>Traffic Graph Integration</span>
              </h3>
              {isGraphIdSynced && (
                <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 text-xs gap-1">
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
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    ID: {cactiGraphId}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">Default</span>
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
                  <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                    ID: {prtgSensorId}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">None</span>
                )}
              </Button>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    {graphEngine === 'PRTG' ? 'PRTG Sensor ID / Object ID' : 'Cacti Graph ID (Local Graph ID)'}
                  </label>
                  <InfoTooltip
                    content={
                      graphEngine === 'PRTG'
                        ? `PRTG graph queried via Historic Data & Chart API for ${monthNames[month - 1]} ${year}.`
                        : `Graph query cycle: ${monthNames[month - 1]} ${year} (01/${String(month).padStart(2, '0')} 00:00 - End of Month 23:59 WIB).`
                    }
                  />
                </div>
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
                <div className="flex items-center gap-1.5 mb-2">
                  <label className="text-xs font-medium text-slate-700">Traffic Direction ({graphEngine})</label>
                  <InfoTooltip content="Port mapping: Normal treats switch In as Download and Out as Upload. Reversed inverts this orientation." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={trafficDirection === 'NORMAL' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setTrafficDirection('NORMAL');
                      autoSaveGraphIdToMaster(customerId, graphId, 'NORMAL', graphEngine);
                    }}
                    className={`h-9 px-3 rounded-lg flex items-center justify-between border transition text-xs ${
                      trafficDirection === 'NORMAL'
                        ? 'bg-orange-50 text-orange-700 border-orange-500 font-semibold hover:bg-orange-50'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="In: Download | Out: Upload"
                  >
                    <span className="font-medium">Normal</span>
                    <span className="text-[11px] text-slate-500 font-normal">In: DL &bull; Out: UL</span>
                  </Button>
                  <Button
                    type="button"
                    variant={trafficDirection === 'REVERSED' ? 'secondary' : 'ghost'}
                    onClick={() => {
                      setTrafficDirection('REVERSED');
                      autoSaveGraphIdToMaster(customerId, graphId, 'REVERSED', graphEngine);
                    }}
                    className={`h-9 px-3 rounded-lg flex items-center justify-between border transition text-xs ${
                      trafficDirection === 'REVERSED'
                        ? 'bg-orange-50 text-orange-700 border-orange-500 font-semibold hover:bg-orange-50'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title="Out: Download | In: Upload"
                  >
                    <span className="font-medium">Reversed</span>
                    <span className="text-[11px] text-slate-500 font-normal">Out: DL &bull; In: UL</span>
                  </Button>
                </div>
              </div>

              {/* Traffic Metrics */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-700">Traffic Metrics (Average &amp; Maximum)</span>
                  <InfoTooltip content="Values are automatically computed from telemetry or can be adjusted manually." />
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
                    <strong className="text-slate-900">{`${dlAvg} ${dlUnit}`}</strong>
                    <span>{`, maximum usage reaching `}</span>
                    <strong className="text-slate-900">{`${dlMax} ${dlUnit}`}</strong>
                    <span>.</span>
                  </p>
                  <p className="leading-relaxed">
                    <span>{`○ Upload Traffic (${ulDirectionLabel}): Average usage is `}</span>
                    <strong className="text-slate-900">{`${ulAvg} ${ulUnit}`}</strong>
                    <span>{`, maximum usage reaching `}</span>
                    <strong className="text-slate-900">{`${ulMax} ${ulUnit}`}</strong>
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

          {/* Success Save Banner */}
          {savedDocInfo && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>
                    {savedDocInfo.isRevision
                      ? 'Report revision saved and resubmitted to Supervisor queue!'
                      : savedDocInfo.status === 'APPROVED'
                      ? 'Report generated and directly approved!'
                      : 'Report generated and submitted to Supervisor queue!'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSavedDocInfo(null)}
                  className="h-6 w-6 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/50"
                  title="Dismiss alert"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-xs text-emerald-700">
                {savedDocInfo.isRevision
                  ? <>Revision document <strong>{savedDocInfo.docNum}</strong> updated in system and awaiting Supervisor review.</>
                  : <>Document <strong>{savedDocInfo.docNum}</strong> archived.{' '}
                    {savedDocInfo.status === 'APPROVED'
                      ? 'Official document approved and ready for distribution.'
                      : 'Document requires Supervisor verification before release.'}
                    </>
                }
              </p>
              <div className="pt-1 flex items-center space-x-3 text-xs flex-wrap gap-y-1">
                <Link
                  href="/history"
                  className="font-semibold text-emerald-800 underline hover:text-emerald-950 flex items-center gap-1"
                >
                  <span>View Report History &amp; Approvals</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
                {savedDocInfo.status === 'APPROVED' && (
                  <a
                    href={`/api/reports/download?id=${savedDocInfo.id}`}
                    className="font-semibold text-orange-700 underline hover:text-orange-600 flex items-center gap-1"
                  >
                    <span>Download PDF</span>
                    <Download className="w-3 h-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName('');
                    setCustomerId('');
                    setServiceId('');
                    setServiceName('');
                    setNodeCount(1);
                    setTargetSla(99.5);
                    setGraphId('');
                    setCactiGraphId('');
                    setPrtgSensorId('');
                    setGraphImage('');
                    setDlAvg(0);
                    setDlMax(0);
                    setUlAvg(0);
                    setUlMax(0);
                    setTickets([]);
                    setCases([]);
                    setIsRevising(false);
                    setRevisingReportId(null);
                    setRevisionNotes(null);
                    setIsManualDocNumber(false);
                    setSavedDocInfo(null);
                    fetchNextDocNumber(month, year, reportType);
                  }}
                  className="font-semibold text-slate-700 underline hover:text-slate-900 ml-auto"
                >
                  + New Report
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= RIGHT COLUMN: LIVE PREVIEW ================= */}
        <div className="xl:col-span-6 2xl:col-span-7 sticky top-20 h-[calc(100vh-11rem)] min-w-0 max-w-full overflow-hidden">
          <LivePreview
            data={currentReportData}
            isGeneratingPdf={isSavingReport || isDownloadingDraft}
          />
        </div>
      </div>

      {/* ================= STICKY OPERATOR ACTION DOCK ================= */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-[1760px] 2xl:max-w-[1880px] w-full mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Metadata & Live Telemetry Compliance Summary */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto py-0.5">
            {/* Customer & Document Pill */}
            <button
              type="button"
              onClick={() => setIsCustomerModalOpen(true)}
              className="group flex items-center gap-2.5 h-10 px-3 rounded-lg border border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50/20 transition text-left shrink-0 cursor-pointer shadow-3xs"
              title="Click to search or switch customer (Ctrl+Shift+K)"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${customerName ? 'bg-orange-600 ring-2 ring-orange-100' : 'bg-slate-300'}`} />
              <div className="min-w-0 max-w-[170px] sm:max-w-[240px]">
                <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-orange-600 transition leading-tight">
                  {customerName || 'Select Customer'}
                </div>
                <div className="text-[11px] font-sans tabular-nums text-slate-500 truncate leading-tight">
                  {documentNumber || 'No Document Number'}
                </div>
              </div>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500 hidden sm:inline-block">
                Ctrl+K
              </span>
            </button>

            {/* Quick Metrics & Compliance Badge */}
            {reportType === 'SLA' ? (
              <div className="flex items-center gap-2.5 h-10 px-3 rounded-lg border border-slate-200 bg-white shrink-0 shadow-3xs">
                <Badge
                  variant={slaCalc.availabilityPercent >= targetSla ? 'success' : 'destructive'}
                  className="text-xs font-semibold px-2 py-0.5"
                >
                  <span className="tabular-nums font-bold">SLA: {slaCalc.availabilityPercent}%</span>
                  <span className="text-slate-300">|</span>
                  {slaCalc.availabilityPercent >= targetSla ? (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Target Met</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>SLA Breached</span>
                    </span>
                  )}
                </Badge>
                <div className="text-xs text-slate-500 hidden md:flex items-center gap-1.5 border-l border-slate-200 pl-2.5">
                  <span className="text-[11px] uppercase tracking-wider font-medium text-slate-400">Downtime:</span>
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {slaCalc.downtimeDurationStr || '0m'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-slate-200 bg-white shrink-0 text-xs shadow-3xs">
                <Badge variant="outline" className="text-xs font-medium border-slate-200 text-slate-700 bg-slate-50">
                  Avg: DL <span className="font-semibold tabular-nums ml-0.5">{dlAvg}</span> {dlUnit} / UL <span className="font-semibold tabular-nums ml-0.5">{ulAvg}</span> {ulUnit}
                </Badge>
                <Badge variant="outline" className="text-xs font-medium border-slate-200 text-slate-700 bg-slate-50 hidden md:inline-flex">
                  Max: DL <span className="font-semibold tabular-nums ml-0.5">{dlMax}</span> {dlUnit} / UL <span className="font-semibold tabular-nums ml-0.5">{ulMax}</span> {ulUnit}
                </Badge>
              </div>
            )}
          </div>

          {/* Right: Dock Action Buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDownloadDraftPdf}
              disabled={isDownloadingDraft}
              className="text-slate-600 hover:text-slate-900 h-9 px-3 text-xs"
              title="Download PDF Watermark Draft (Ctrl+Shift+D)"
            >
              {isDownloadingDraft ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              )}
              <span>Draft PDF</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="text-slate-600 hover:text-slate-900 h-9 px-3 text-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              <span>Reset</span>
            </Button>

            {isSupervisorOrAdmin && !isRevising && (
              <label className="hidden lg:flex items-center space-x-1.5 text-xs font-medium text-slate-700 cursor-pointer select-none bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-200/70 transition-colors">
                <input
                  type="checkbox"
                  checked={directApprove}
                  onChange={(e) => setDirectApprove(e.target.checked)}
                  className="w-3.5 h-3.5 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                />
                <span>Direct Approve</span>
              </label>
            )}

            {isRevising ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleGenerateReport}
                disabled={isSavingReport}
                className="bg-rose-600 hover:bg-rose-700 text-white h-9 px-4 text-xs font-semibold shadow-xs"
              >
                {isSavingReport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Saving Revision...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    <span>Resubmit Revision</span>
                    <kbd className="hidden sm:inline-block ml-1.5 text-xs bg-white/20 text-white px-1 py-0.5 rounded font-medium">
                      Ctrl+↵
                    </kbd>
                  </>
                )}
              </Button>
            ) : queueIndex !== -1 && queueIndex < queueTasks.length - 1 ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={isSavingReport}
                  className="h-9 px-3 text-xs font-medium text-slate-700"
                >
                  <span>Save Only</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAndNextInQueue}
                  disabled={isSavingReport}
                  className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-4 text-xs font-semibold shadow-xs"
                >
                  {isSavingReport ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      <span>Save &amp; Next Queue</span>
                      <kbd className="hidden lg:inline-block ml-1.5 text-xs bg-white/20 text-white px-1 py-0.5 rounded font-medium">
                        Ctrl+Shift+↵
                      </kbd>
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleGenerateReport}
                disabled={isSavingReport || !customerName.trim()}
                title={!customerName.trim() ? 'Select a customer first' : 'Generate Report (Ctrl+Enter)'}
                className="bg-orange-600 hover:bg-orange-700 text-white h-9 px-4 text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSavingReport ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 mr-1.5" />
                    <span>Generate Report</span>
                    <kbd className="hidden sm:inline-block ml-1.5 text-xs bg-white/20 text-white px-1 py-0.5 rounded font-medium">
                      Ctrl+↵
                    </kbd>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* BOTH Wizard Step Transition Modal */}
      <Dialog open={showBothTransitionModal} onOpenChange={setShowBothTransitionModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Step 1 (SLA) Saved!</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed pt-1.5">
              This request requires both report types (<strong>MRTG &amp; SLA</strong>).
              SLA report has been saved. Proceed to MRTG Report (Step 2)?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowBothTransitionModal(false)}
              className="text-xs text-slate-500"
            >
              Later
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleProceedToBothStep2}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <span>Continue to Step 2 (MRTG)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          setCustomerName('');
          setCustomerId('');
          setServiceId('');
          setServiceName('');
          setNodeCount(1);
          setTargetSla(99.5);
          setGraphId('');
          setCactiGraphId('');
          setPrtgSensorId('');
          setGraphImage('');
          setDlAvg(0);
          setDlMax(0);
          setUlAvg(0);
          setUlMax(0);
          setTickets([]);
          setCases([]);
          setIsManualDocNumber(false);
          fetchNextDocNumber(month, year, reportType);
          toast.info('Form cleared.');
        }}
      />
    </div>
  );
}

export default function GeneratorPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-slate-500">Loading Report Generator...</div>}>
      <GeneratorPageContent />
    </Suspense>
  );
}
