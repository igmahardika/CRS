import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { generatePdfBuffer } from '@/lib/pdf-generator';
import { ReportData } from '@/lib/pdf-template';
import { requireAuth, canUserAccessReport } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

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

    // Check Department & Scoped Access
    const hasAccess = await canUserAccessReport(auth.session, report);
    if (!hasAccess) {
      return NextResponse.json({
        error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengunduh laporan ini.',
      }, { status: 403 });
    }

    const isInline = searchParams.get('inline') === '1' || searchParams.get('preview') === '1';

    // Role-based download gate: Only APPROVED reports can be downloaded.
    // PENDING_APPROVAL or REVISION_NEEDED can be previewed only by SUPERVISOR, ADMIN, or the creator inside NOC.
    const isOwner = report.generatedById === auth.session.id;
    const isDeptReviewer =
      auth.session.role === 'SUPERVISOR' &&
      report.status === 'PENDING_DEPT_APPROVAL' &&
      report.assignedDepartment === auth.session.department;
    const canViewDraft = hasPermission(auth.session, 'report:view_all_status') || isOwner || isDeptReviewer;

    if (report.status !== 'APPROVED' && (!canViewDraft || !isInline)) {
      return NextResponse.json({
        error: `Laporan ini belum disetujui oleh Supervisor (Status saat ini: ${report.status}). Hubungi Supervisor untuk proses approval sebelum mengunduh.`,
      }, { status: 403 });
    }

    const storageDir = path.resolve(process.cwd(), 'storage', 'reports');
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const filename = `REPORT ${report.reportType} - ${report.customerName} - ${report.reportPeriod}.pdf`;
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-');
    const disposition = isInline
      ? `inline; filename="${safeFilename}"`
      : `attachment; filename="${safeFilename}"`;

    const safeBase = report.pdfPath ? path.basename(report.pdfPath) : '';
    const filePath = safeBase ? path.resolve(storageDir, safeBase) : '';

    // Check if physical file exists on disk and is strictly inside storageDir
    if (filePath && filePath.startsWith(storageDir) && fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      return new NextResponse(new Uint8Array(fileBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': disposition,
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
        'Content-Disposition': disposition,
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

