import fs from 'fs';
import path from 'path';
import { TicketItem, CaseItem, calculateSla, formatPeriodDisplay } from './sla-calculator';
import { escapeHtml } from './utils';

export interface ReportData {
  reportType: 'MRTG' | 'SLA';
  graphType?: 'MRTG' | 'PRTG';
  documentNumber: string;
  customerName: string;
  customerId: string;
  serviceId: string;
  serviceName: string;
  nodeCount: number;
  targetSla: number;
  reportPeriod: string;
  graphId?: string;
  cactiGraphId?: string;
  prtgSensorId?: string;
  graphImage?: string; // base64
  dlAvg?: number;
  dlMax?: number;
  ulAvg?: number;
  ulMax?: number;
  dlUnit?: string;
  ulUnit?: string;
  trafficDirection?: 'NORMAL' | 'REVERSED';
  tickets?: TicketItem[];
  cases?: CaseItem[];
  isDraft?: boolean;
}

function getAssetAsBase64(relativeAssetPath: string): string {
  try {
    const fullPath = path.join(process.cwd(), 'public', relativeAssetPath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      const ext = path.extname(fullPath).toLowerCase();
      const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      const buffer = fs.readFileSync(fullPath);
      return `data:${mime};base64,${buffer.toString('base64')}`;
    }
  } catch (err) {
    console.error(`Error loading asset ${relativeAssetPath}:`, err);
  }
  return '';
}

