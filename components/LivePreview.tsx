'use client';

import React, { useState } from 'react';
import { Download, ZoomIn, ZoomOut, Layers, RefreshCw } from 'lucide-react';
import { ReportData } from '@/lib/pdf-template';
import { calculateSla, formatPeriodDisplay } from '@/lib/sla-calculator';
import { Button, Badge } from '@/components/ui';

interface LivePreviewProps {
  data: ReportData;
  isGeneratingPdf?: boolean;
  onDownloadPdf?: () => void;
  pageBgUrl?: string;
  coverMrtgUrl?: string;
  coverSlaUrl?: string;
}

export default function LivePreview({
  data,
  isGeneratingPdf = false,
  onDownloadPdf,
  pageBgUrl = '/assets/templates/page_bg.png',
  coverMrtgUrl = '/assets/templates/cover_mrtg.png',
  coverSlaUrl = '/assets/templates/cover_sla.png',
}: LivePreviewProps) {
  const [zoom, setZoom] = useState<number>(65); // Default 65% scale for desktop viewing
  const [activePage, setActivePage] = useState<number | 'all'>('all');

  const isSla = data.reportType === 'SLA';

  const tickets = (data.tickets || []).filter(t => t.noTicket && t.noTicket.trim() !== '');
  const cases = (data.cases || []).filter(c => c.noCase && c.noCase.trim() !== '');

  // Dynamic pagination decision:
  // If tickets + cases > 4 or tickets > 3 or cases > 3, split tables across Page 2 & Page 3,
  // pushing MRTG/PRTG graph to Page 4 so it never overflows or touches the footer.
  const isMultiPageTables = isSla && (tickets.length + cases.length > 4 || tickets.length > 3 || cases.length > 3);
  const totalPages = isSla ? (isMultiPageTables ? 4 : 3) : 2;

  // Reset active page if current active page exceeds totalPages
  React.useEffect(() => {
    if (typeof activePage === 'number' && activePage > totalPages) {
      setActivePage('all');
    }
  }, [totalPages, activePage]);

  // SLA calculations
  const [periodMonthStr, periodYearStr] = (data.reportPeriod || '').split(' ');
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  let month = 10;
  let year = 2026;
  if (periodMonthStr) {
    const foundIdx = monthNames.findIndex(m => m === periodMonthStr.toLowerCase());
    if (foundIdx !== -1) month = foundIdx + 1;
  }
  if (periodYearStr) {
    const parsedY = parseInt(periodYearStr, 10);
    if (!isNaN(parsedY)) year = parsedY;
  }

  const slaCalc = calculateSla(data.cases || [], data.tickets || [], year, month);

  const trafficDirection = data.trafficDirection || 'NORMAL';
  const engineTitle = data.graphType === 'PRTG' ? 'PRTG Network Monitor' : 'Multi Router Traffic Grapher (MRTG)';
  const engineShort = data.graphType === 'PRTG' ? 'PRTG Network Monitor' : 'Multi Router Traffic Grapher';
  const dlLabel = trafficDirection === 'NORMAL' ? 'Inbound' : 'Outbound';
  const ulLabel = trafficDirection === 'NORMAL' ? 'Outbound' : 'Inbound';

  const dlAvgStr = data.dlAvg !== undefined ? `${data.dlAvg} ${data.dlUnit || 'Mbps'}` : '-';
  const dlMaxStr = data.dlMax !== undefined ? `${data.dlMax} ${data.dlUnit || 'Mbps'}` : '-';
  const ulAvgStr = data.ulAvg !== undefined ? `${data.ulAvg} ${data.ulUnit || 'Mbps'}` : '-';
  const ulMaxStr = data.ulMax !== undefined ? `${data.ulMax} ${data.ulUnit || 'Mbps'}` : '-';

  const graphImg = data.graphImage || '/assets/templates/sample_graph.png';
  const coverBg = isSla ? coverSlaUrl : coverMrtgUrl;

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shadow-sm" suppressHydrationWarning>
      {/* Top Toolbar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-[#EA580C]" />
          <span className="font-heading text-sm font-semibold text-slate-900">
            {`Live Preview (${totalPages} A4 Pages)`}
          </span>
          <Badge variant="neutral" className="text-[11px]">
            {data.reportType}
          </Badge>
        </div>

        {/* View Controls & Action */}
        <div className="flex items-center space-x-2">
          {/* Page switch tabs */}
          <div className="hidden sm:flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <Button
              type="button"
              variant={activePage === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setActivePage('all')}
              className={`h-7 px-2.5 text-xs font-medium ${
                activePage === 'all' ? 'bg-white text-[#C2410C] shadow-xs' : 'text-slate-600'
              }`}
            >
              All
            </Button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i}
                type="button"
                variant={activePage === i + 1 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setActivePage(i + 1)}
                className={`h-7 px-2.5 text-xs font-medium ${
                  activePage === i + 1 ? 'bg-white text-[#C2410C] shadow-xs' : 'text-slate-600'
                }`}
              >
                {`Page ${i + 1}`}
              </Button>
            ))}
          </div>

          {/* Zoom controls with Quick Presets */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs text-slate-700">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom(z => Math.max(40, z - 10))}
              className="h-7 w-7 text-slate-600 hover:text-slate-900"
              title="Zoom Out (-10%)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="w-10 text-center font-bold text-[11px] tabular-nums text-slate-900">{`${zoom}%`}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setZoom(z => Math.min(130, z + 10))}
              className="h-7 w-7 text-slate-600 hover:text-slate-900"
              title="Zoom In (+10%)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <div className="hidden lg:flex items-center space-x-0.5 border-l border-slate-300 pl-1 ml-0.5">
              <Button
                type="button"
                variant={zoom === 50 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setZoom(50)}
                className={`h-6 px-1.5 text-[10px] font-medium ${
                  zoom === 50 ? 'bg-white text-[#C2410C] shadow-xs font-semibold' : 'text-slate-500'
                }`}
                title="Zoom 50% (Fit)"
              >
                Fit
              </Button>
              <Button
                type="button"
                variant={zoom === 65 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setZoom(65)}
                className={`h-6 px-1.5 text-[10px] font-medium ${
                  zoom === 65 ? 'bg-white text-[#C2410C] shadow-xs font-semibold' : 'text-slate-500'
                }`}
                title="Zoom 65% (Optimal)"
              >
                65%
              </Button>
              <Button
                type="button"
                variant={zoom === 100 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setZoom(100)}
                className={`h-6 px-1.5 text-[10px] font-medium ${
                  zoom === 100 ? 'bg-white text-[#C2410C] shadow-xs font-semibold' : 'text-slate-500'
                }`}
                title="Zoom 100% (Real Size)"
              >
                100%
              </Button>
            </div>
          </div>

          {/* Download PDF Button */}
          {onDownloadPdf && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onDownloadPdf}
              disabled={isGeneratingPdf}
              className="text-[#C2410C] border-orange-200 hover:bg-orange-50 font-medium"
            >
              {isGeneratingPdf ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 mr-1.5 text-[#EA580C]" />
                  <span>Download PDF</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Preview Scrollable Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center gap-8 bg-slate-200/70" suppressHydrationWarning>
        <div
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="flex flex-col items-center gap-8"
        >
          {/* ================= PAGE 1: COVER ================= */}
          {(activePage === 'all' || activePage === 1) && (
            <div
              className="a4-preview-page relative bg-white pt-[106mm] px-[15mm] flex flex-col text-left"
              style={{ backgroundImage: `url(${coverBg})` }}
            >
              {/* Dokumen Rahasia Badge */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/templates/confidential_badge.png"
                alt="Dokumen Rahasia"
                className="absolute top-[34.2mm] right-[22.5mm] w-[30mm] h-auto pointer-events-none select-none z-10"
              />

              {!isSla ? (
                <div className="font-heading text-[28pt] font-bold leading-[1.15] text-white tracking-tight mb-3">
                  Multi Router Traffic Grapher<br />
                  (MRTG) Report
                </div>
              ) : (
                <div className="font-heading text-[40pt] font-bold leading-[1.1] text-white tracking-tight mb-3.5">
                  SLA REPORT
                </div>
              )}

              <div className="text-[13pt] font-normal text-white mb-1">
                {data.customerName || 'Customer Name'}
              </div>

              <div className="text-[13pt] font-normal text-white">
                {data.reportPeriod || 'Period 2026'}
              </div>
            </div>
          )}

          {/* ================= MRTG MODE: PAGE 2 ================= */}
          {!isSla && (activePage === 'all' || activePage === 2) && (
            <div
              className="a4-preview-page bg-white pt-[36mm] pb-[30mm] px-[15mm] flex flex-col text-black"
              style={{ backgroundImage: `url(${pageBgUrl})` }}
            >
              {/* Metadata Table */}
              <table className="w-full max-w-[130mm] border-collapse mb-4 text-[11pt]">
                <tbody>
                  <tr>
                    <td className="w-[44mm] font-normal text-black py-0.5">Customer Name</td>
                    <td className="w-[4mm] font-normal text-center">:</td>
                    <td className="font-bold text-black pl-1">{data.customerName || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-normal text-black py-0.5">Customer ID</td>
                    <td className="font-normal text-center">:</td>
                    <td className="font-bold text-black pl-1">{data.customerId || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-normal text-black py-0.5">Service ID</td>
                    <td className="font-normal text-center">:</td>
                    <td className="font-bold text-black pl-1">{data.serviceId || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-normal text-black py-0.5">Report Period</td>
                    <td className="font-normal text-center">:</td>
                    <td className="font-bold text-black pl-1">{data.reportPeriod || '-'}</td>
                  </tr>
                  <tr>
                    <td className="font-normal text-black py-0.5">Document Number</td>
                    <td className="font-normal text-center">:</td>
                    <td className="font-bold text-black pl-1">{data.documentNumber || '-'}</td>
                  </tr>
                </tbody>
              </table>

              {/* Section Header */}
              <div>
                <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                  {engineTitle}
                </div>
              </div>
              <div className="text-[11pt] font-bold text-black mt-2 mb-1.5">
                {`● ${engineShort} ${data.reportPeriod} :`}
              </div>

              {/* Graph Image */}
              <div className="w-full text-center my-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={graphImg}
                  alt="MRTG Graph"
                  className="w-full max-w-[180mm] h-auto mx-auto border border-slate-300 rounded-xs"
                />
              </div>

              {/* Summary Bullets (indented) */}
              <div className="mt-3.5 pl-[12mm] text-[9.5pt] leading-relaxed text-black space-y-1.5">
                <div className="flex items-start">
                  <span className="text-black text-[9pt] mr-2 leading-tight">○</span>
                  <div>
                    <span>{`Download Traffic (${dlLabel}) : `}</span>
                    {data.dlAvg !== undefined ? (
                      <span>
                        {`The average usage is `}
                        <strong>{dlAvgStr}</strong>
                        {`, with the maximum usage reaching `}
                        <strong>{dlMaxStr}</strong>
                        {`.`}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>
                <div className="flex items-start">
                  <span className="text-black text-[9pt] mr-2 leading-tight">○</span>
                  <div>
                    <span>{`Upload Traffic (${ulLabel}) : `}</span>
                    {data.ulAvg !== undefined ? (
                      <span>
                        {`The average usage is `}
                        <strong>{ulAvgStr}</strong>
                        {`, with the maximum usage reaching `}
                        <strong>{ulMaxStr}</strong>
                        {`.`}
                      </span>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= SLA STANDARD MODE (<=4 items): PAGE 2 & PAGE 3 ================= */}
          {isSla && !isMultiPageTables && (
            <>
              {/* PAGE 2: All Tables & SLA Service */}
              {(activePage === 'all' || activePage === 2) && (
                <div
                  className="a4-preview-page bg-white pt-[36mm] pb-[30mm] px-[15mm] flex flex-col text-black"
                  style={{ backgroundImage: `url(${pageBgUrl})` }}
                >
                  <div className="text-left text-[11pt] font-bold text-black mb-3">
                    {`Document Number : ${data.documentNumber}`}
                  </div>

                  {/* Section 1: Summary Report & Service Availability */}
                  <div>
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block mt-0.5">
                      Summary Report &amp; Service Availability
                    </div>
                  </div>
                  <div className="text-[8.5pt] text-slate-700 mb-1 leading-tight">
                    {`Summary report & detailed service availability for ${data.customerName} ${data.reportPeriod}`}
                  </div>
                  <table className="w-full border-collapse border border-black text-[8.5pt] leading-[1.25] mb-1 text-center">
                    <thead>
                      <tr className="bg-white text-black font-bold">
                        <th className="border border-black py-1 px-1.5 w-[35px]">No</th>
                        <th className="border border-black py-1 px-1.5 text-left pl-2 w-[110px]">Service ID</th>
                        <th className="border border-black py-1 px-1.5 text-left pl-2">Service Name</th>
                        <th className="border border-black py-1 px-1.5 w-[50px]">Node</th>
                        <th className="border border-black py-1 px-1.5 w-[85px]">Target SLA</th>
                        <th className="border border-black py-1 px-1.5 w-[85px]">Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black py-1">1</td>
                        <td className="border border-black py-1 text-left pl-2">{data.serviceId}</td>
                        <td className="border border-black py-1 text-left pl-2">{data.serviceName}</td>
                        <td className="border border-black py-1">{data.nodeCount}</td>
                        <td className="border border-black py-1">{data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
                        <td className="border border-black py-1">{`${slaCalc.availabilityPercent}%`}</td>
                      </tr>
                      <tr className="bg-white font-bold">
                        <td colSpan={3} className="border border-black py-1 text-right pr-3.5">Total</td>
                        <td className="border border-black py-1">{data.nodeCount}</td>
                        <td className="border border-black py-1">{data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
                        <td className="border border-black py-1">{`${slaCalc.availabilityPercent}%`}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Section 3 */}
                  <div className="mt-1.5">
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                      Ticket & Case Report
                    </div>
                  </div>
                  <div className="text-[8.5pt] text-slate-700 mb-1 leading-tight">
                    {`Detailed ticket & case report for ${data.customerName} ${data.reportPeriod}`}
                  </div>

                  {/* Ticket Table */}
                  <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.25] mb-1 text-center">
                    <thead>
                      <tr className="bg-white text-black font-bold">
                        <th className="border border-black py-1 px-1 w-[15%]">No. Ticket</th>
                        <th className="border border-black py-1 px-1 w-[16%]">Date & Time</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[37%]">Description</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[22%]">Action</th>
                        <th className="border border-black py-1 px-1 w-[10%]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length === 0 ? (
                        <tr>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                        </tr>
                      ) : (
                        tickets.map((t, idx) => {
                          const period = formatPeriodDisplay(t);
                          return (
                            <tr key={idx}>
                              <td className="border border-black py-1 whitespace-nowrap">{t.noTicket}</td>
                              <td className="border border-black py-1 whitespace-nowrap text-[7.5pt] leading-[1.25]">
                                <div className="font-semibold">{period.start}</div>
                                {period.end && (
                                  <div className="text-[7pt] text-slate-600 mt-0.5">
                                    {`s/d ${period.end}`}
                                  </div>
                                )}
                              </td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{t.description}</td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{t.action}</td>
                              <td className="border border-black py-1">{t.status}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {/* Ticket Summary */}
                  <div className="text-[8.5pt] font-bold text-black my-1">
                    <span>{`Number Of Ticket : ${tickets.length === 0 ? '-' : tickets.length}`}</span>
                  </div>

                  {/* Case Table */}
                  <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.25] mb-1 text-center">
                    <thead>
                      <tr className="bg-white text-black font-bold">
                        <th className="border border-black py-1 px-1 w-[15%]">No. Case</th>
                        <th className="border border-black py-1 px-1 w-[16%]">Date & Time</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[37%]">Description</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[22%]">Action</th>
                        <th className="border border-black py-1 px-1 w-[10%]">Downtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.length === 0 ? (
                        <tr>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                        </tr>
                      ) : (
                        cases.map((c, idx) => {
                          const period = formatPeriodDisplay(c);
                          return (
                            <tr key={idx}>
                              <td className="border border-black py-1 whitespace-nowrap">{c.noCase}</td>
                              <td className="border border-black py-1 whitespace-nowrap text-[7.5pt] leading-[1.25]">
                                <div className="font-semibold">{period.start}</div>
                                {period.end && (
                                  <div className="text-[7pt] text-slate-600 mt-0.5">
                                    {`s/d ${period.end}`}
                                  </div>
                                )}
                              </td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{c.description}</td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{c.action}</td>
                              <td className="border border-black py-1">{`${c.downtimeMinutes} Mins`}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {/* Case Summary & Duration */}
                  <div className="flex justify-between items-center text-[8.5pt] font-bold text-black my-1">
                    <span>{`Number Of Case : ${cases.length === 0 ? '-' : cases.length}`}</span>
                    <span>{`Downtime Duration : ${slaCalc.downtimeDurationStr}`}</span>
                  </div>

                  {/* Section 4: SLA Service (Dual Progress Bar - Option A) */}
                  <div className="mt-1.5">
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                      SLA Service
                    </div>
                  </div>
                  <div className="text-[8.5pt] text-slate-700 mb-1 leading-tight">
                    {`Detailed SLA Service for ${data.customerName} ${data.reportPeriod} :`}
                  </div>
                  <div className="my-2 space-y-2.5">
                    {/* Bar 1: Actual Availability (Online + Downtime) */}
                    <div>
                      <div className="flex justify-between items-center text-[8pt] mb-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Service Availability</span>
                        </div>
                        <div className="font-semibold text-[8pt]">
                          <span className="text-emerald-700 font-bold">{`Availability ${slaCalc.onlinePercent.toFixed(2)}%`}</span>
                          <span className="text-slate-300 mx-1.5">|</span>
                          <span className="text-rose-600 font-bold">{`Downtime ${slaCalc.downtimePercent.toFixed(2)}%`}</span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-rose-100 rounded overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${Math.min(100, Math.max(0, slaCalc.onlinePercent))}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${Math.min(100, Math.max(0, slaCalc.downtimePercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 2: Target SLA & Status Text */}
                    <div>
                      <div className="flex justify-between items-center text-[8pt] mb-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 inline-block"></span>
                          <span>
                            Target SLA :{' '}
                            <strong className="text-sky-600">
                              {data.targetSla > 0 ? `${data.targetSla.toFixed(2)}%` : '-'}
                            </strong>
                          </span>
                        </div>
                        <div>
                          {data.targetSla > 0 ? (
                            slaCalc.onlinePercent >= data.targetSla ? (
                              <span className="text-[8pt] font-bold text-emerald-700">
                                {`SLA Met (+${(slaCalc.onlinePercent - data.targetSla).toFixed(2)}%)`}
                              </span>
                            ) : (
                              <span className="text-[8pt] font-bold text-rose-600">
                                {`SLA Breached (-${(data.targetSla - slaCalc.onlinePercent).toFixed(2)}%)`}
                              </span>
                            )
                          ) : (
                            <span className="text-[8pt] font-semibold text-slate-400">-</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded overflow-hidden">
                        <div
                          className="bg-sky-600 h-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, data.targetSla > 0 ? data.targetSla : 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 3: MRTG / PRTG Graph Attachment */}
              {(activePage === 'all' || activePage === 3) && (
                <div
                  className="a4-preview-page bg-white pt-[36mm] pb-[30mm] px-[15mm] flex flex-col text-black"
                  style={{ backgroundImage: `url(${pageBgUrl})` }}
                >
                  <div>
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                      {engineTitle}
                    </div>
                  </div>
                  <div className="text-[11pt] font-bold text-black mt-2 mb-1.5">
                    {`${engineShort} ${data.customerName} ${data.reportPeriod} :`}
                  </div>

                  {/* Graph Image */}
                  <div className="w-full text-center my-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={graphImg}
                      alt="MRTG Graph Attachment"
                      className="w-full max-w-[180mm] h-auto mx-auto border border-slate-300 rounded-xs"
                    />
                  </div>

                  {/* Summary Bullets (indented) */}
                  <div className="mt-3.5 pl-[12mm] text-[9.5pt] leading-relaxed text-black space-y-1.5">
                    <div className="flex items-start">
                      <span className="text-black text-[9pt] mr-2 leading-tight">○</span>
                      <div>
                        <span>{`Download Traffic (${dlLabel}) : `}</span>
                        {data.dlAvg !== undefined ? (
                          <span>
                            {`The average usage is `}
                            <strong>{dlAvgStr}</strong>
                            {`, with the maximum usage reaching `}
                            <strong>{dlMaxStr}</strong>
                            {`.`}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-black text-[9pt] mr-2 leading-tight">○</span>
                      <div>
                        <span>{`Upload Traffic (${ulLabel}) : `}</span>
                        {data.ulAvg !== undefined ? (
                          <span>
                            {`The average usage is `}
                            <strong>{ulAvgStr}</strong>
                            {`, with the maximum usage reaching `}
                            <strong>{ulMaxStr}</strong>
                            {`.`}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ================= SLA EXTENDED MODE (>4 items): PAGE 2, 3, & 4 ================= */}
          {isSla && isMultiPageTables && (
            <>
              {/* PAGE 2: Summary, Availability & Ticket Report */}
              {(activePage === 'all' || activePage === 2) && (
                <div
                  className="a4-preview-page bg-white pt-[36mm] pb-[30mm] px-[15mm] flex flex-col text-black"
                  style={{ backgroundImage: `url(${pageBgUrl})` }}
                >
                  <div className="text-left text-[11pt] font-bold text-black mb-3.5">
                    {`Document Number : ${data.documentNumber}`}
                  </div>

                  {/* Section 1: Summary Report & Service Availability */}
                  <div>
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                      Summary Report &amp; Service Availability
                    </div>
                  </div>
                  <div className="text-[8.5pt] text-slate-700 mb-1">
                    {`Summary report & detailed service availability for ${data.customerName} ${data.reportPeriod}`}
                  </div>
                  <table className="w-full border-collapse border border-black text-[8.5pt] mb-1 text-center">
                    <thead>
                      <tr className="bg-white text-black font-bold">
                        <th className="border border-black py-1 px-1.5 w-[35px]">No</th>
                        <th className="border border-black py-1 px-1.5 text-left pl-2 w-[110px]">Service ID</th>
                        <th className="border border-black py-1 px-1.5 text-left pl-2">Service Name</th>
                        <th className="border border-black py-1 px-1.5 w-[50px]">Node</th>
                        <th className="border border-black py-1 px-1.5 w-[85px]">Target SLA</th>
                        <th className="border border-black py-1 px-1.5 w-[85px]">Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black py-1">1</td>
                        <td className="border border-black py-1 text-left pl-2">{data.serviceId}</td>
                        <td className="border border-black py-1 text-left pl-2">{data.serviceName}</td>
                        <td className="border border-black py-1">{data.nodeCount}</td>
                        <td className="border border-black py-1">{data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
                        <td className="border border-black py-1">{`${slaCalc.availabilityPercent}%`}</td>
                      </tr>
                      <tr className="bg-white font-bold">
                        <td colSpan={3} className="border border-black py-1 text-right pr-3.5">Total</td>
                        <td className="border border-black py-1">{data.nodeCount}</td>
                        <td className="border border-black py-1">{data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
                        <td className="border border-black py-1">{`${slaCalc.availabilityPercent}%`}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Section 3: Ticket Report */}
                  <div className="mt-2">
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                      Ticket Report
                    </div>
                  </div>
                  <div className="text-[8.5pt] text-slate-700 mb-1">
                    {`Detailed ticket report for ${data.customerName} ${data.reportPeriod}`}
                  </div>

                  {/* Ticket Table */}
                  <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.25] mb-1 text-center">
                    <thead>
                      <tr className="bg-white text-black font-bold">
                        <th className="border border-black py-1 px-1 w-[15%]">No. Ticket</th>
                        <th className="border border-black py-1 px-1 w-[16%]">Date & Time</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[37%]">Description</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[22%]">Action</th>
                        <th className="border border-black py-1 px-1 w-[10%]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.length === 0 ? (
                        <tr>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                        </tr>
                      ) : (
                        tickets.map((t, idx) => {
                          const period = formatPeriodDisplay(t);
                          return (
                            <tr key={idx}>
                              <td className="border border-black py-1 whitespace-nowrap">{t.noTicket}</td>
                              <td className="border border-black py-1 whitespace-nowrap text-[7.5pt] leading-[1.25]">
                                <div className="font-semibold">{period.start}</div>
                                {period.end && (
                                  <div className="text-[7pt] text-slate-600 mt-0.5">
                                    {`s/d ${period.end}`}
                                  </div>
                                )}
                              </td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{t.description}</td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{t.action}</td>
                              <td className="border border-black py-1">{t.status}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {/* Ticket Summary */}
                  <div className="text-[8.5pt] font-bold text-black my-1">
                    <span>{`Number Of Ticket : ${tickets.length === 0 ? '-' : tickets.length}`}</span>
                  </div>
                </div>
              )}

              {/* PAGE 3: Case Report & SLA Service */}
              {(activePage === 'all' || activePage === 3) && (
                <div
                  className="a4-preview-page bg-white pt-[36mm] pb-[30mm] px-[15mm] flex flex-col text-black"
                  style={{ backgroundImage: `url(${pageBgUrl})` }}
                >
                  <div className="text-left text-[11pt] font-bold text-black mb-3">
                    {`Document Number : ${data.documentNumber} (Continued)`}
                  </div>

                  {/* Section: Case Report */}
                  <div>
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block mt-0.5">
                      Case Report
                    </div>
                  </div>
                  <div className="text-[8.5pt] text-slate-700 mb-1 leading-tight">
                    {`Detailed case report for ${data.customerName} ${data.reportPeriod}`}
                  </div>

                  {/* Case Table */}
                  <table className="w-full table-fixed border-collapse border border-black text-[8.5pt] leading-[1.25] mb-1 text-center">
                    <thead>
                      <tr className="bg-white text-black font-bold">
                        <th className="border border-black py-1 px-1 w-[15%]">No. Case</th>
                        <th className="border border-black py-1 px-1 w-[16%]">Date & Time</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[37%]">Description</th>
                        <th className="border border-black py-1 px-1 text-left pl-2 w-[22%]">Action</th>
                        <th className="border border-black py-1 px-1 w-[10%]">Downtime</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.length === 0 ? (
                        <tr>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                          <td className="border border-black py-1">-</td>
                        </tr>
                      ) : (
                        cases.map((c, idx) => {
                          const period = formatPeriodDisplay(c);
                          return (
                            <tr key={idx}>
                              <td className="border border-black py-1 whitespace-nowrap">{c.noCase}</td>
                              <td className="border border-black py-1 whitespace-nowrap text-[7.5pt] leading-[1.25]">
                                <div className="font-semibold">{period.start}</div>
                                {period.end && (
                                  <div className="text-[7pt] text-slate-600 mt-0.5">
                                    {`s/d ${period.end}`}
                                  </div>
                                )}
                              </td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{c.description}</td>
                              <td className="border border-black py-1 text-left px-2 leading-[1.25] break-words">{c.action}</td>
                              <td className="border border-black py-1">{`${c.downtimeMinutes} Mins`}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {/* Case Summary & Duration */}
                  <div className="flex justify-between items-center text-[8.5pt] font-bold text-black my-1">
                    <span>{`Number Of Case : ${cases.length === 0 ? '-' : cases.length}`}</span>
                    <span>{`Downtime Duration : ${slaCalc.downtimeDurationStr}`}</span>
                  </div>

                  {/* Section: SLA Service (Dual Progress Bar - Option A) */}
                  <div className="mt-2">
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                      SLA Service
                    </div>
                  </div>
                  <div className="text-[8.5pt] text-slate-700 mb-1 leading-tight">
                    {`Detailed SLA Service for ${data.customerName} ${data.reportPeriod} :`}
                  </div>
                  <div className="my-2 space-y-2.5">
                    {/* Bar 1: Actual Availability (Online + Downtime) */}
                    <div>
                      <div className="flex justify-between items-center text-[8pt] mb-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                          <span>Service Availability</span>
                        </div>
                        <div className="font-semibold text-[8pt]">
                          <span className="text-emerald-700 font-bold">{`Availability ${slaCalc.onlinePercent.toFixed(2)}%`}</span>
                          <span className="text-slate-300 mx-1.5">|</span>
                          <span className="text-rose-600 font-bold">{`Downtime ${slaCalc.downtimePercent.toFixed(2)}%`}</span>
                        </div>
                      </div>
                      <div className="w-full h-3 bg-rose-100 rounded overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full"
                          style={{ width: `${Math.min(100, Math.max(0, slaCalc.onlinePercent))}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full"
                          style={{ width: `${Math.min(100, Math.max(0, slaCalc.downtimePercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Bar 2: Target SLA & Status Text */}
                    <div>
                      <div className="flex justify-between items-center text-[8pt] mb-1">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 inline-block"></span>
                          <span>
                            Target SLA :{' '}
                            <strong className="text-sky-600">
                              {data.targetSla > 0 ? `${data.targetSla.toFixed(2)}%` : '-'}
                            </strong>
                          </span>
                        </div>
                        <div>
                          {data.targetSla > 0 ? (
                            slaCalc.onlinePercent >= data.targetSla ? (
                              <span className="text-[8pt] font-bold text-emerald-700">
                                {`SLA Met (+${(slaCalc.onlinePercent - data.targetSla).toFixed(2)}%)`}
                              </span>
                            ) : (
                              <span className="text-[8pt] font-bold text-rose-600">
                                {`SLA Breached (-${(data.targetSla - slaCalc.onlinePercent).toFixed(2)}%)`}
                              </span>
                            )
                          ) : (
                            <span className="text-[8pt] font-semibold text-slate-400">-</span>
                          )}
                        </div>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded overflow-hidden">
                        <div
                          className="bg-sky-600 h-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, data.targetSla > 0 ? data.targetSla : 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PAGE 4: MRTG / PRTG Graph Attachment */}
              {(activePage === 'all' || activePage === 4) && (
                <div
                  className="a4-preview-page bg-white pt-[36mm] pb-[30mm] px-[15mm] flex flex-col text-black"
                  style={{ backgroundImage: `url(${pageBgUrl})` }}
                >
                  <div>
                    <div className="font-heading text-[11.5pt] font-bold text-black inline-block">
                      {engineTitle}
                    </div>
                  </div>
                  <div className="text-[11pt] font-bold text-black mt-2 mb-1.5">
                    {`${engineShort} ${data.customerName} ${data.reportPeriod} :`}
                  </div>

                  {/* Graph Image */}
                  <div className="w-full text-center my-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={graphImg}
                      alt="MRTG Graph Attachment"
                      className="w-full max-w-[180mm] h-auto mx-auto border border-slate-300 rounded-xs"
                    />
                  </div>

                  {/* Summary Bullets (indented) */}
                  <div className="mt-3.5 pl-[12mm] text-[9.5pt] leading-relaxed text-black space-y-1.5">
                    <div className="flex items-start">
                      <span className="text-black text-[9pt] mr-2 leading-tight">○</span>
                      <div>
                        <span>{`Download Traffic (${dlLabel}) : `}</span>
                        {data.dlAvg !== undefined ? (
                          <span>
                            {`The average usage is `}
                            <strong>{dlAvgStr}</strong>
                            {`, with the maximum usage reaching `}
                            <strong>{dlMaxStr}</strong>
                            {`.`}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <span className="text-black text-[9pt] mr-2 leading-tight">○</span>
                      <div>
                        <span>{`Upload Traffic (${ulLabel}) : `}</span>
                        {data.ulAvg !== undefined ? (
                          <span>
                            {`The average usage is `}
                            <strong>{ulAvgStr}</strong>
                            {`, with the maximum usage reaching `}
                            <strong>{ulMaxStr}</strong>
                            {`.`}
                          </span>
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
