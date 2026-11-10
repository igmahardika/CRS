'use client';

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  Sparkles,
  Check,
  ClipboardPaste,
  Info,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { TicketItem, CaseItem, calculateSla, calculateMinutesBetween } from '@/lib/sla-calculator';
import {
  Button,
  Input,
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
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Textarea,
  SegmentedControl,
  Checkbox,
} from '@/components/ui';

interface TicketCaseManagerProps {
  tickets: TicketItem[];
  setTickets: React.Dispatch<React.SetStateAction<TicketItem[]>>;
  cases: CaseItem[];
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  year: number;
  month: number;
  targetSla?: number;
}

// ----------------------------------------------------
// Helper: Robust Date Parser
// Supports: "19 October 2026 14:45 WIB", "19 Oktober 2026", "YYYY-MM-DD", "DD/MM/YYYY"
// ----------------------------------------------------
function parseDateString(str: string, defaultYear: number, defaultMonth: number): string {
  if (!str) return `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-01`;

  // Format YYYY-MM-DD
  const isoMatch = str.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${String(isoMatch[2]).padStart(2, '0')}-${String(isoMatch[3]).padStart(2, '0')}`;
  }

  // Format DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = str.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${String(ddmmyyyy[2]).padStart(2, '0')}-${String(ddmmyyyy[1]).padStart(2, '0')}`;
  }

  // Format: 19 October 2026 or 19 Oktober 2026
  const monthNames: Record<string, number> = {
    january: 1, januari: 1, jan: 1,
    february: 2, februari: 2, feb: 2,
    march: 3, maret: 3, mar: 3,
    april: 4, apr: 4,
    may: 5, mei: 5,
    june: 6, juni: 6, jun: 6,
    july: 7, juli: 7, jul: 7,
    august: 8, agustus: 8, aug: 8, ags: 8,
    september: 9, sep: 9,
    october: 10, oktober: 10, oct: 10, okt: 10,
    november: 11, nov: 11,
    december: 12, desember: 12, dec: 12, des: 12,
  };

  const textDateMatch = str.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/);
  if (textDateMatch) {
    const day = String(textDateMatch[1]).padStart(2, '0');
    const mStr = textDateMatch[2].toLowerCase();
    const monthNum = monthNames[mStr];
    const yr = textDateMatch[3];
    if (monthNum) {
      return `${yr}-${String(monthNum).padStart(2, '0')}-${day}`;
    }
  }

  return `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-01`;
}

// ----------------------------------------------------
// Helper: Robust Date & Time Parser
// Returns: { date: "YYYY-MM-DD", dateTime: "YYYY-MM-DD HH:mm" | undefined }
// ----------------------------------------------------
function parseDateTimeString(
  str: string,
  defaultYear: number,
  defaultMonth: number
): { date: string; dateTime?: string } {
  if (!str) {
    const d = `${defaultYear}-${String(defaultMonth).padStart(2, '0')}-01`;
    return { date: d, dateTime: undefined };
  }

  const dateOnly = parseDateString(str, defaultYear, defaultMonth);

  // Check for time: HH:mm or HH:mm:ss
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hh = String(timeMatch[1]).padStart(2, '0');
    const mm = timeMatch[2];
    return {
      date: dateOnly,
      dateTime: `${dateOnly} ${hh}:${mm}`,
    };
  }

  return {
    date: dateOnly,
    dateTime: undefined,
  };
}

// ----------------------------------------------------
// Helper: Robust Downtime Duration Parser
// Supports: "07:02:00" -> 422 min, "7 jam 27 menit" -> 447 min, "45" -> 45 min, "-" -> 0
// ----------------------------------------------------
function parseDurationToMinutes(str: string): number {
  if (!str || str.trim() === '-' || str.trim() === '') return 0;

  // Format hh:mm:ss or hh:mm (e.g. 07:02:00)
  const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10) || 0;
    const mins = parseInt(timeMatch[2], 10) || 0;
    return hours * 60 + mins;
  }

  // Format: 7 jam 27 menit or 7 hrs 27 mins
  let total = 0;
  const hoursMatch = str.match(/(\d+)\s*(?:jam|hr|hrs|hours?)/i);
  if (hoursMatch) {
    total += parseInt(hoursMatch[1], 10) * 60;
  }
  const minsMatch = str.match(/(\d+)\s*(?:menit|mins?|minutes?)/i);
  if (minsMatch) {
    total += parseInt(minsMatch[1], 10);
  }
  if (total > 0) return total;

  const numOnly = parseInt(str.replace(/[^0-9]/g, ''), 10);
  return isNaN(numOnly) ? 0 : numOnly;
}

// ----------------------------------------------------
// Helper: Smart Multi-line Row Splitter for Excel/Sheets
// ----------------------------------------------------
function splitHelpdeskRows(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const rows: string[] = [];
  let currentRow = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A row in Helpdesk tables begins with: `#\t`, `Datetime\t`, or a numeric sequence `\d+\t`
    const isNewRow = /^#\t/.test(line) || /^Datetime\t/i.test(line) || /^\d+\t/.test(line);

    if (isNewRow) {
      if (currentRow) rows.push(currentRow);
      currentRow = line;
    } else {
      if (currentRow) {
        currentRow += ' ' + line.trim();
      } else {
        currentRow = line;
      }
    }
  }
  if (currentRow) rows.push(currentRow);
  return rows;
}

