'use client';

import React from 'react';
import {
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { TicketItem, CaseItem, calculateSla } from '@/lib/sla-calculator';
import {
  Button,
  Input,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
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

  const handleAddTicket = () => {
    const nextNum = tickets.length + 1;
    const padMonth = String(month).padStart(2, '0');
    setTickets([
      ...tickets,
      {
        noTicket: `TKT-${year}${padMonth}-${String(nextNum).padStart(2, '0')}`,
        date: `${year}-${padMonth}-01`,
        description: '',
        action: '',
        status: 'Closed',
      },
    ]);
  };

  const handleUpdateTicket = (index: number, field: keyof TicketItem, value: string) => {
    const updated = [...tickets];
    updated[index] = { ...updated[index], [field]: value };
    setTickets(updated);
  };

  const handleDeleteTicket = (index: number) => {
    setTickets(tickets.filter((_, i) => i !== index));
  };

  const handleAddCase = () => {
    const nextNum = cases.length + 1;
    const padMonth = String(month).padStart(2, '0');
    setCases([
      ...cases,
      {
        noCase: `CASE-${year}${padMonth}-${String(nextNum).padStart(2, '0')}`,
        date: `${year}-${padMonth}-01`,
        description: '',
        action: '',
        downtimeMinutes: 30,
      },
    ]);
  };

  const handleUpdateCase = (index: number, field: keyof CaseItem, value: string | number) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], [field]: value };
    setCases(updated);
  };

  const handleDeleteCase = (index: number) => {
    setCases(cases.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* SLA Live Calculation Summary Card */}
      <div className="bg-slate-900 text-white rounded-lg p-4 sm:p-5 shadow-sm border border-slate-800">
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
            className="text-xs bg-slate-800 border border-slate-700 px-2.5 py-0.5 rounded text-slate-300 font-mono tabular-nums"
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

      {/* 1. Ticket Management */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Support Tickets</span>
              <span className="text-xs font-medium text-slate-500 font-mono">
                ({tickets.length > 0 ? `${tickets.length} Tickets` : 'None'})
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-sans">
              Customer service requests recorded during billing cycle
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddTicket}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Ticket</span>
          </Button>
        </div>

        {tickets.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-md text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span>No support tickets recorded for this period.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header Row */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-medium text-slate-500 px-2">
              <div className="col-span-3">Ticket No</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-1 text-center">Status</div>
              <div className="col-span-1"></div>
            </div>

            {/* Ticket Rows */}
            {tickets.map((t, idx) => (
              <div
                key={idx}
                className="bg-slate-50/80 p-2 sm:p-2.5 rounded-md border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-12 gap-2 items-center hover:bg-slate-50 transition"
              >
                <div className="sm:col-span-3">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Ticket No</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={t.noTicket}
                    onChange={(e) => handleUpdateTicket(idx, 'noTicket', e.target.value)}
                    className="font-mono text-xs"
                    placeholder="1024/TKT"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Date</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={t.date}
                    onChange={(e) => handleUpdateTicket(idx, 'date', e.target.value)}
                    className="font-mono text-xs"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="sm:col-span-3">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Description</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={t.description}
                    onChange={(e) => handleUpdateTicket(idx, 'description', e.target.value)}
                    placeholder="Issue description"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Action</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={t.action}
                    onChange={(e) => handleUpdateTicket(idx, 'action', e.target.value)}
                    placeholder="Action taken"
                  />
                </div>
                <div className="sm:col-span-1">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Status</span>
                  <Select
                    value={t.status}
                    onValueChange={(val) => handleUpdateTicket(idx, 'status', val)}
                  >
                    <SelectTrigger className="h-8 text-xs font-medium px-2">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Closed">Closed</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Open">Open</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteTicket(idx)}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Delete Ticket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Case (Downtime) Management */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-heading font-semibold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Downtime Incident Cases</span>
              <span className="text-xs font-medium text-rose-600 font-mono">
                ({cases.length > 0 ? `${cases.length} Cases (${slaResult.totalDowntimeMinutes} Mins)` : '0 Downtime'})
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-sans">
              Service interruptions affecting monthly availability
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleAddCase}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            <span>Add Case</span>
          </Button>
        </div>

        {cases.length === 0 ? (
          <div className="p-4 bg-emerald-50 border border-dashed border-emerald-200 rounded-md text-center text-xs text-emerald-800 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Zero downtime incidents recorded. 100.00% uptime achieved.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Table Header Row */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-[11px] font-medium text-slate-500 px-2">
              <div className="col-span-3">Case No</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Action</div>
              <div className="col-span-1 text-center">Downtime (Min)</div>
              <div className="col-span-1"></div>
            </div>

            {/* Case Rows */}
            {cases.map((c, idx) => (
              <div
                key={idx}
                className="bg-slate-50/80 p-2 sm:p-2.5 rounded-md border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-12 gap-2 items-center hover:bg-slate-50 transition"
              >
                <div className="sm:col-span-3">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Case No</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={c.noCase}
                    onChange={(e) => handleUpdateCase(idx, 'noCase', e.target.value)}
                    className="font-mono text-xs"
                    placeholder="CASE-01"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Date</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={c.date}
                    onChange={(e) => handleUpdateCase(idx, 'date', e.target.value)}
                    className="font-mono text-xs"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="sm:col-span-3">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Description</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={c.description}
                    onChange={(e) => handleUpdateCase(idx, 'description', e.target.value)}
                    placeholder="Root cause"
                  />
                </div>
                <div className="sm:col-span-2">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Action</span>
                  <Input
                    inputSize="sm"
                    type="text"
                    value={c.action}
                    onChange={(e) => handleUpdateCase(idx, 'action', e.target.value)}
                    placeholder="Resolution"
                  />
                </div>
                <div className="sm:col-span-1">
                  <span className="sm:hidden text-[10px] font-medium text-slate-500 block mb-0.5">Downtime</span>
                  <Input
                    inputSize="sm"
                    type="number"
                    min="0"
                    value={c.downtimeMinutes}
                    onChange={(e) =>
                      handleUpdateCase(idx, 'downtimeMinutes', parseInt(e.target.value, 10) || 0)
                    }
                    className="font-mono text-xs text-center text-rose-600 font-semibold"
                    placeholder="30"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteCase(idx)}
                    className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Delete Case"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