export function generateReportHtml(rawData: ReportData): string {
  const data: ReportData = {
    ...rawData,
    customerName: escapeHtml(rawData.customerName),
    customerId: escapeHtml(rawData.customerId),
    serviceId: escapeHtml(rawData.serviceId),
    serviceName: escapeHtml(rawData.serviceName),
    documentNumber: escapeHtml(rawData.documentNumber),
    reportPeriod: escapeHtml(rawData.reportPeriod),
    tickets: (rawData.tickets || []).map((t) => ({
      ...t,
      noTicket: escapeHtml(t.noTicket),
      date: escapeHtml(t.date),
      startDate: t.startDate ? escapeHtml(t.startDate) : undefined,
      endDate: t.endDate ? escapeHtml(t.endDate) : undefined,
      description: escapeHtml(t.description),
      action: escapeHtml(t.action),
      status: escapeHtml(t.status),
    })),
    cases: (rawData.cases || []).map((c) => ({
      ...c,
      noCase: escapeHtml(c.noCase),
      date: escapeHtml(c.date),
      startDate: c.startDate ? escapeHtml(c.startDate) : undefined,
      endDate: c.endDate ? escapeHtml(c.endDate) : undefined,
      description: escapeHtml(c.description),
      action: escapeHtml(c.action),
    })),
  };
  const isSla = data.reportType === 'SLA';
  const engineName = data.graphType === 'PRTG' ? 'PRTG Network Monitor' : 'Multi Router Traffic Grapher (MRTG)';
  const engineShort = data.graphType === 'PRTG' ? 'PRTG Network Monitor' : 'Multi Router Traffic Grapher';
  const trafficDirection = data.trafficDirection || 'NORMAL';
  const dlLabel = trafficDirection === 'NORMAL' ? 'Inbound' : 'Outbound';
  const ulLabel = trafficDirection === 'NORMAL' ? 'Outbound' : 'Inbound';

  const dlAvgStr = data.dlAvg !== undefined ? `${data.dlAvg} ${data.dlUnit || 'Mbps'}` : '-';
  const dlMaxStr = data.dlMax !== undefined ? `${data.dlMax} ${data.dlUnit || 'Mbps'}` : '-';
  const ulAvgStr = data.ulAvg !== undefined ? `${data.ulAvg} ${data.ulUnit || 'Mbps'}` : '-';
  const ulMaxStr = data.ulMax !== undefined ? `${data.ulMax} ${data.ulUnit || 'Mbps'}` : '-';

  // SLA calculations
  // SLA calculations with robust bilingual month parsing (Indonesian & English)
  const [periodMonthStr, periodYearStr] = (data.reportPeriod || '').trim().split(/\s+/);
  const monthMap: Record<string, number> = {
    // English
    january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
    april: 4, apr: 4, may: 5, june: 6, jun: 6,
    july: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9,
    october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
    // Indonesian
    januari: 1, februari: 2, maret: 3, mei: 5, juni: 6, juli: 7,
    agustus: 8, agt: 8, ags: 8, oktober: 10, okt: 10, nopember: 11,
    desember: 12, des: 12,
  };

  const currentDate = new Date();
  let month = currentDate.getMonth() + 1;
  let year = currentDate.getFullYear();

  if (periodMonthStr) {
    const cleanKey = periodMonthStr.toLowerCase().replace(/[^a-z]/g, '');
    if (monthMap[cleanKey]) {
      month = monthMap[cleanKey];
    } else {
      const parsedM = parseInt(cleanKey, 10);
      if (!isNaN(parsedM) && parsedM >= 1 && parsedM <= 12) {
        month = parsedM;
      }
    }
  }

  if (periodYearStr) {
    const parsedY = parseInt(periodYearStr.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(parsedY) && parsedY >= 2000 && parsedY <= 2100) {
      year = parsedY;
    }
  }

  const slaCalc = calculateSla(data.cases || [], data.tickets || [], year, month);

  // Backgrounds & Badges
  const coverBg = getAssetAsBase64(isSla ? '/assets/templates/cover_sla.png' : '/assets/templates/cover_mrtg.png');
  const pageBg = getAssetAsBase64('/assets/templates/page_bg.png');
  const sampleGraph = getAssetAsBase64('/assets/templates/sample_graph.png');
  const confidentialBadge = getAssetAsBase64('/assets/templates/confidential_badge.png');
  const graphImg = data.graphImage || sampleGraph;

  const tickets = (data.tickets || []).filter(t => t.noTicket && t.noTicket.trim() !== '');
  const cases = (data.cases || []).filter(c => c.noCase && c.noCase.trim() !== '');

  // Dynamic pagination decision:
  // If tickets + cases > 4 or tickets > 3 or cases > 3, split tables across Page 2 & Page 3,
  // pushing MRTG/PRTG graph to Page 4 so it never overflows or touches the footer.
  const isMultiPageTables = isSla && (tickets.length + cases.length > 4 || tickets.length > 3 || cases.length > 3);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>REPORT ${data.reportType} - ${data.customerName} - ${data.reportPeriod}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      font-family: 'Inter', Arial, "Helvetica Neue", Roboto, sans-serif;
      color: #000000;
      background: #ffffff;
      -webkit-font-smoothing: antialiased;
    }
    .page {
      width: 210mm;
      height: 297mm;
      position: relative;
      page-break-after: always;
      page-break-inside: avoid;
      overflow: hidden;
      background-size: 210mm 297mm;
      background-repeat: no-repeat;
      background-position: top left;
      box-sizing: border-box;
    }

    /* ==================== COVER PAGE ==================== */
    .cover-page {
      padding-top: 106mm;
      padding-left: 15mm;
      padding-right: 15mm;
      text-align: left;
    }
    .confidential-badge {
      position: absolute;
      top: 34.2mm;
      right: 22.5mm;
      width: 30mm;
      height: auto;
      z-index: 10;
    }
    .cover-title-mrtg {
      font-family: 'Poppins', Arial, sans-serif;
      font-size: 28pt;
      font-weight: 700;
      line-height: 1.15;
      color: #ffffff;
      letter-spacing: -0.3px;
      margin-bottom: 12px;
    }
    .cover-title-sla {
      font-family: 'Poppins', Arial, sans-serif;
      font-size: 40pt;
      font-weight: 700;
      line-height: 1.1;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin-bottom: 14px;
    }
    .cover-customer {
      font-size: 13pt;
      font-weight: 400;
      color: #ffffff;
      margin-bottom: 5px;
    }
    .cover-period {
      font-size: 13pt;
      font-weight: 400;
      color: #ffffff;
    }

    /* ==================== CONTENT PAGES ==================== */
    .content-page {
      padding-top: 36mm; /* Safe zone below Kop Surat (header ends at ~32mm) */
      padding-left: 15mm;
      padding-right: 15mm;
      padding-bottom: 30mm; /* Safe zone above Footer alamat (starts at ~265mm) */
    }

    /* Document Number */
    .doc-num-header {
      font-size: 11pt;
      font-weight: 700;
      color: #000000;
      margin-bottom: 14px;
      text-align: left;
    }

    /* Metadata Top Table (MRTG Page 2) */
    .metadata-table {
      width: 100%;
      max-width: 130mm;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11pt;
    }
    .metadata-table td {
      padding: 3px 0;
      vertical-align: top;
      color: #000000;
    }
    .metadata-table td.label {
      width: 44mm;
      font-weight: 400;
      color: #000000;
    }
    .metadata-table td.colon {
      width: 4mm;
      font-weight: 400;
      text-align: center;
    }
    .metadata-table td.value {
      font-weight: 700;
      color: #000000;
      padding-left: 4px;
    }

    /* Section Headings */
    .section-title {
      font-family: 'Poppins', Arial, sans-serif;
      font-size: 11.5pt;
      font-weight: 700;
      color: #000000;
      margin-top: 10px;
      margin-bottom: 4px;
      display: inline-block;
    }
    .section-desc {
      font-size: 8.5pt;
      color: #334155;
      margin-bottom: 5px;
      line-height: 1.3;
    }

    /* Tables - Pure Black Borders & Clean Corporate Styling */
    .data-table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin-bottom: 4px;
      font-size: 8.5pt;
      border: 1px solid #000000;
      word-break: break-word;
    }
    .data-table th {
      background-color: #ffffff;
      color: #000000;
      font-weight: 700;
      border: 1px solid #000000;
      padding: 4px 6px;
      text-align: center;
    }
    .data-table td {
      border: 1px solid #000000;
      padding: 4px 6px;
      color: #000000;
      text-align: center;
    }
    .data-table tr.total-row td {
      font-weight: 700;
      background-color: #ffffff;
      color: #000000;
      border: 1px solid #000000;
    }

    /* Summary labels below tables */
    .table-summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5pt;
      font-weight: 700;
      color: #000000;
      margin-top: 4px;
      margin-bottom: 8px;
    }

    /* SLA Metric Boxes & Dual Progress Bars (Option A) */
    .metric-grid {
      display: flex;
      gap: 10px;
      margin-top: 6px;
      margin-bottom: 8px;
    }
    .metric-card {
      flex: 1;
      border: 1.5px solid #FF9900;
      border-radius: 3px;
      padding: 6px 10px;
      text-align: center;
      background: #ffffff;
    }
    .metric-label {
      font-size: 8.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 15pt;
      font-weight: 800;
      color: #000000;
      margin-top: 1px;
    }

    .sla-progress-card {
      margin-top: 6px;
      margin-bottom: 6px;
    }
    .sla-progress-row {
      margin-bottom: 8px;
    }
    .sla-progress-row:last-child {
      margin-bottom: 0;
    }
    .sla-progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      margin-bottom: 4px;
    }
    .sla-progress-title {
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .sla-progress-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }
    .sla-progress-values {
      font-size: 8pt;
      font-weight: 600;
    }
    .sla-progress-track {
      width: 100%;
      height: 11px;
      background: #fee2e2;
      border-radius: 3px;
      overflow: hidden;
      display: flex;
    }
    .sla-progress-online {
      background: #10b981;
      height: 100%;
    }
    .sla-progress-downtime {
      background: #ef4444;
      height: 100%;
    }
    .sla-progress-target-track {
      width: 100%;
      height: 9px;
      background: #e2e8f0;
      border-radius: 3px;
      overflow: hidden;
    }
    .sla-progress-target-fill {
      background: #0284c7;
      height: 100%;
    }
    .sla-status-text {
      font-size: 8pt;
      font-weight: 700;
    }

    /* MRTG Graph Styles */
    .graph-container {
      width: 100%;
      text-align: center;
      margin: 10px 0;
    }
    .graph-image {
      width: 100%;
      max-width: 180mm;
      height: auto;
      border: 1px solid #cbd5e1;
      border-radius: 2px;
      display: block;
      margin: 0 auto;
    }

    /* Traffic Summary Bullets */
    .traffic-summary {
      margin-top: 14px;
      font-size: 9.5pt;
      line-height: 1.55;
      color: #000000;
      padding-left: 12mm;
    }
    .traffic-bullet {
      margin-bottom: 6px;
      display: flex;
      align-items: flex-start;
    }
    .traffic-bullet .bullet-icon {
      margin-right: 6px;
      font-size: 9pt;
      color: #000000;
      line-height: 1.4;
    }
    .traffic-bullet .bullet-text {
      flex: 1;
    }
    .draft-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 54pt;
      font-weight: 800;
      color: rgba(234, 88, 12, 0.14);
      text-transform: uppercase;
      letter-spacing: 6px;
      pointer-events: none;
      z-index: 100;
      white-space: nowrap;
      font-family: 'Poppins', Arial, sans-serif;
      border: 4px dashed rgba(234, 88, 12, 0.2);
      padding: 8px 36px;
      border-radius: 10px;
    }
  </style>
