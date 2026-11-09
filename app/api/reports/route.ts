import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { generatePdfBuffer } from '@/lib/pdf-generator';
import { ReportData } from '@/lib/pdf-template';
import { requireAuth, requireOperatorOrAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json({ reports });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    // 1. Create database record
    const created = await prisma.report.create({
      data: {
        reportType: body.reportType,
        graphType: (body.graphType || 'MRTG') as string,
        documentNumber: body.documentNumber,
        customerName: body.customerName,
        customerId: body.customerId,
        serviceId: body.serviceId,
        serviceName: body.serviceName || 'Prime 300 Mbps',
        nodeCount: parseInt(body.nodeCount, 10) || 1,
        targetSla: parseFloat(body.targetSla) || 99.5,
        reportPeriod: body.reportPeriod,
        periodMonth: parseInt(body.periodMonth, 10) || 10,
        periodYear: parseInt(body.periodYear, 10) || 2026,
        graphId: body.graphId || null,
        cactiGraphId: body.cactiGraphId || null,
        prtgSensorId: body.prtgSensorId || null,
        graphImage: body.graphImage || null,
        dlAvg: body.dlAvg !== undefined && body.dlAvg !== null ? parseFloat(body.dlAvg) : null,
        dlMax: body.dlMax !== undefined && body.dlMax !== null ? parseFloat(body.dlMax) : null,
        ulAvg: body.ulAvg !== undefined && body.ulAvg !== null ? parseFloat(body.ulAvg) : null,
        ulMax: body.ulMax !== undefined && body.ulMax !== null ? parseFloat(body.ulMax) : null,
        dlUnit: body.dlUnit || 'Mbps',
        ulUnit: body.ulUnit || 'Mbps',
        trafficDirection: body.trafficDirection || 'NORMAL',
        onlinePercent: body.onlinePercent !== undefined ? parseFloat(body.onlinePercent) : 100.0,
        downtimePercent: body.downtimePercent !== undefined ? parseFloat(body.downtimePercent) : 0.0,
        availabilityPercent: body.availabilityPercent !== undefined ? parseFloat(body.availabilityPercent) : 100.0,
        totalDowntimeMinutes: body.totalDowntimeMinutes || 0,
        downtimeDurationStr: body.downtimeDurationStr || '-',
        tickets: body.tickets ? (typeof body.tickets === 'string' ? body.tickets : JSON.stringify(body.tickets)) : null,
        cases: body.cases ? (typeof body.cases === 'string' ? body.cases : JSON.stringify(body.cases)) : null,
      },
    });

    // 2. Generate and save physical PDF to disk
    try {
      const storageDir = path.join(process.cwd(), 'storage', 'reports');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const reportData: ReportData = {
        reportType: body.reportType,
        graphType: body.graphType || 'MRTG',
        documentNumber: body.documentNumber,
        customerName: body.customerName,
        customerId: body.customerId,
        serviceId: body.serviceId,
        serviceName: body.serviceName || 'Prime 300 Mbps',
        nodeCount: parseInt(body.nodeCount, 10) || 1,
        targetSla: parseFloat(body.targetSla) || 99.5,
        reportPeriod: body.reportPeriod,
        graphImage: body.graphImage || undefined,
        dlAvg: body.dlAvg !== undefined && body.dlAvg !== null ? parseFloat(body.dlAvg) : undefined,
        dlMax: body.dlMax !== undefined && body.dlMax !== null ? parseFloat(body.dlMax) : undefined,
        ulAvg: body.ulAvg !== undefined && body.ulAvg !== null ? parseFloat(body.ulAvg) : undefined,
        ulMax: body.ulMax !== undefined && body.ulMax !== null ? parseFloat(body.ulMax) : undefined,
        dlUnit: body.dlUnit || 'Mbps',
        ulUnit: body.ulUnit || 'Mbps',
        trafficDirection: body.trafficDirection || 'NORMAL',
        tickets: Array.isArray(body.tickets) ? body.tickets : [],
        cases: Array.isArray(body.cases) ? body.cases : [],
      };

      const pdfBuffer = await generatePdfBuffer(reportData);
      const safeDoc = body.documentNumber.replace(/[/\\?%*:|"<>]/g, '-');
      const filename = `REPORT_${body.reportType}_${safeDoc}_${created.id}.pdf`;
      const filePath = path.join(storageDir, filename);

      fs.writeFileSync(filePath, pdfBuffer);

      // Update pdfPath in DB
      await prisma.report.update({
        where: { id: created.id },
        data: { pdfPath: filename },
      });

      return NextResponse.json({
        report: { ...created, pdfPath: filename },
        downloadUrl: `/api/reports/download?id=${created.id}`,
      });
    } catch (pdfErr) {
      console.error('Warning: Could not save physical PDF during report creation:', pdfErr);
      return NextResponse.json({ report: created });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error creating report:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Delete physical file if exists
    if (report.pdfPath) {
      const storageDir = path.join(process.cwd(), 'storage', 'reports');
      const safeBase = path.basename(report.pdfPath);
      const filePath = path.join(storageDir, safeBase);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error(`Failed to delete physical file ${filePath}:`, unlinkErr);
        }
      }
    }

    await prisma.report.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
