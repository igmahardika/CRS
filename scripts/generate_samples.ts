import * as fs from 'fs';
import * as path from 'path';
import { generatePdfBuffer } from '../lib/pdf-generator';
import { ReportData } from '../lib/pdf-template';

async function main() {
  const outputDir = path.join(process.cwd(), 'CONTOH', 'HASIL GENERATE');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 1. Generate SLA Report
  const slaData: ReportData = {
    reportType: 'SLA',
    documentNumber: '188/IMUN.01/SLA/11/2026',
    customerName: 'RSJ. Dr. Soeharto Heerdjan',
    customerId: '01.2180.1124',
    serviceId: '01.2180.1',
    serviceName: 'Prime 300 Mbps',
    nodeCount: 1,
    targetSla: 99.5,
    reportPeriod: 'October 2026',
    trafficDirection: 'REVERSED',
    dlAvg: 14.23,
    dlMax: 57.83,
    ulAvg: 69.38,
    ulMax: 267.75,
    dlUnit: 'Mbps',
    ulUnit: 'Mbps',
    tickets: [],
    cases: [],
  };

  console.log('Generating SLA Report...');
  const slaPdf = await generatePdfBuffer(slaData);
  const slaPath = path.join(outputDir, 'REPORT SLA - RSJ. Dr. Soeharto Heerdjan - November 2026.pdf');
  fs.writeFileSync(slaPath, slaPdf);
  console.log(`Saved SLA Report to ${slaPath} (${slaPdf.length} bytes)`);

  // 2. Generate MRTG Report
  const mrtgData: ReportData = {
    reportType: 'MRTG',
    documentNumber: '51/IMUN.01/MRTG/11/2026',
    customerName: 'Linknet - Site BFI',
    customerId: '01.1496.0624',
    serviceId: '01.1496.31',
    serviceName: 'Metronet 100 Mbps',
    nodeCount: 1,
    targetSla: 99.5,
    reportPeriod: 'October 2026',
    trafficDirection: 'NORMAL',
    dlAvg: undefined,
    dlMax: undefined,
    ulAvg: 222.22,
    ulMax: 1.24,
    dlUnit: 'Mbps',
    ulUnit: 'Kbps',
  };

  console.log('Generating MRTG Report (Linknet)...');
  const mrtgPdf = await generatePdfBuffer(mrtgData);
  const mrtgLinknetPath = path.join(outputDir, 'REPORT MRTG - Linknet - Site BFI - November 2026.pdf');
  fs.writeFileSync(mrtgLinknetPath, mrtgPdf);
  console.log(`Saved MRTG Report to ${mrtgLinknetPath} (${mrtgPdf.length} bytes)`);

  // Also generate MRTG Report for RSJ to overwrite the old one
  const mrtgRsjData: ReportData = {
    reportType: 'MRTG',
    documentNumber: '188/IMUN.01/MRTG/11/2026',
    customerName: 'RSJ. Dr. Soeharto Heerdjan',
    customerId: '01.2180.1124',
    serviceId: '01.2180.1',
    serviceName: 'Prime 300 Mbps',
    nodeCount: 1,
    targetSla: 99.5,
    reportPeriod: 'October 2026',
    trafficDirection: 'REVERSED',
    dlAvg: 14.23,
    dlMax: 57.83,
    ulAvg: 69.38,
    ulMax: 267.75,
    dlUnit: 'Mbps',
    ulUnit: 'Mbps',
  };

  console.log('Generating MRTG Report (RSJ)...');
  const mrtgRsjPdf = await generatePdfBuffer(mrtgRsjData);
  const mrtgRsjPath = path.join(outputDir, 'REPORT MRTG - RSJ. Dr. Soeharto Heerdjan - November 2026.pdf');
  fs.writeFileSync(mrtgRsjPath, mrtgRsjPdf);
  console.log(`Saved MRTG Report to ${mrtgRsjPath} (${mrtgRsjPdf.length} bytes)`);

  console.log('All sample reports generated successfully!');
}

main().catch(err => {
  console.error('Error generating sample reports:', err);
  process.exit(1);
});