function isHelpdeskTableFormat(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    (lower.includes('no tiket') || lower.includes('kategori')) &&
    (lower.includes('durasi downtime') ||
      lower.includes('durasi penanganan') ||
      lower.includes('close ticket') ||
      lower.includes('close case') ||
      lower.includes('penanganan') ||
      lower.includes('penyebab'))
  );
}

export default function TicketCaseManager({
  tickets,
  setTickets,
  cases,
  setCases,
  year,
  month,
  targetSla = 99.5,
}: TicketCaseManagerProps) {
  const slaResult = calculateSla(cases, tickets, year, month);
  const padMonth = String(month).padStart(2, '0');

  // Batch Import Modal State
  const [importMode, setImportMode] = useState<'tickets' | 'cases' | null>(null);
  const [rawPastedText, setRawPastedText] = useState('');
  const [importActionType, setImportActionType] = useState<'append' | 'replace'>('append');
  const [alsoSyncCrossData, setAlsoSyncCrossData] = useState(true);

  // Clear Confirmation State
  const [confirmClear, setConfirmClear] = useState<'tickets' | 'cases' | null>(null);

  // ----------------------------------------------------
  // Single Ticket Actions
  // ----------------------------------------------------
  const handleAddTicket = (count = 1) => {
    const newItems: TicketItem[] = [];
    const baseNum = tickets.length;
    for (let i = 1; i <= count; i++) {
      const seq = String(baseNum + i).padStart(2, '0');
      newItems.push({
        noTicket: `TKT-${year}${padMonth}-${seq}`,
        date: `${year}-${padMonth}-01`,
        startDate: `${year}-${padMonth}-01 08:00`,
        endDate: `${year}-${padMonth}-01 17:00`,
        description: '',
        action: '',
        status: 'Closed',
      });
    }
    setTickets([...tickets, ...newItems]);
    if (count > 1) {
      toast.success(`Berhasil menambahkan ${count} tiket baru`);
    }
  };

  const handleUpdateTicket = (index: number, field: keyof TicketItem, value: string) => {
    const updated = [...tickets];
    updated[index] = { ...updated[index], [field]: value };
    setTickets(updated);
  };

  const handleDeleteTicket = (index: number) => {
    setTickets(tickets.filter((_, i) => i !== index));
  };

  const handleClearAllTickets = () => {
    setTickets([]);
    setConfirmClear(null);
    toast.success('Daftar tiket berhasil dikosongkan');
  };

  // ----------------------------------------------------
  // Single Case Actions
  // ----------------------------------------------------
  const handleAddCase = (count = 1) => {
    const newItems: CaseItem[] = [];
    const baseNum = cases.length;
    for (let i = 1; i <= count; i++) {
      const seq = String(baseNum + i).padStart(2, '0');
      newItems.push({
        noCase: `CASE-${year}${padMonth}-${seq}`,
        date: `${year}-${padMonth}-01`,
        startDate: `${year}-${padMonth}-01 09:00`,
        endDate: `${year}-${padMonth}-01 09:30`,
        description: '',
        action: '',
        downtimeMinutes: 30,
      });
    }
    setCases([...cases, ...newItems]);
    if (count > 1) {
      toast.success(`Berhasil menambahkan ${count} kasus downtime baru`);
    }
  };

  const handleUpdateCase = (index: number, field: keyof CaseItem, value: string | number) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], [field]: value };
    setCases(updated);
  };

  const handleDeleteCase = (index: number) => {
    setCases(cases.filter((_, i) => i !== index));
  };

  const handleClearAllCases = () => {
    setCases([]);
    setConfirmClear(null);
    toast.success('Daftar kasus downtime berhasil dikosongkan');
  };

  // ----------------------------------------------------
  // Universal Smart Parser (Supports Helpdesk System & Simple TSV)
  // ----------------------------------------------------
  const parsedData = useMemo(() => {
    const text = rawPastedText.trim();
    if (!text) {
      return {
        tickets: [] as TicketItem[],
        cases: [] as CaseItem[],
        isHelpdesk: false,
        totalRowsDetected: 0,
      };
    }

    const isHelpdesk = isHelpdeskTableFormat(text);
    const rows = isHelpdesk ? splitHelpdeskRows(text) : text.split(/\r?\n/).filter(Boolean);

    const detectedTickets: TicketItem[] = [];
    const detectedCases: CaseItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i].trim();
      if (!r) continue;
      const lower = r.toLowerCase();

      // Skip header rows
      if (
        lower.startsWith('#\t') ||
        lower.startsWith('datetime\t') ||
        lower.startsWith('no tiket\t') ||
        (i === 0 &&
          (lower.includes('no tiket') ||
            lower.includes('no case') ||
            lower.includes('kategori') ||
            lower.includes('tanggal')))
      ) {
        continue;
      }

      // Split columns
      let cols: string[];
      if (r.includes('\t')) {
        cols = r.split('\t');
      } else if (r.includes(';') && (r.match(/;/g) || []).length >= 2) {
        cols = r.split(';');
      } else if (r.includes(',') && (r.match(/,/g) || []).length >= 2) {
        cols = r.split(',');
      } else {
        cols = [r];
      }

      cols = cols.map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || !cols[0]) continue;

      if (isHelpdesk && cols.length >= 7) {
        // Helpdesk table format:
        // Col 1: No Tiket (e.g. "case", "N268608", "N268803")
        // Col 2: Kategori (e.g. "Problem", "Komplain")
        // Find Date columns (Open and Close Datetimes)
        const dateCandidates: { idx: number; val: string }[] = [];
        for (let c = 3; c < cols.length; c++) {
          const val = cols[c];
          if (
            /\d{1,2}\s+[a-zA-Z]+\s+\d{4}/.test(val) ||
            /\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val)
          ) {
            dateCandidates.push({ idx: c, val });
          }
        }

        const dateColIdx = dateCandidates.length > 0 ? dateCandidates[0].idx : -1;
        const openParsed = dateCandidates.length > 0
          ? parseDateTimeString(dateCandidates[0].val, year, month)
          : { date: `${year}-${padMonth}-01`, dateTime: undefined };

        const closeParsed = dateCandidates.length > 1
          ? parseDateTimeString(dateCandidates[1].val, year, month)
          : undefined;

        const date = openParsed.date;
        const startDate = openParsed.dateTime || openParsed.date;
        const endDate = closeParsed ? (closeParsed.dateTime || closeParsed.date) : undefined;

        // Action taken is the column immediately before dateColIdx (Penanganan)
        const action = dateColIdx > 3 ? cols[dateColIdx - 1] : '';

        // Columns between Kategori and Penanganan are Deskripsi & Penyebab
        const descParts: string[] = [];
        for (let c = 3; c < (dateColIdx > 3 ? dateColIdx - 1 : 4); c++) {
          if (cols[c] && cols[c].trim()) {
            descParts.push(cols[c].trim());
          }
        }
        const fullDesc = descParts.join(' — ') || 'Kendala Layanan Pelanggan';

        // Find status column from the tail (e.g. "CLOSE CASE", "CLOSE TICKET", "Open", "Pending")
        let statusColIdx = -1;
        let status = 'Closed';
        for (let c = cols.length - 1; c >= 5; c--) {
          const val = cols[c].toUpperCase();
          if (
            val.includes('CLOSE') ||
            val.includes('OPEN') ||
            val.includes('PEND') ||
            val.includes('RESOLV')
          ) {
            statusColIdx = c;
            if (val.includes('OPEN')) status = 'Open';
            else if (val.includes('PEND')) status = 'Pending';
            else if (val.includes('RESOLV')) status = 'Resolved';
            break;
          }
        }

        // Downtime is the column immediately before status column
        let downtimeMinutes = 0;
        if (statusColIdx > 0 && statusColIdx - 1 < cols.length) {
          const dtCandidate = cols[statusColIdx - 1];
          downtimeMinutes = parseDurationToMinutes(dtCandidate);
        }
        if (!downtimeMinutes && startDate && endDate) {
          downtimeMinutes = calculateMinutesBetween(startDate, endDate);
        }

        const rawNo = cols[1] || '';
        const kategori = cols[2] || '';

        // Identify if row is a downtime case or support ticket
        const isCaseRow =
          kategori.toLowerCase().includes('problem') ||
          rawNo.toLowerCase() === 'case' ||
          (statusColIdx > 0 && cols[statusColIdx].toUpperCase().includes('CASE')) ||
          downtimeMinutes > 0;

        if (isCaseRow) {
          const noCase =
            rawNo && rawNo.toLowerCase() !== 'case'
              ? rawNo
              : `CASE-${year}${padMonth}-${String(cases.length + detectedCases.length + 1).padStart(2, '0')}`;

          detectedCases.push({
            noCase,
            date,
            startDate,
            endDate,
            description: fullDesc,
            action: action || 'Perbaikan dan normalisasi link',
            downtimeMinutes: downtimeMinutes || 30,
          });
        } else {
          const noTicket =
            rawNo ||
            `TKT-${year}${padMonth}-${String(tickets.length + detectedTickets.length + 1).padStart(2, '0')}`;

          detectedTickets.push({
            noTicket,
            date,
            startDate,
            endDate,
            description: fullDesc,
            action: action || 'Penanganan oleh tim teknis',
            status,
          });
        }
      } else {
        // Standard Simple 5-column format: [No, Date, Desc, Action, StatusOrDowntime]
        const col0 = cols[0] || '';
        const rawDateCol = cols[1] || '';
        let sDate: string | undefined = undefined;
        let eDate: string | undefined = undefined;
        let baseDate = `${year}-${padMonth}-01`;

        if (rawDateCol.includes('s/d') || rawDateCol.includes(' - ')) {
          const parts = rawDateCol.split(/s\/d|\s+-\s+/);
          const p1 = parseDateTimeString(parts[0].trim(), year, month);
          const p2 = parseDateTimeString(parts[1].trim(), year, month);
          baseDate = p1.date;
          sDate = p1.dateTime || p1.date;
          eDate = p2.dateTime || p2.date;
        } else {
          const p = parseDateTimeString(rawDateCol, year, month);
          baseDate = p.date;
          sDate = p.dateTime;
        }

        const desc = cols[2] || '';
        const action = cols[3] || '';
        const col4 = cols[4] || '';

        const isDowntimeVal = /^\d+$/.test(col4.replace(/[^0-9]/g, '')) && !/[a-zA-Z]/.test(col4);
        if (col0.toLowerCase().includes('case') || isDowntimeVal) {
          let dtMins = parseDurationToMinutes(col4);
          if (!dtMins && sDate && eDate) {
            dtMins = calculateMinutesBetween(sDate, eDate);
          }
          detectedCases.push({
            noCase:
              col0 ||
              `CASE-${year}${padMonth}-${String(cases.length + detectedCases.length + 1).padStart(2, '0')}`,
            date: baseDate,
            startDate: sDate,
            endDate: eDate,
            description: desc,
            action,
            downtimeMinutes: dtMins || 30,
          });
        } else {
          let status = 'Closed';
          if (col4.toLowerCase().includes('open')) status = 'Open';
          else if (col4.toLowerCase().includes('pend')) status = 'Pending';
          else if (col4.toLowerCase().includes('resolv')) status = 'Resolved';

          detectedTickets.push({
            noTicket:
              col0 ||
              `TKT-${year}${padMonth}-${String(tickets.length + detectedTickets.length + 1).padStart(2, '0')}`,
            date: baseDate,
            startDate: sDate,
            endDate: eDate,
            description: desc,
            action,
            status,
          });
        }
      }
    }

    return {
      tickets: detectedTickets,
      cases: detectedCases,
      isHelpdesk,
      totalRowsDetected: detectedTickets.length + detectedCases.length,
    };
  }, [rawPastedText, year, month, padMonth, tickets.length, cases.length]);

  // Target items to be imported based on modal mode
  const activeImportItems = importMode === 'tickets' ? parsedData.tickets : parsedData.cases;
  const crossImportItems = importMode === 'tickets' ? parsedData.cases : parsedData.tickets;

  const handleApplyImport = () => {
    if (activeImportItems.length === 0 && crossImportItems.length === 0) {
      toast.error('Tidak ada baris data valid yang terdeteksi.');
      return;
    }

    if (importMode === 'tickets') {
      // 1. Update Tickets
      if (parsedData.tickets.length > 0) {
        if (importActionType === 'replace') {
          setTickets(parsedData.tickets);
        } else {
          setTickets([...tickets, ...parsedData.tickets]);
        }
      }

      // 2. Cross-sync Cases if detected and checked
      if (alsoSyncCrossData && parsedData.cases.length > 0) {
        if (importActionType === 'replace') {
          setCases(parsedData.cases);
        } else {
          setCases([...cases, ...parsedData.cases]);
        }
        toast.success(
          `Berhasil mengimpor ${parsedData.tickets.length} tiket & ${parsedData.cases.length} kasus downtime!`
        );
      } else {
        toast.success(`Berhasil mengimpor ${parsedData.tickets.length} tiket support!`);
      }
    } else if (importMode === 'cases') {
      // 1. Update Cases
      if (parsedData.cases.length > 0) {
        if (importActionType === 'replace') {
          setCases(parsedData.cases);
        } else {
          setCases([...cases, ...parsedData.cases]);
        }
      }

      // 2. Cross-sync Tickets if detected and checked
      if (alsoSyncCrossData && parsedData.tickets.length > 0) {
        if (importActionType === 'replace') {
          setTickets(parsedData.tickets);
        } else {
          setTickets([...tickets, ...parsedData.tickets]);
        }
        toast.success(
          `Berhasil mengimpor ${parsedData.cases.length} kasus downtime & ${parsedData.tickets.length} tiket!`
        );
      } else {
        toast.success(`Berhasil mengimpor ${parsedData.cases.length} kasus downtime!`);
      }
    }

    setImportMode(null);
    setRawPastedText('');
  };

  // Sample data: Exact Helpdesk table format provided by user
  const handleFillSample = () => {
    setRawPastedText(
      `#\tNo Tiket\tKategori\tDeskripsi\tPenyebab\tPenanganan\tOpen\tClose\tDurasi Penanganan\tDurasi Downtime\tStatus\t###\n` +
        `Datetime\tUser\tDatetime\tUser\n` +
        `1\tcase\tProblem\tLink FO LOS - Binus University\tKabel FO putus imbas penggalian iforte.\tDilakukan join ulang dan pindah sambungan dari roset ke closure oleh tim terkait.\t19 October 2026 14:45 WIB\tPriyo Ardi Nugroho\t19 October 2026 22:12 WIB\tImanuel Dimas Cahyo Kumoro\t7 jam 27 menit\t07:02:00\tCLOSE CASE\t\n` +
        `2\tN268608\tKomplain\tKoneksi internet tidak dapat digunakan\tKendala kabel FO putus imbas penggalian iforte.\tDilakukan join ulang dan pindah sambungan dari roset ke closure oleh tim terkait.\t19 October 2026 15:04 WIB\tFajar Juliantono\t19 October 2026 23:59 WIB\tImanuel Dimas Cahyo Kumoro\t8 jam 54 menit\t-\tCLOSE TICKET\t\n` +
        `3\tN268803\tKomplain\tKendala akses ke arah website binus (binusmaya, lms, dan lain-lain)\tKendala link FO unstable\tDilakukan reroute main link FO menggunakan link FO Nexa\t26 October 2026 08:21 WIB\tLouis Bayu Krisna Redionando\t27 October 2026 16:55 WIB\tFajar Juliantono\t32 jam 33 menit\t-\tCLOSE TICKET\t\n` +
        `4\tN268862\tKomplain\tKoneksi terpantau sempat down dari arah Jakarta\tBelum ditemukan issue kendala\tDIlakukan pengecekan sisi link, trafik pemakaian dan routing terpantau normal\t27 October 2026 11:44 WIB\tFajar Juliantono\t27 October 2026 14:52 WIB\tFajar Juliantono\t3 jam 7 menit\t-\tCLOSE TICKET\t`
    );
  };

  return (
    <div className="space-y-4">
      {/* SLA Live Calculation Summary Card */}
      <div className="bg-slate-900 text-white rounded-lg p-4 sm:p-5 shadow-xs border border-slate-800">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-[#EA580C]/20 text-[#EA580C] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-heading font-semibold text-sm text-white">
                Realtime SLA Calculation
              </h4>
              <p className="text-[11px] text-slate-400 font-sans">
                Computed automatically from incident cases
              </p>
            </div>
          </div>
          <span
            suppressHydrationWarning
            className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded-md text-slate-300 tabular-nums"
          >
            {new Intl.NumberFormat('en-US').format(slaResult.totalMinutesInMonth)} Mins/Month
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="bg-slate-800/80 rounded-md p-2.5 border border-slate-700/60">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Online %
            </div>
            <div
              className={`text-lg font-semibold mt-0.5 tabular-nums ${
                slaResult.onlinePercent >= targetSla ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {slaResult.onlinePercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-md p-2.5 border border-slate-700/60">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Downtime %
            </div>
            <div className="text-lg font-semibold text-rose-400 mt-0.5 tabular-nums">
              {slaResult.downtimePercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-md p-2.5 border border-slate-700/60">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Availability %
            </div>
            <div className="text-lg font-semibold text-blue-400 mt-0.5 tabular-nums">
              {slaResult.availabilityPercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-md p-2.5 border border-slate-700/60">
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              Downtime Duration
            </div>
            <div className="text-xs font-semibold text-slate-200 mt-1 tabular-nums truncate">
              {slaResult.downtimeDurationStr}
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 1. Support Tickets Management Card                   */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Header: Title and Always-Aligned Action Toolbar (Never Stacks) */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
              <h4 className="font-heading font-semibold text-slate-900 text-sm truncate">
                Support Tickets
              </h4>
              <Badge
                variant="outline"
                className="text-[11px] font-medium py-0 px-2 text-slate-600 bg-slate-50 tabular-nums shrink-0"
              >
                {tickets.length} Tiket
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5 truncate">
              Customer service requests recorded during billing cycle
            </p>
          </div>

          {/* Action buttons: shrink-0 so they never break onto a second line */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Batch Paste from Excel */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportMode('tickets');
                setRawPastedText('');
                setImportActionType('append');
                setAlsoSyncCrossData(true);
              }}
              title="Salin dan tempel baris data dari Excel / Sistem Helpdesk"
              className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
              <span>Paste Excel</span>
            </Button>

            {/* Split Button: Add Ticket with Multi-Add Dropdown */}
            <div className="inline-flex rounded-lg shadow-2xs">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddTicket(1)}
                className="h-8 px-2.5 text-xs font-medium rounded-r-none border-r-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-[#EA580C] shrink-0" />
                <span>Tiket</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 px-1.5 rounded-l-none text-slate-500 hover:text-slate-700"
                    title="Tambah banyak tiket sekaligus"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => handleAddTicket(3)} className="text-xs">
                    <Layers className="w-3.5 h-3.5 mr-2 text-blue-500" />
                    <span>+ 3 Tiket Sekaligus</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddTicket(5)} className="text-xs">
                    <Layers className="w-3.5 h-3.5 mr-2 text-blue-500" />
                    <span>+ 5 Tiket Sekaligus</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddTicket(10)} className="text-xs">
                    <Layers className="w-3.5 h-3.5 mr-2 text-blue-500" />
                    <span>+ 10 Tiket Sekaligus</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clear All if items exist */}
            {tickets.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear('tickets')}
                className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Kosongkan seluruh daftar tiket"
              >
                Kosongkan
              </Button>
            )}
          </div>
        </div>

        {/* List of Tickets / Empty State */}
        {tickets.length === 0 ? (
          <div className="flex items-center justify-between p-3.5 bg-slate-50/80 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Tidak ada tiket customer service pada periode ini.</span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Klik <strong>+ Tiket</strong> atau <strong>Paste Excel</strong> untuk mengisi data
            </span>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-3.5 space-y-2.5 transition"
              >
                {/* Baris 1: Nomor, Tanggal, Status, & Tombol Hapus */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-[150px] max-w-xs">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      No. Tiket
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={t.noTicket}
                      onChange={(e) => handleUpdateTicket(idx, 'noTicket', e.target.value)}
                      className="text-xs font-medium"
                      placeholder={`TKT-${year}${padMonth}-01`}
                    />
                  </div>

                  <div className="w-36 shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      Start (Tgl & Jam)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={t.startDate || t.date}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateTicket(idx, 'startDate', val);
                        const dateOnly = val.split(' ')[0] || val;
                        handleUpdateTicket(idx, 'date', dateOnly);
                      }}
                      className="text-xs tabular-nums"
                      placeholder="YYYY-MM-DD HH:mm"
                    />
                  </div>

                  <div className="w-36 shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      End (Tgl & Jam)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={t.endDate || ''}
                      onChange={(e) => handleUpdateTicket(idx, 'endDate', e.target.value)}
                      className="text-xs tabular-nums"
                      placeholder="YYYY-MM-DD HH:mm"
                    />
                  </div>

                  <div className="w-36 shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      Status
                    </span>
                    <Select
                      value={t.status}
                      onValueChange={(val) => handleUpdateTicket(idx, 'status', val)}
                    >
                      <SelectTrigger selectSize="sm" className="text-xs font-medium px-2.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              t.status === 'Closed'
                                ? 'bg-emerald-500'
                                : t.status === 'Resolved'
                                ? 'bg-blue-500'
                                : t.status === 'Pending'
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                          />
                          <SelectValue placeholder="Status" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Closed">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span>Closed</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Resolved">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>Resolved</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Pending">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            <span>Pending</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="Open">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            <span>Open</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="ml-auto pt-4 sm:pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteTicket(idx)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Hapus Tiket Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Baris 2: Deskripsi & Tindakan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-medium text-slate-500 block mb-1">
                      Deskripsi Kendala (Customer Request / Issue)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={t.description}
                      onChange={(e) => handleUpdateTicket(idx, 'description', e.target.value)}
                      placeholder="Contoh: Link flapping pada interface Gi0/0/1"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-slate-500 block mb-1">
                      Tindakan Penyelesaian (Action Taken)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={t.action}
                      onChange={(e) => handleUpdateTicket(idx, 'action', e.target.value)}
                      placeholder="Contoh: Pembersihan patchcord & restart port switch"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. Downtime Incident Cases Management Card           */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Header: Title and Always-Aligned Action Toolbar (Never Stacks) */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
              <h4 className="font-heading font-semibold text-slate-900 text-sm truncate">
                Downtime Incident Cases
              </h4>
              <Badge
                variant="outline"
                className="text-[11px] font-medium py-0 px-2 text-rose-600 bg-rose-50 border-rose-200 tabular-nums shrink-0"
              >
                {cases.length > 0 ? `${cases.length} Kasus (${slaResult.totalDowntimeMinutes} Mnt)` : '0 Kasus'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5 truncate">
              Service interruptions affecting monthly availability and SLA
            </p>
          </div>

          {/* Action buttons: shrink-0 so they never break onto a second line */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Batch Paste from Excel */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportMode('cases');
                setRawPastedText('');
                setImportActionType('append');
                setAlsoSyncCrossData(true);
              }}
              title="Salin dan tempel baris data gangguan dari Excel / Sistem Helpdesk"
              className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:text-slate-900"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
              <span>Paste Excel</span>
            </Button>

            {/* Split Button: Add Case with Multi-Add Dropdown */}
            <div className="inline-flex rounded-lg shadow-2xs">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddCase(1)}
                className="h-8 px-2.5 text-xs font-medium rounded-r-none border-r-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1 text-[#EA580C] shrink-0" />
                <span>Kasus</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 px-1.5 rounded-l-none text-slate-500 hover:text-slate-700"
                    title="Tambah banyak kasus gangguan sekaligus"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => handleAddCase(3)} className="text-xs">
                    <Layers className="w-3.5 h-3.5 mr-2 text-rose-500" />
                    <span>+ 3 Kasus Sekaligus</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddCase(5)} className="text-xs">
                    <Layers className="w-3.5 h-3.5 mr-2 text-rose-500" />
                    <span>+ 5 Kasus Sekaligus</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleAddCase(10)} className="text-xs">
                    <Layers className="w-3.5 h-3.5 mr-2 text-rose-500" />
                    <span>+ 10 Kasus Sekaligus</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Clear All if items exist */}
            {cases.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirmClear('cases')}
                className="h-8 px-2 text-xs text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                title="Kosongkan seluruh daftar kasus downtime"
              >
                Kosongkan
              </Button>
            )}
          </div>
        </div>

        {/* List of Cases / Empty State */}
        {cases.length === 0 ? (
          <div className="flex items-center justify-between p-3.5 bg-emerald-50/70 border border-dashed border-emerald-200 rounded-lg text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Nol gangguan tercatat pada periode ini. Pencapaian <strong>100.00% uptime</strong>.</span>
            </div>
            <Badge
              variant="outline"
              className="text-[11px] font-semibold bg-emerald-100/70 text-emerald-700 border-emerald-300 shrink-0 hidden sm:inline-flex"
            >
              Uptime 100%
            </Badge>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-3.5 space-y-2.5 transition"
              >
                {/* Baris 1: Nomor Kasus, Tanggal, Durasi Downtime, & Tombol Hapus */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                  </div>

                  <div className="flex-1 min-w-[150px] max-w-xs">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      No. Kasus
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={c.noCase}
                      onChange={(e) => handleUpdateCase(idx, 'noCase', e.target.value)}
                      className="text-xs font-medium"
                      placeholder={`CASE-${year}${padMonth}-01`}
                    />
                  </div>

                  <div className="w-36 shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      Start (Tgl & Jam)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={c.startDate || c.date}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateCase(idx, 'startDate', val);
                        const dateOnly = val.split(' ')[0] || val;
                        handleUpdateCase(idx, 'date', dateOnly);
                        if (c.endDate) {
                          const autoM = calculateMinutesBetween(val, c.endDate);
                          if (autoM > 0) handleUpdateCase(idx, 'downtimeMinutes', autoM);
                        }
                      }}
                      className="text-xs tabular-nums"
                      placeholder="YYYY-MM-DD HH:mm"
                    />
                  </div>

                  <div className="w-36 shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      End (Tgl & Jam)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={c.endDate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateCase(idx, 'endDate', val);
                        const start = c.startDate || c.date;
                        if (start) {
                          const autoM = calculateMinutesBetween(start, val);
                          if (autoM > 0) handleUpdateCase(idx, 'downtimeMinutes', autoM);
                        }
                      }}
                      className="text-xs tabular-nums"
                      placeholder="YYYY-MM-DD HH:mm"
                    />
                  </div>

                  <div className="w-32 shrink-0">
                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider block mb-1">
                      Downtime
                    </span>
                    <div className="relative">
                      <Input
                        inputSize="sm"
                        type="number"
                        min="0"
                        value={c.downtimeMinutes}
                        onChange={(e) =>
                          handleUpdateCase(
                            idx,
                            'downtimeMinutes',
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        className="text-xs font-semibold text-rose-600 pr-11 tabular-nums"
                        placeholder="30"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 pointer-events-none">
                        Mnt
                      </span>
                    </div>
                  </div>

                  <div className="ml-auto pt-4 sm:pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDeleteCase(idx)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Hapus Kasus Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Baris 2: Deskripsi Masalah & Solusi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] font-medium text-slate-500 block mb-1">
                      Penyebab Gangguan (Root Cause)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={c.description}
                      onChange={(e) => handleUpdateCase(idx, 'description', e.target.value)}
                      placeholder="Contoh: Kabel fiber optik putus KM 12 akibat galian PLN"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-slate-500 block mb-1">
                      Tindakan Penyelesaian (Resolution)
                    </span>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={c.action}
                      onChange={(e) => handleUpdateCase(idx, 'action', e.target.value)}
                      placeholder="Contoh: Splicing core 1-4 & pengukuran OTDR normal"
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Dialog: Universal Smart Paste dari Excel / Helpdesk  */}
      {/* ---------------------------------------------------- */}
      <Dialog open={importMode !== null} onOpenChange={(open) => !open && setImportMode(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 text-base">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>
                Paste Data dari Excel (
                {importMode === 'tickets' ? 'Support Tickets' : 'Downtime Incident Cases'})
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Mendukung salinan langsung dari <strong>Sistem Aplikasi Tiket/Helpdesk</strong> maupun spreadsheet Excel standar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Intelligent Format Banner */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5 text-[#EA580C]" />
                  Auto-Detect Format Helpdesk & Spreadsheet
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFillSample}
                  className="h-6 text-[11px] text-[#EA580C] hover:text-[#C2410C] px-2 font-medium"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Gunakan Contoh Tabel Helpdesk
                </Button>
              </div>

              {parsedData.isHelpdesk ? (
                <div className="bg-blue-50/80 border border-blue-200 rounded p-2 text-[11px] text-blue-900 space-y-1">
                  <div className="font-semibold flex items-center gap-1 text-blue-800">
                    <Info className="w-3.5 h-3.5" />
                    <span>Format Tabel Aplikasi Tiket/Helpdesk Dikenali Otomatis!</span>
                  </div>
                  <p className="text-blue-700 leading-relaxed font-sans">
                    Kolom otomatis dipetakan: <strong>No Tiket</strong> &bull; <strong>Open Datetime</strong> &rarr; Tanggal &bull; <strong>Deskripsi/Penyebab</strong> &bull; <strong>Penanganan</strong> &rarr; Solusi &bull; <strong>Durasi Downtime</strong> ({`"07:02:00"`} &rarr; 422 menit).
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/80 leading-relaxed font-sans">
                  {importMode === 'tickets' ? (
                    <span>
                      Urutan standar: <strong>[No Tiket]</strong> &bull; <strong>[Tanggal]</strong> &bull;{' '}
                      <strong>[Deskripsi]</strong> &bull; <strong>[Penanganan]</strong> &bull;{' '}
                      <strong>[Status]</strong> (Atau paste langsung seluruh tabel helpdesk).
                    </span>
                  ) : (
                    <span>
                      Urutan standar: <strong>[No Kasus]</strong> &bull; <strong>[Tanggal]</strong> &bull;{' '}
                      <strong>[Penyebab]</strong> &bull; <strong>[Penanganan]</strong> &bull;{' '}
                      <strong>[Downtime Menit/hh:mm:ss]</strong>.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Textarea for pasting */}
            <div>
              <Textarea
                rows={6}
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                placeholder={
                  importMode === 'tickets'
                    ? `Tempel tabel helpdesk atau baris Excel di sini (Ctrl+V)...\nSistem akan otomatis membaca kolom No Tiket, Tanggal Open, Deskripsi, Penanganan, dan Status.`
                    : `Tempel tabel helpdesk atau baris Excel di sini (Ctrl+V)...\nSistem akan otomatis membaca No Kasus, Tanggal, Penyebab, Penanganan, dan Durasi Downtime (format 07:02:00 otomatis dikonversi ke menit).`
                }
                className="text-xs font-sans leading-relaxed"
              />
            </div>

            {/* Live Preview Summary & Auto-Classification */}
            {rawPastedText.trim() && (
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        Terbaca{' '}
                        <strong>{activeImportItems.length}</strong>{' '}
                        {importMode === 'tickets' ? 'Tiket Support' : 'Kasus Gangguan'}
                      </span>
                    </span>

                    {/* Notification about cross-detected items */}
                    {parsedData.isHelpdesk && crossImportItems.length > 0 && (
                      <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        ({crossImportItems.length}{' '}
                        {importMode === 'tickets' ? 'Kasus Problem disaring' : 'Tiket Komplain disaring'})
                      </span>
                    )}
                  </div>

                  {/* Mode: Append or Replace */}
                  <SegmentedControl<'append' | 'replace'>
                    size="sm"
                    value={importActionType}
                    onChange={(val) => setImportActionType(val)}
                    options={[
                      { value: 'append', label: 'Tambahkan' },
                      { value: 'replace', label: 'Ganti Semua' },
                    ]}
                  />
                </div>

                {/* Cross-sync Option Checkbox if both tickets & cases exist in the pasted table */}
                {parsedData.isHelpdesk && crossImportItems.length > 0 && (
                  <div className="flex items-center gap-2 p-2 bg-orange-50/70 border border-orange-200/80 rounded-md text-xs text-orange-900">
                    <Checkbox
                      id="syncCrossData"
                      checked={alsoSyncCrossData}
                      onCheckedChange={(checked) => setAlsoSyncCrossData(Boolean(checked))}
                    />
                    <label
                      htmlFor="syncCrossData"
                      className="cursor-pointer text-[11px] font-medium select-none flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span>
                        Sekaligus simpan juga{' '}
                        <strong>
                          {crossImportItems.length}{' '}
                          {importMode === 'tickets' ? 'Kasus Gangguan' : 'Tiket Support'}
                        </strong>{' '}
                        ke tabel{' '}
                        <strong>
                          {importMode === 'tickets'
                            ? 'Downtime Incident Cases'
                            : 'Support Tickets'}
                        </strong>
                      </span>
                    </label>
                  </div>
                )}

                {/* Table Preview of parsed rows */}
                <div className="max-h-40 overflow-auto border border-slate-200 rounded-md text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-1.5 border-b border-slate-200">
                          {importMode === 'tickets' ? 'No. Tiket' : 'No. Kasus'}
                        </th>
                        <th className="p-1.5 border-b border-slate-200">Tanggal</th>
                        <th className="p-1.5 border-b border-slate-200">
                          {importMode === 'tickets' ? 'Deskripsi Kendala' : 'Penyebab Gangguan'}
                        </th>
                        <th className="p-1.5 border-b border-slate-200">Penanganan / Solusi</th>
                        <th className="p-1.5 border-b border-slate-200">
                          {importMode === 'tickets' ? 'Status' : 'Downtime'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importMode === 'tickets'
                        ? parsedData.tickets.slice(0, 5).map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-1.5 font-semibold text-slate-900 whitespace-nowrap">
                                {item.noTicket}
                              </td>
                              <td className="p-1.5 text-slate-600 whitespace-nowrap tabular-nums">
                                {item.date}
                              </td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[140px]" title={item.description}>
                                {item.description || '-'}
                              </td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[140px]" title={item.action}>
                                {item.action || '-'}
                              </td>
                              <td className="p-1.5 font-medium text-emerald-700 whitespace-nowrap">
                                {item.status}
                              </td>
                            </tr>
                          ))
                        : parsedData.cases.slice(0, 5).map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-1.5 font-semibold text-slate-900 whitespace-nowrap">
                                {item.noCase}
                              </td>
                              <td className="p-1.5 text-slate-600 whitespace-nowrap tabular-nums">
                                {item.date}
                              </td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[140px]" title={item.description}>
                                {item.description || '-'}
                              </td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[140px]" title={item.action}>
                                {item.action || '-'}
                              </td>
                              <td className="p-1.5 font-semibold text-rose-600 whitespace-nowrap tabular-nums">
                                {item.downtimeMinutes} Mnt
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setImportMode(null)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApplyImport}
              disabled={activeImportItems.length === 0 && crossImportItems.length === 0}
              className="text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>
                Terapkan Data (
                {activeImportItems.length}{' '}
                {importMode === 'tickets' ? 'Tiket' : 'Kasus'}
                {parsedData.isHelpdesk && alsoSyncCrossData && crossImportItems.length > 0
                  ? ` + ${crossImportItems.length} ${importMode === 'tickets' ? 'Kasus' : 'Tiket'}`
                  : ''}
                )
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------- */}
      {/* ConfirmDialog: Kosongkan Seluruh Data                 */}
      {/* ---------------------------------------------------- */}
      <ConfirmDialog
        open={confirmClear !== null}
        onOpenChange={(open) => !open && setConfirmClear(null)}
        title={confirmClear === 'tickets' ? 'Kosongkan Seluruh Tiket?' : 'Kosongkan Seluruh Kasus?'}
        description={
          confirmClear === 'tickets'
            ? 'Apakah Anda yakin ingin menghapus seluruh tiket support pada periode ini? Aksi ini tidak dapat dibatalkan.'
            : 'Apakah Anda yakin ingin menghapus seluruh kasus downtime pada periode ini? Persentase uptime akan kembali menjadi 100.00%.'
        }
        confirmText="Ya, Kosongkan"
        cancelText="Batal"
        variant="destructive"
        onConfirm={confirmClear === 'tickets' ? handleClearAllTickets : handleClearAllCases}
      />
    </div>
  );
}