</head>
<body>
  ${data.isDraft ? '<div class="draft-watermark" style="position: fixed;">DRAFT / PREVIEW</div>' : ''}

  <!-- ==================== PAGE 1: COVER ==================== -->
  <div class="page cover-page" style="background-image: url('${coverBg}');">
    ${confidentialBadge ? `<img class="confidential-badge" src="${confidentialBadge}" alt="Dokumen Rahasia" />` : ''}
    ${!isSla ? `
      <div class="cover-title-mrtg">
        Multi Router Traffic Grapher<br>
        (MRTG) Report
      </div>
    ` : `
      <div class="cover-title-sla">
        SLA REPORT
      </div>
    `}
    <div class="cover-customer">${data.customerName}</div>
    <div class="cover-period">${data.reportPeriod}</div>
  </div>

  ${!isSla ? `
    <!-- ==================== MRTG MODE - PAGE 2: CONTENT ==================== -->
    <div class="page content-page" style="background-image: url('${pageBg}');">
      <!-- Metadata Top Table -->
      <table class="metadata-table">
        <tr>
          <td class="label">Customer Name</td>
          <td class="colon">:</td>
          <td class="value">${data.customerName}</td>
        </tr>
        <tr>
          <td class="label">Customer ID</td>
          <td class="colon">:</td>
          <td class="value">${data.customerId}</td>
        </tr>
        <tr>
          <td class="label">Service ID</td>
          <td class="colon">:</td>
          <td class="value">${data.serviceId}</td>
        </tr>
        <tr>
          <td class="label">Report Period</td>
          <td class="colon">:</td>
          <td class="value">${data.reportPeriod}</td>
        </tr>
        <tr>
          <td class="label">Document Number</td>
          <td class="colon">:</td>
          <td class="value">${data.documentNumber}</td>
        </tr>
      </table>

      <!-- Heading -->
      <div>
        <div class="section-title">${engineName}</div>
      </div>
      <div style="font-size: 11pt; font-weight: 700; color: #000000; margin: 8px 0 6px 0;">
        ● ${engineShort} ${data.reportPeriod} :
      </div>

      <!-- Graph Image -->
      <div class="graph-container">
        <img class="graph-image" src="${graphImg}" alt="MRTG Graph ${data.customerName}" />
      </div>

      <!-- Summary Text -->
      <div class="traffic-summary">
        <div class="traffic-bullet">
          <span class="bullet-icon">○</span>
          <div class="bullet-text">
            <span>Download Traffic (${dlLabel}) : </span>
            ${data.dlAvg !== undefined ? `The average usage is <strong>${dlAvgStr}</strong>, with the maximum usage reaching <strong>${dlMaxStr}</strong>.` : `-`}
          </div>
        </div>
        <div class="traffic-bullet">
          <span class="bullet-icon">○</span>
          <div class="bullet-text">
            <span>Upload Traffic (${ulLabel}) : </span>
            ${data.ulAvg !== undefined ? `The average usage is <strong>${ulAvgStr}</strong>, with the maximum usage reaching <strong>${ulMaxStr}</strong>.` : `-`}
          </div>
        </div>
      </div>
    </div>
  ` : !isMultiPageTables ? `
    <!-- ==================== SLA STANDARD (<=4 items) - PAGE 2: ALL TABLES & SLA SERVICE ==================== -->
    <div class="page content-page" style="background-image: url('${pageBg}');">
      <div class="doc-num-header">
        Document Number : ${data.documentNumber}
      </div>

      <!-- Section 1: Summary Report & Service Availability -->
      <div>
        <div class="section-title">Summary Report & Service Availability</div>
      </div>
      <div class="section-desc">Summary report & detailed service availability for ${data.customerName} ${data.reportPeriod}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35px;">No</th>
            <th style="width: 110px; text-align: left; padding-left: 8px;">Service ID</th>
            <th style="text-align: left; padding-left: 8px;">Service Name</th>
            <th style="width: 50px;">Node</th>
            <th style="width: 85px;">Target SLA</th>
            <th style="width: 85px;">Availability</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td style="text-align: left; padding-left: 8px;">${data.serviceId}</td>
            <td style="text-align: left; padding-left: 8px;">${data.serviceName}</td>
            <td>${data.nodeCount}</td>
            <td>${data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
            <td>${slaCalc.availabilityPercent}%</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" style="text-align: right; padding-right: 14px;">Total</td>
            <td>${data.nodeCount}</td>
            <td>${data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
            <td>${slaCalc.availabilityPercent}%</td>
          </tr>
        </tbody>
      </table>

      <!-- Section 3: Ticket & Case Report -->
      <div>
        <div class="section-title">Ticket & Case Report</div>
      </div>
      <div class="section-desc">Detailed ticket & case report for ${data.customerName} ${data.reportPeriod}</div>

      <!-- Ticket table -->
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">No. Ticket</th>
            <th style="width: 16%;">Date & Time</th>
            <th style="width: 37%;">Description</th>
            <th style="width: 22%;">Action</th>
            <th style="width: 10%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.length === 0 ? `
            <tr>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          ` : tickets.map(t => {
            const period = formatPeriodDisplay(t);
            return `
            <tr>
              <td style="white-space: nowrap;">${t.noTicket}</td>
              <td style="white-space: nowrap; font-size: 7.5pt; line-height: 1.25;">
                <div style="font-weight: 600;">${period.start}</div>
                ${period.end ? `<div style="font-size: 7pt; color: #475569; margin-top: 1px;">s/d ${period.end}</div>` : ''}
              </td>
              <td style="text-align: left; padding-left: 8px;">${t.description}</td>
              <td style="text-align: left; padding-left: 8px;">${t.action}</td>
              <td>${t.status}</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>

      <!-- Ticket Summary -->
      <div class="table-summary-row">
        <span>Number Of Ticket : ${tickets.length === 0 ? '-' : tickets.length}</span>
      </div>

      <!-- Case table -->
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">No. Case</th>
            <th style="width: 16%;">Date & Time</th>
            <th style="width: 37%;">Description</th>
            <th style="width: 22%;">Action</th>
            <th style="width: 10%;">Downtime</th>
          </tr>
        </thead>
        <tbody>
          ${cases.length === 0 ? `
            <tr>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          ` : cases.map(c => {
            const period = formatPeriodDisplay(c);
            return `
            <tr>
              <td>${c.noCase}</td>
              <td style="white-space: nowrap; font-size: 7.5pt; line-height: 1.25;">
                <div style="font-weight: 600;">${period.start}</div>
                ${period.end ? `<div style="font-size: 7pt; color: #475569; margin-top: 1px;">s/d ${period.end}</div>` : ''}
              </td>
              <td style="text-align: left; padding-left: 8px;">${c.description}</td>
              <td style="text-align: left; padding-left: 8px;">${c.action}</td>
              <td>${c.downtimeMinutes} Mins</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>

      <!-- Case Summary & Downtime Duration -->
      <div class="table-summary-row">
        <span>Number Of Case : ${cases.length === 0 ? '-' : cases.length}</span>
        <span>Downtime Duration : ${slaCalc.downtimeDurationStr}</span>
      </div>

      <!-- Section 4: SLA Service (Dual Progress Bar - Option A) -->
      <div>
        <div class="section-title">SLA Service</div>
      </div>
      <div class="section-desc">Detailed SLA Service for ${data.customerName} ${data.reportPeriod} :</div>
      <div class="sla-progress-card">
        <!-- Bar 1: Actual Availability (Online + Downtime) -->
        <div class="sla-progress-row">
          <div class="sla-progress-header">
            <div class="sla-progress-title">
              <span class="sla-progress-dot" style="background-color: #10b981;"></span>
              <span>Service Availability</span>
            </div>
            <div class="sla-progress-values">
              <span style="color: #047857; font-weight: 700;">Availability ${slaCalc.onlinePercent.toFixed(2)}%</span>
              <span style="color: #94a3b8; margin: 0 5px;">|</span>
              <span style="color: #dc2626; font-weight: 700;">Downtime ${slaCalc.downtimePercent.toFixed(2)}%</span>
            </div>
          </div>
          <div class="sla-progress-track">
            <div class="sla-progress-online" style="width: ${Math.min(100, Math.max(0, slaCalc.onlinePercent))}%;"></div>
            <div class="sla-progress-downtime" style="width: ${Math.min(100, Math.max(0, slaCalc.downtimePercent))}%;"></div>
          </div>
        </div>

        <!-- Bar 2: Target SLA & Status Text -->
        <div class="sla-progress-row">
          <div class="sla-progress-header">
            <div class="sla-progress-title">
              <span class="sla-progress-dot" style="background-color: #0284c7;"></span>
              <span>Target SLA : <strong style="color: #0284c7;">${data.targetSla > 0 ? `${data.targetSla.toFixed(2)}%` : '-'}</strong></span>
            </div>
            <div>
              ${data.targetSla > 0 ? (
                slaCalc.onlinePercent >= data.targetSla ? `
                  <span class="sla-status-text" style="color: #047857;">SLA Met (+${(slaCalc.onlinePercent - data.targetSla).toFixed(2)}%)</span>
                ` : `
                  <span class="sla-status-text" style="color: #dc2626;">SLA Breached (-${(data.targetSla - slaCalc.onlinePercent).toFixed(2)}%)</span>
                `
              ) : `
                <span class="sla-status-text" style="color: #64748b;">-</span>
              `}
            </div>
          </div>
          <div class="sla-progress-target-track">
            <div class="sla-progress-target-fill" style="width: ${Math.min(100, Math.max(0, data.targetSla > 0 ? data.targetSla : 100))}%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SLA STANDARD - PAGE 3: MRTG / PRTG GRAPH ==================== -->
    <div class="page content-page" style="background-image: url('${pageBg}');">
      <div>
        <div class="section-title">${engineName}</div>
      </div>
      <div style="font-size: 11pt; font-weight: 700; color: #000000; margin: 8px 0 6px 0;">
        ${engineShort} ${data.customerName} ${data.reportPeriod} :
      </div>

      <!-- Graph Image -->
      <div class="graph-container">
        <img class="graph-image" src="${graphImg}" alt="MRTG Graph ${data.customerName}" />
      </div>

      <!-- Summary Text -->
      <div class="traffic-summary">
        <div class="traffic-bullet">
          <span class="bullet-icon">○</span>
          <div class="bullet-text">
            <span>Download Traffic (${dlLabel}) : </span>
            ${data.dlAvg !== undefined ? `The average usage is <strong>${dlAvgStr}</strong>, with the maximum usage reaching <strong>${dlMaxStr}</strong>.` : `-`}
          </div>
        </div>
        <div class="traffic-bullet">
          <span class="bullet-icon">○</span>
          <div class="bullet-text">
            <span>Upload Traffic (${ulLabel}) : </span>
            ${data.ulAvg !== undefined ? `The average usage is <strong>${ulAvgStr}</strong>, with the maximum usage reaching <strong>${ulMaxStr}</strong>.` : `-`}
          </div>
        </div>
      </div>
    </div>
  ` : `
    <!-- ==================== SLA EXTENDED (>4 items) - PAGE 2: SUMMARY, AVAILABILITY & TICKETS ==================== -->
    <div class="page content-page" style="background-image: url('${pageBg}');">
      <div class="doc-num-header">
        Document Number : ${data.documentNumber}
      </div>

      <!-- Section 1: Summary Report & Service Availability -->
      <div>
        <div class="section-title">Summary Report & Service Availability</div>
      </div>
      <div class="section-desc">Summary report & detailed service availability for ${data.customerName} ${data.reportPeriod}</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35px;">No</th>
            <th style="width: 110px; text-align: left; padding-left: 8px;">Service ID</th>
            <th style="text-align: left; padding-left: 8px;">Service Name</th>
            <th style="width: 50px;">Node</th>
            <th style="width: 85px;">Target SLA</th>
            <th style="width: 85px;">Availability</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td style="text-align: left; padding-left: 8px;">${data.serviceId}</td>
            <td style="text-align: left; padding-left: 8px;">${data.serviceName}</td>
            <td>${data.nodeCount}</td>
            <td>${data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
            <td>${slaCalc.availabilityPercent}%</td>
          </tr>
          <tr class="total-row">
            <td colspan="3" style="text-align: right; padding-right: 14px;">Total</td>
            <td>${data.nodeCount}</td>
            <td>${data.targetSla > 0 ? `${data.targetSla}%` : '-'}</td>
            <td>${slaCalc.availabilityPercent}%</td>
          </tr>
        </tbody>
      </table>

      <!-- Section 3: Ticket Report -->
      <div>
        <div class="section-title">Ticket Report</div>
      </div>
      <div class="section-desc">Detailed ticket report for ${data.customerName} ${data.reportPeriod}</div>

      <!-- Ticket table -->
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">No. Ticket</th>
            <th style="width: 16%;">Date & Time</th>
            <th style="width: 37%;">Description</th>
            <th style="width: 22%;">Action</th>
            <th style="width: 10%;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.length === 0 ? `
            <tr>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          ` : tickets.map(t => {
            const period = formatPeriodDisplay(t);
            return `
            <tr>
              <td style="white-space: nowrap;">${t.noTicket}</td>
              <td style="white-space: nowrap; font-size: 7.5pt; line-height: 1.25;">
                <div style="font-weight: 600;">${period.start}</div>
                ${period.end ? `<div style="font-size: 7pt; color: #475569; margin-top: 1px;">s/d ${period.end}</div>` : ''}
              </td>
              <td style="text-align: left; padding-left: 8px;">${t.description}</td>
              <td style="text-align: left; padding-left: 8px;">${t.action}</td>
              <td>${t.status}</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>

      <!-- Ticket Summary -->
      <div class="table-summary-row">
        <span>Number Of Ticket : ${tickets.length === 0 ? '-' : tickets.length}</span>
      </div>
    </div>

    <!-- ==================== SLA EXTENDED (>4 items) - PAGE 3: CASES & SLA SERVICE ==================== -->
    <div class="page content-page" style="background-image: url('${pageBg}');">
      <div class="doc-num-header">
        Document Number : ${data.documentNumber} (Continued)
      </div>

      <!-- Section: Case Report -->
      <div>
        <div class="section-title">Case Report</div>
      </div>
      <div class="section-desc">Detailed case report for ${data.customerName} ${data.reportPeriod}</div>

      <!-- Case table -->
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 15%;">No. Case</th>
            <th style="width: 16%;">Date & Time</th>
            <th style="width: 37%;">Description</th>
            <th style="width: 22%;">Action</th>
            <th style="width: 10%;">Downtime</th>
          </tr>
        </thead>
        <tbody>
          ${cases.length === 0 ? `
            <tr>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
              <td>-</td>
            </tr>
          ` : cases.map(c => {
            const period = formatPeriodDisplay(c);
            return `
            <tr>
              <td>${c.noCase}</td>
              <td style="white-space: nowrap; font-size: 7.5pt; line-height: 1.25;">
                <div style="font-weight: 600;">${period.start}</div>
                ${period.end ? `<div style="font-size: 7pt; color: #475569; margin-top: 1px;">s/d ${period.end}</div>` : ''}
              </td>
              <td style="text-align: left; padding-left: 8px;">${c.description}</td>
              <td style="text-align: left; padding-left: 8px;">${c.action}</td>
              <td>${c.downtimeMinutes} Mins</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>

      <!-- Case Summary & Downtime Duration -->
      <div class="table-summary-row">
        <span>Number Of Case : ${cases.length === 0 ? '-' : cases.length}</span>
        <span>Downtime Duration : ${slaCalc.downtimeDurationStr}</span>
      </div>

      <!-- Section: SLA Service (Dual Progress Bar - Option A) -->
      <div style="margin-top: 14px;">
        <div class="section-title">SLA Service</div>
      </div>
      <div class="section-desc">Detailed SLA Service for ${data.customerName} ${data.reportPeriod} :</div>
      <div class="sla-progress-card">
        <!-- Bar 1: Actual Availability (Online + Downtime) -->
        <div class="sla-progress-row">
          <div class="sla-progress-header">
            <div class="sla-progress-title">
              <span class="sla-progress-dot" style="background-color: #10b981;"></span>
              <span>Service Availability</span>
            </div>
            <div class="sla-progress-values">
              <span style="color: #047857; font-weight: 700;">Availability ${slaCalc.onlinePercent.toFixed(2)}%</span>
              <span style="color: #94a3b8; margin: 0 5px;">|</span>
              <span style="color: #dc2626; font-weight: 700;">Downtime ${slaCalc.downtimePercent.toFixed(2)}%</span>
            </div>
          </div>
          <div class="sla-progress-track">
            <div class="sla-progress-online" style="width: ${Math.min(100, Math.max(0, slaCalc.onlinePercent))}%;"></div>
            <div class="sla-progress-downtime" style="width: ${Math.min(100, Math.max(0, slaCalc.downtimePercent))}%;"></div>
          </div>
        </div>

        <!-- Bar 2: Target SLA & Status Text -->
        <div class="sla-progress-row">
          <div class="sla-progress-header">
            <div class="sla-progress-title">
              <span class="sla-progress-dot" style="background-color: #0284c7;"></span>
              <span>Target SLA : <strong style="color: #0284c7;">${data.targetSla > 0 ? `${data.targetSla.toFixed(2)}%` : '-'}</strong></span>
            </div>
            <div>
              ${data.targetSla > 0 ? (
                slaCalc.onlinePercent >= data.targetSla ? `
                  <span class="sla-status-text" style="color: #047857;">SLA Met (+${(slaCalc.onlinePercent - data.targetSla).toFixed(2)}%)</span>
                ` : `
                  <span class="sla-status-text" style="color: #dc2626;">SLA Breached (-${(data.targetSla - slaCalc.onlinePercent).toFixed(2)}%)</span>
                `
              ) : `
                <span class="sla-status-text" style="color: #64748b;">-</span>
              `}
            </div>
          </div>
          <div class="sla-progress-target-track">
            <div class="sla-progress-target-fill" style="width: ${Math.min(100, Math.max(0, data.targetSla > 0 ? data.targetSla : 100))}%;"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== SLA EXTENDED (>4 items) - PAGE 4: MRTG / PRTG GRAPH ==================== -->
    <div class="page content-page" style="background-image: url('${pageBg}');">
      <div>
        <div class="section-title">${engineName}</div>
      </div>
      <div style="font-size: 11pt; font-weight: 700; color: #000000; margin: 8px 0 6px 0;">
        ${engineShort} ${data.customerName} ${data.reportPeriod} :
      </div>

      <!-- Graph Image -->
      <div class="graph-container">
        <img class="graph-image" src="${graphImg}" alt="MRTG Graph ${data.customerName}" />
      </div>

      <!-- Summary Text -->
      <div class="traffic-summary">
        <div class="traffic-bullet">
          <span class="bullet-icon">○</span>
          <div class="bullet-text">
            <span>Download Traffic (${dlLabel}) : </span>
            ${data.dlAvg !== undefined ? `The average usage is <strong>${dlAvgStr}</strong>, with the maximum usage reaching <strong>${dlMaxStr}</strong>.` : `-`}
          </div>
        </div>
        <div class="traffic-bullet">
          <span class="bullet-icon">○</span>
          <div class="bullet-text">
            <span>Upload Traffic (${ulLabel}) : </span>
            ${data.ulAvg !== undefined ? `The average usage is <strong>${ulAvgStr}</strong>, with the maximum usage reaching <strong>${ulMaxStr}</strong>.` : `-`}
          </div>
        </div>
      </div>
    </div>
  `}

</body>
</html>`;
}
