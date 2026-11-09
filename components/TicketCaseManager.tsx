'use client';

import React from 'react';
import { Plus, Trash2, AlertCircle, Clock, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { TicketItem, CaseItem, calculateSla } from '@/lib/sla-calculator';

interface TicketCaseManagerProps {
  tickets: TicketItem[];
  setTickets: React.Dispatch<React.SetStateAction<TicketItem[]>>;
  cases: CaseItem[];
  setCases: React.Dispatch<React.SetStateAction<CaseItem[]>>;
  year: number;
  month: number;
  targetSla: number;
}

export default function TicketCaseManager({
  tickets,
  setTickets,
  cases,
  setCases,
  year,
  month,
  targetSla,
}: TicketCaseManagerProps) {
  const slaResult = calculateSla(cases, tickets, year, month);

  // Ticket handlers
  const handleAddTicket = () => {
    const nextNum = tickets.length + 1;
    const paddedMonth = String(month).padStart(2, '0');
    setTickets([
      ...tickets,
      {
        noTicket: `TKT-${year}${paddedMonth}-${String(nextNum).padStart(3, '0')}`,
        date: `${year}-${paddedMonth}-01`,
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

  // Case handlers
  const handleAddCase = () => {
    const nextNum = cases.length + 1;
    const paddedMonth = String(month).padStart(2, '0');
    setCases([
      ...cases,
      {
        noCase: `CASE-${year}${paddedMonth}-${String(nextNum).padStart(3, '0')}`,
        date: `${year}-${paddedMonth}-01`,
        description: 'Link Flapping / Fiber Optic Cut',
        action: 'Splicing FO cable & link normalized',
        downtimeMinutes: 30,
      },
    ]);
  };

  const handleUpdateCase = (index: number, field: keyof CaseItem, value: any) => {
    const updated = [...cases];
    updated[index] = { ...updated[index], [field]: value };
    setCases(updated);
  };

  const handleDeleteCase = (index: number) => {
    setCases(cases.filter((_, i) => i !== index));
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'closed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'resolved':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'open':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* SLA Live Calculation Summary Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-md border border-slate-700/80">
        <div className="flex items-center justify-between mb-3 border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm tracking-wide">Realtime SLA Calculation</h4>
              <p className="text-[10px] text-slate-400">Computed automatically from incident cases</p>
            </div>
          </div>
          <span
            suppressHydrationWarning
            className="text-xs bg-slate-800/90 border border-slate-700 px-3 py-1 rounded-full text-slate-300 font-mono tabular-nums"
          >
            {new Intl.NumberFormat('en-US').format(slaResult.totalMinutesInMonth)} Mins/Month
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/70">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Online %</div>
            <div className={`text-lg sm:text-xl font-bold mt-1 tabular-nums ${slaResult.onlinePercent >= targetSla ? 'text-emerald-400' : 'text-amber-400'}`}>
              {slaResult.onlinePercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/70">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Downtime %</div>
            <div className="text-lg sm:text-xl font-bold text-rose-400 mt-1 tabular-nums">
              {slaResult.downtimePercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/70">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Availability %</div>
            <div className="text-lg sm:text-xl font-bold text-blue-400 mt-1 tabular-nums">
              {slaResult.availabilityPercent.toFixed(2)}%
            </div>
          </div>
          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/70">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Downtime Duration</div>
            <div className="text-xs sm:text-sm font-bold text-slate-200 mt-1.5 tabular-nums">
              {slaResult.downtimeDurationStr}
            </div>
          </div>
        </div>
      </div>

      {/* 1. Ticket Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Support Tickets</span>
              <span className="text-xs font-semibold text-slate-500 font-mono">
                ({tickets.length > 0 ? `${tickets.length} Tickets` : 'Empty: "-"'})
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Customer service requests recorded during billing cycle</p>
          </div>
          <button
            type="button"
            onClick={handleAddTicket}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Ticket</span>
          </button>
        </div>

        {tickets.length === 0 ? (
          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <span>No support tickets recorded for this period.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tickets.map((t, idx) => (
              <div
                key={idx}
                className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:bg-slate-50 transition"
              >
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Ticket No</label>
                  <input
                    type="text"
                    value={t.noTicket}
                    onChange={(e) => handleUpdateTicket(idx, 'noTicket', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono font-bold"
                    placeholder="e.g. 1024/TKT"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Date</label>
                  <input
                    type="text"
                    value={t.date}
                    onChange={(e) => handleUpdateTicket(idx, 'date', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Description</label>
                  <input
                    type="text"
                    value={t.description}
                    onChange={(e) => handleUpdateTicket(idx, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    placeholder="Issue description"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Action</label>
                  <input
                    type="text"
                    value={t.action}
                    onChange={(e) => handleUpdateTicket(idx, 'action', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    placeholder="Resolution taken"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Status</label>
                  <select
                    value={t.status}
                    onChange={(e) => handleUpdateTicket(idx, 'status', e.target.value)}
                    className={`w-full px-1.5 py-1.5 border rounded-lg text-xs font-bold ${getStatusBadgeClass(t.status)}`}
                  >
                    <option value="Closed">Closed</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Pending">Pending</option>
                    <option value="Open">Open</option>
                  </select>
                </div>
                <div className="sm:col-span-1 flex justify-end items-end pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleDeleteTicket(idx)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Ticket"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Case (Downtime) Management */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              <span>Downtime Incident Cases</span>
              <span className="text-xs font-semibold text-rose-600 font-mono">
                ({cases.length > 0 ? `${cases.length} Cases (${slaResult.totalDowntimeMinutes} Mins)` : 'Empty: 100% Online'})
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">Service interruptions affecting monthly availability</p>
          </div>
          <button
            type="button"
            onClick={handleAddCase}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Case</span>
          </button>
        </div>

        {cases.length === 0 ? (
          <div className="p-4 bg-emerald-50 border border-dashed border-emerald-200 rounded-xl text-center text-xs text-emerald-800 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Zero downtime incidents recorded. 100.00% uptime achieved.</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {cases.map((c, idx) => (
              <div
                key={idx}
                className="bg-slate-50/80 p-3 rounded-xl border border-slate-200 text-xs grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center hover:bg-slate-50 transition"
              >
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Case No</label>
                  <input
                    type="text"
                    value={c.noCase}
                    onChange={(e) => handleUpdateCase(idx, 'noCase', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono font-bold"
                    placeholder="CASE-01"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Date</label>
                  <input
                    type="text"
                    value={c.date}
                    onChange={(e) => handleUpdateCase(idx, 'date', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-mono"
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Description</label>
                  <input
                    type="text"
                    value={c.description}
                    onChange={(e) => handleUpdateCase(idx, 'description', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    placeholder="Root cause"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Action</label>
                  <input
                    type="text"
                    value={c.action}
                    onChange={(e) => handleUpdateCase(idx, 'action', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs"
                    placeholder="Restoration action"
                  />
                </div>
                <div className="sm:col-span-1">
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">Downtime (Min)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={c.downtimeMinutes}
                      onChange={(e) => handleUpdateCase(idx, 'downtimeMinutes', parseInt(e.target.value, 10) || 0)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-bold text-rose-600 font-mono text-center"
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="sm:col-span-1 flex justify-end items-end pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleDeleteCase(idx)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                    title="Delete Case"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
