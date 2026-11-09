'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { TicketItem, CaseItem, calculateSla } from '@/lib/sla-calculator';
import {
  Button,
  Input,
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
  // Intelligent Spreadsheet / CSV Parsers
  // ----------------------------------------------------
  const parseTickets = (text: string): TicketItem[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: TicketItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      // Skip header row if user copied headers from Excel
      if (
        i === 0 &&
        (lower.includes('ticket') ||
          lower.includes('tiket') ||
          lower.includes('date') ||
          lower.includes('tanggal') ||
          lower.includes('desc') ||
          lower.includes('action'))
      ) {
        continue;
      }

      let cols: string[];
      if (line.includes('\t')) {
        cols = line.split('\t');
      } else if (line.includes(';') && (line.match(/;/g) || []).length >= 2) {
        cols = line.split(';');
      } else if (line.includes(',') && (line.match(/,/g) || []).length >= 2) {
        cols = line.split(',');
      } else {
        cols = [line];
      }

      cols = cols.map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || !cols[0]) continue;

      const noTicket =
        cols[0] || `TKT-${year}${padMonth}-${String(tickets.length + parsed.length + 1).padStart(2, '0')}`;
      const date = cols[1] || `${year}-${padMonth}-01`;
      const description = cols[2] || '';
      const action = cols[3] || '';

      const rawStatus = (cols[4] || 'Closed').toLowerCase();
      let status = 'Closed';
      if (rawStatus.includes('open')) status = 'Open';
      else if (rawStatus.includes('pend')) status = 'Pending';
      else if (rawStatus.includes('resolv')) status = 'Resolved';

      parsed.push({
        noTicket,
        date,
        description,
        action,
        status,
      });
    }

    return parsed;
  };

  const parseCases = (text: string): CaseItem[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed: CaseItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      // Skip header row
      if (
        i === 0 &&
        (lower.includes('case') ||
          lower.includes('kasus') ||
          lower.includes('date') ||
          lower.includes('tanggal') ||
          lower.includes('downtime') ||
          lower.includes('penyebab'))
      ) {
        continue;
      }

      let cols: string[];
      if (line.includes('\t')) {
        cols = line.split('\t');
      } else if (line.includes(';') && (line.match(/;/g) || []).length >= 2) {
        cols = line.split(';');
      } else if (line.includes(',') && (line.match(/,/g) || []).length >= 2) {
        cols = line.split(',');
      } else {
        cols = [line];
      }

      cols = cols.map((c) => c.trim().replace(/^["']|["']$/g, ''));
      if (cols.length === 0 || !cols[0]) continue;

      const noCase =
        cols[0] || `CASE-${year}${padMonth}-${String(cases.length + parsed.length + 1).padStart(2, '0')}`;
      const date = cols[1] || `${year}-${padMonth}-01`;
      const description = cols[2] || '';
      const action = cols[3] || '';

      const rawMins = cols[4] ? cols[4].replace(/[^0-9]/g, '') : '30';
      const downtimeMinutes = parseInt(rawMins, 10) || 0;

      parsed.push({
        noCase,
        date,
        description,
        action,
        downtimeMinutes,
      });
    }

    return parsed;
  };

  // Preview data for current pasted content
  const parsedTicketsPreview = importMode === 'tickets' ? parseTickets(rawPastedText) : [];
  const parsedCasesPreview = importMode === 'cases' ? parseCases(rawPastedText) : [];

  const handleApplyImport = () => {
    if (importMode === 'tickets') {
      const parsed = parseTickets(rawPastedText);
      if (parsed.length === 0) {
        toast.error('Tidak ada baris data tiket valid yang dapat diimpor.');
        return;
      }
      if (importActionType === 'replace') {
        setTickets(parsed);
      } else {
        setTickets([...tickets, ...parsed]);
      }
      toast.success(`Berhasil mengimpor ${parsed.length} tiket!`);
    } else if (importMode === 'cases') {
      const parsed = parseCases(rawPastedText);
      if (parsed.length === 0) {
        toast.error('Tidak ada baris data kasus downtime valid yang dapat diimpor.');
        return;
      }
      if (importActionType === 'replace') {
        setCases(parsed);
      } else {
        setCases([...cases, ...parsed]);
      }
      toast.success(`Berhasil mengimpor ${parsed.length} kasus downtime!`);
    }

    setImportMode(null);
    setRawPastedText('');
  };

  const handleFillSample = () => {
    if (importMode === 'tickets') {
      setRawPastedText(
        `TKT-${year}${padMonth}-01\t${year}-${padMonth}-02\tFiber optic link flapping pada POP\tPembersihan patchcord dan SFP\tClosed\n` +
          `TKT-${year}${padMonth}-02\t${year}-${padMonth}-08\tHigh packet loss peering IXP\tPenyesuaian routing BGP\tResolved\n` +
          `TKT-${year}${padMonth}-03\t${year}-${padMonth}-15\tPermintaan pengecekan bandwidth grafik\tVerifikasi utilisasi normal\tClosed`
      );
    } else if (importMode === 'cases') {
      setRawPastedText(
        `CASE-${year}${padMonth}-01\t${year}-${padMonth}-04\tKabel FO putus KM 14 akibat galian\tSplicing core 1-4 dan proteksi tray\t45\n` +
          `CASE-${year}${padMonth}-02\t${year}-${padMonth}-18\tGangguan catuan daya PLN di BTS\tGenset otomatis aktif normal\t20`
      );
    }
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
      {/* 1. Support Tickets Management Card */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Header with Title and Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Support Tickets</span>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                ({tickets.length > 0 ? `${tickets.length} Tiket` : '0 Tiket'})
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Customer service requests recorded during billing cycle
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Batch Paste from Excel */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportMode('tickets');
                setRawPastedText('');
                setImportActionType('append');
              }}
              title="Salin dan tempel baris data dari Excel / Spreadsheet sekaligus"
              className="text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span>Paste dari Excel</span>
            </Button>

            {/* Split Button: Add Single or Multiple */}
            <div className="flex items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddTicket(1)}
                className="rounded-r-none border-r-0 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Ticket</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-l-none px-1.5"
                    title="Tambah banyak tiket sekaligus"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
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
                className="text-xs text-slate-400 hover:text-rose-600 px-2"
                title="Kosongkan seluruh daftar tiket"
              >
                Kosongkan
              </Button>
            )}
          </div>
        </div>

        {/* List of Tickets */}
        {tickets.length === 0 ? (
          <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Tidak ada tiket customer service pada periode ini. Klik <strong>Add Ticket</strong> atau <strong>Paste dari Excel</strong> untuk menambahkan.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-3.5 space-y-2.5 transition shadow-2xs"
              >
                {/* Baris 1: Nomor, Tanggal, Status, & Tombol Hapus */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  {/* Sequence Badge */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-6 h-6 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                  </div>

                  {/* No Ticket */}
                  <div className="flex-1 min-w-[150px] max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        No. Tiket
                      </span>
                    </div>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={t.noTicket}
                      onChange={(e) => handleUpdateTicket(idx, 'noTicket', e.target.value)}
                      className="text-xs font-medium"
                      placeholder={`TKT-${year}${padMonth}-01`}
                    />
                  </div>

                  {/* Date */}
                  <div className="w-36 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Tanggal
                      </span>
                    </div>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={t.date}
                      onChange={(e) => handleUpdateTicket(idx, 'date', e.target.value)}
                      className="text-xs tabular-nums"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  {/* Status Dropdown */}
                  <div className="w-36 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Status
                      </span>
                    </div>
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

                  {/* Delete Action */}
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

                {/* Baris 2: Deskripsi Masalah & Solusi (Luas, Lapang, Tidak Terpotong) */}
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
      {/* 2. Downtime Incident Cases Management Card */}
      {/* ---------------------------------------------------- */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
        {/* Header with Title and Action Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span>Downtime Incident Cases</span>
              <span className="text-xs font-medium text-rose-600 tabular-nums">
                ({cases.length > 0 ? `${cases.length} Kasus (${slaResult.totalDowntimeMinutes} Menit)` : '0 Gangguan'})
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-sans mt-0.5">
              Service interruptions affecting monthly availability and SLA percentage
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Batch Paste from Excel */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setImportMode('cases');
                setRawPastedText('');
                setImportActionType('append');
              }}
              title="Salin dan tempel baris data gangguan dari Excel / Spreadsheet sekaligus"
              className="text-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              <span>Paste dari Excel</span>
            </Button>

            {/* Split Button: Add Single or Multiple */}
            <div className="flex items-center">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleAddCase(1)}
                className="rounded-r-none border-r-0 text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>Add Case</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-l-none px-1.5"
                    title="Tambah banyak kasus gangguan sekaligus"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
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
                className="text-xs text-slate-400 hover:text-rose-600 px-2"
                title="Kosongkan seluruh daftar kasus downtime"
              >
                Kosongkan
              </Button>
            )}
          </div>
        </div>

        {/* List of Cases */}
        {cases.length === 0 ? (
          <div className="p-6 bg-emerald-50 border border-dashed border-emerald-200 rounded-lg text-center text-xs text-emerald-800 flex flex-col sm:flex-row items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Nol gangguan tercatat pada periode ini. Pencapaian <strong>100.00% uptime</strong>.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {cases.map((c, idx) => (
              <div
                key={idx}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-3.5 space-y-2.5 transition shadow-2xs"
              >
                {/* Baris 1: Nomor Kasus, Tanggal, Durasi Downtime, & Tombol Hapus */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  {/* Sequence Badge */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="w-6 h-6 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                  </div>

                  {/* No Case */}
                  <div className="flex-1 min-w-[150px] max-w-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        No. Kasus
                      </span>
                    </div>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={c.noCase}
                      onChange={(e) => handleUpdateCase(idx, 'noCase', e.target.value)}
                      className="text-xs font-medium"
                      placeholder={`CASE-${year}${padMonth}-01`}
                    />
                  </div>

                  {/* Date */}
                  <div className="w-36 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Tanggal
                      </span>
                    </div>
                    <Input
                      inputSize="sm"
                      type="text"
                      value={c.date}
                      onChange={(e) => handleUpdateCase(idx, 'date', e.target.value)}
                      className="text-xs tabular-nums"
                      placeholder="YYYY-MM-DD"
                    />
                  </div>

                  {/* Downtime Minutes (Spacious with Unit Label - NEVER Cut Off) */}
                  <div className="w-32 shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        Downtime
                      </span>
                    </div>
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

                  {/* Delete Action */}
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

                {/* Baris 2: Deskripsi Masalah & Solusi (Luas, Lapang, Tidak Terpotong) */}
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
      {/* Dialog: Batch Paste dari Excel / Spreadsheet         */}
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
              Salin beberapa baris langsung dari Microsoft Excel atau Google Sheets, lalu tempelkan (Ctrl+V) di area bawah ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            {/* Format Instructions Banner */}
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5 text-[#EA580C]" />
                  Urutan Kolom yang Diharapkan:
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleFillSample}
                  className="h-6 text-[11px] text-[#EA580C] hover:text-[#C2410C] px-2"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Gunakan Contoh Data
                </Button>
              </div>
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200/80 leading-relaxed font-sans">
                {importMode === 'tickets' ? (
                  <span>
                    <strong>[No Tiket]</strong> &bull; <strong>[Tanggal]</strong> &bull;{' '}
                    <strong>[Deskripsi Kendala]</strong> &bull; <strong>[Tindakan]</strong> &bull;{' '}
                    <strong>[Status (Closed/Resolved/Pending/Open)]</strong>
                  </span>
                ) : (
                  <span>
                    <strong>[No Kasus]</strong> &bull; <strong>[Tanggal]</strong> &bull;{' '}
                    <strong>[Penyebab Gangguan]</strong> &bull; <strong>[Tindakan]</strong> &bull;{' '}
                    <strong>[Durasi Downtime (Menit)]</strong>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                Pemisah kolom otomatis terdeteksi (Tab Excel, Koma CSV, atau Titik Koma). Baris judul/header akan otomatis dilewati.
              </p>
            </div>

            {/* Textarea for pasting */}
            <div>
              <Textarea
                rows={6}
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                placeholder={
                  importMode === 'tickets'
                    ? `Tempel baris data tiket dari Excel di sini...\nContoh:\nTKT-${year}${padMonth}-01\t${year}-${padMonth}-02\tFiber flapping\tGanti patchcord\tClosed`
                    : `Tempel baris data gangguan dari Excel di sini...\nContoh:\nCASE-${year}${padMonth}-01\t${year}-${padMonth}-04\tFO Cut KM 14\tSplicing core\t45`
                }
                className="text-xs font-sans"
              />
            </div>

            {/* Live Preview Summary */}
            {rawPastedText.trim() && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Terdeteksi{' '}
                      <strong>
                        {importMode === 'tickets'
                          ? parsedTicketsPreview.length
                          : parsedCasesPreview.length}
                      </strong>{' '}
                      baris data valid
                    </span>
                  </span>

                  {/* Mode: Append or Replace */}
                  <SegmentedControl<'append' | 'replace'>
                    size="sm"
                    value={importActionType}
                    onChange={(val) => setImportActionType(val)}
                    options={[
                      { value: 'append', label: 'Tambahkan (Append)' },
                      { value: 'replace', label: 'Ganti Semua (Replace)' },
                    ]}
                  />
                </div>

                {/* Table Preview of first 3 rows */}
                <div className="max-h-36 overflow-auto border border-slate-200 rounded-md text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="p-1.5 border-b border-slate-200">No</th>
                        <th className="p-1.5 border-b border-slate-200">Tanggal</th>
                        <th className="p-1.5 border-b border-slate-200">Deskripsi</th>
                        <th className="p-1.5 border-b border-slate-200">Tindakan</th>
                        <th className="p-1.5 border-b border-slate-200">
                          {importMode === 'tickets' ? 'Status' : 'Downtime'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importMode === 'tickets'
                        ? parsedTicketsPreview.slice(0, 4).map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-1.5 font-medium text-slate-900">{item.noTicket}</td>
                              <td className="p-1.5 text-slate-600">{item.date}</td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[120px]">
                                {item.description || '-'}
                              </td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[120px]">
                                {item.action || '-'}
                              </td>
                              <td className="p-1.5 text-slate-700">{item.status}</td>
                            </tr>
                          ))
                        : parsedCasesPreview.slice(0, 4).map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="p-1.5 font-medium text-slate-900">{item.noCase}</td>
                              <td className="p-1.5 text-slate-600">{item.date}</td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[120px]">
                                {item.description || '-'}
                              </td>
                              <td className="p-1.5 text-slate-600 truncate max-w-[120px]">
                                {item.action || '-'}
                              </td>
                              <td className="p-1.5 font-semibold text-rose-600">
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
              disabled={
                !rawPastedText.trim() ||
                (importMode === 'tickets'
                  ? parsedTicketsPreview.length === 0
                  : parsedCasesPreview.length === 0)
              }
              className="text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              <span>
                Terapkan Data (
                {importMode === 'tickets'
                  ? parsedTicketsPreview.length
                  : parsedCasesPreview.length}{' '}
                Item)
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
