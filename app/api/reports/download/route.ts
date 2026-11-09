import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { generatePdfBuffer } from '@/lib/pdf-generator';
import { ReportData } from '@/lib/pdf-template';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const storageDir = path.resolve(process.cwd(), 'storage', 'reports');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const filename = `REPORT ${report.reportType} - ${report.customerName} - ${report.reportPeriod}.pdf`;
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-');

    const safeBase = report.pdfPath ? path.basename(report.pdfPath) : '';
    const filePath = safeBase ? path.resolve(storageDir, safeBase) : '';

    // Check if physical file exists on disk and is strictly inside storageDir
    if (filePath && filePath.startsWith(storageDir) && fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${safeFilename}"`,
          'Content-Length': String(fileBuffer.length),
          'X-Source': 'physical-storage',
        },
      });
    }

    // Fallback: If physical file doesn't exist on disk, generate it now and cache it to disk
    let parsedTickets = [];
    let parsedCases = [];
    try {
      if (report.tickets) parsedTickets = JSON.parse(report.tickets);
      if (report.cases) parsedCases = JSON.parse(report.cases);
    } catch {
      // ignore
    }

    const reportData: ReportData = {
      reportType: report.reportType as 'MRTG' | 'SLA',
      documentNumber: report.documentNumber,
      customerName: report.customerName,
      customerId: report.customerId,
      serviceId: report.serviceId,
      serviceName: report.serviceName,
      nodeCount: report.nodeCount,
      targetSla: report.targetSla,
      reportPeriod: report.reportPeriod,
      graphImage: report.graphImage || undefined,
      dlAvg: report.dlAvg !== null ? report.dlAvg : undefined,
      dlMax: report.dlMax !== null ? report.dlMax : undefined,
      ulAvg: report.ulAvg !== null ? report.ulAvg : undefined,
      ulMax: report.ulMax !== null ? report.ulMax : undefined,
      dlUnit: report.dlUnit || 'Mbps',
      ulUnit: report.ulUnit || 'Mbps',
      trafficDirection: (report.trafficDirection as 'NORMAL' | 'REVERSED') || 'NORMAL',
      tickets: parsedTickets,
      cases: parsedCases,
    };

    const pdfBuffer = await generatePdfBuffer(reportData);
    const savedFileName = `${safeFilename.replace('.pdf', '')}_${report.id}.pdf`;
    const newFilePath = path.join(storageDir, savedFileName);

    fs.writeFileSync(newFilePath, pdfBuffer);

    // Update database with saved pdfPath
    await prisma.report.update({
      where: { id: report.id },
      data: { pdfPath: savedFileName },
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': String(pdfBuffer.length),
        'X-Source': 'generated-and-saved',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error downloading report PDF:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

