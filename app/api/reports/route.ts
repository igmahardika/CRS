import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { generatePdfBuffer } from '@/lib/pdf-generator';
import { ReportData } from '@/lib/pdf-template';
import {
  requireAuth,
  requirePermission,
  getScopedReportIdsForDepartment,
  canUserAccessReport,
} from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { calculateSla, CaseItem, TicketItem } from '@/lib/sla-calculator';
import { sendTelegramNotification } from '@/lib/telegram';
import { ensureUniqueDocumentNumber, getNextUniqueDocumentNumber } from '@/lib/doc-number-server';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    const canViewAllStatus = hasPermission(auth.session, 'report:view_all_status');

    if (id) {
      const report = await prisma.report.findUnique({
        where: { id },
      });
      if (!report) {
        return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });
      }

      const hasAccess = await canUserAccessReport(auth.session, report);
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'Akses ditolak: Anda tidak memiliki wewenang untuk melihat laporan ini.' },
          { status: 403 }
        );
      }

      return NextResponse.json({ report });
    }

    // List reports with department scoping
    const where: any = {};

    if (!canViewAllStatus) {
      // Non-NOC (AE, CX, Finance) can see APPROVED reports requested by their own department,
      // and Supervisor can also see PENDING_DEPT_APPROVAL for their own department.
      const scopedIds = await getScopedReportIdsForDepartment(auth.session.department);
      if (auth.session.role === 'SUPERVISOR') {
        where.OR = [
          { status: 'APPROVED', id: { in: scopedIds } },
          { status: 'PENDING_DEPT_APPROVAL', assignedDepartment: auth.session.department },
        ];
      } else {
        where.status = 'APPROVED';
        where.id = { in: scopedIds };
      }
    }

    const reports = await prisma.report.findMany({
      where,
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
  const auth = await requirePermission('report:create');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    const periodMonth = parseInt(body.periodMonth, 10) || 10;
    const periodYear = parseInt(body.periodYear, 10) || 2026;

    let rawCases: CaseItem[] = [];
    let rawTickets: TicketItem[] = [];
    try {
      rawCases = Array.isArray(body.cases)
        ? body.cases
        : typeof body.cases === 'string'
        ? JSON.parse(body.cases || '[]')
        : [];
      rawTickets = Array.isArray(body.tickets)
        ? body.tickets
        : typeof body.tickets === 'string'
        ? JSON.parse(body.tickets || '[]')
        : [];
    } catch {
      rawCases = [];
      rawTickets = [];
    }

    const computedSla = calculateSla(rawCases, rawTickets, periodYear, periodMonth);

    const onlinePercent = body.onlinePercent !== undefined
      ? parseFloat(body.onlinePercent)
      : computedSla.onlinePercent;
    const downtimePercent = body.downtimePercent !== undefined
      ? parseFloat(body.downtimePercent)
      : computedSla.downtimePercent;
    const availabilityPercent = body.availabilityPercent !== undefined
      ? parseFloat(body.availabilityPercent)
      : computedSla.availabilityPercent;
    const totalDowntimeMinutes = body.totalDowntimeMinutes !== undefined
      ? parseInt(body.totalDowntimeMinutes, 10)
      : computedSla.totalDowntimeMinutes;
    const downtimeDurationStr = body.downtimeDurationStr || computedSla.downtimeDurationStr;

    // Determine approval status
    const isDirectApprove = Boolean(body.directApprove) && (auth.session.role === 'ADMIN' || auth.session.role === 'SUPERVISOR');
    const initialStatus = isDirectApprove ? 'APPROVED' : 'PENDING_APPROVAL';
    const assignedDepartment = String(body.assignedDepartment || 'Internal NOC').trim();

    // Ensure document number is strictly unique and collision-free
    let finalDocNumber = String(body.documentNumber || '').trim();
    if (!finalDocNumber) {
      const allocated = await getNextUniqueDocumentNumber(body.reportType);
      finalDocNumber = allocated.documentNumber;
    } else {
      const uniquenessCheck = await ensureUniqueDocumentNumber(finalDocNumber, body.reportType);
      if (uniquenessCheck.wasCollided) {
        console.warn(`[Report Save] Document number "${finalDocNumber}" was already taken! Auto-allocated unique number: "${uniquenessCheck.documentNumber}"`);
        finalDocNumber = uniquenessCheck.documentNumber;
      }
    }
    body.documentNumber = finalDocNumber;

    // 1. Create database record
    const created = await prisma.report.create({
      data: {
        reportType: body.reportType,
        graphType: (body.graphType || 'MRTG') as string,
        documentNumber: finalDocNumber,
        customerName: body.customerName,
        customerId: body.customerId,
        serviceId: body.serviceId,
        serviceName: body.serviceName || 'Prime 300 Mbps',
        nodeCount: parseInt(body.nodeCount, 10) || 1,
        targetSla: parseFloat(body.targetSla) || 99.5,
        reportPeriod: body.reportPeriod,
        periodMonth,
        periodYear,
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
        onlinePercent,
        downtimePercent,
        availabilityPercent,
        totalDowntimeMinutes,
        downtimeDurationStr,
        tickets: body.tickets ? (typeof body.tickets === 'string' ? body.tickets : JSON.stringify(body.tickets)) : null,
        cases: body.cases ? (typeof body.cases === 'string' ? body.cases : JSON.stringify(body.cases)) : null,
        status: initialStatus,
        assignedDepartment,
        generatedById: auth.session.id,
        generatedByName: auth.session.name,
        nocApprovedById: isDirectApprove ? auth.session.id : null,
        nocApprovedByName: isDirectApprove ? auth.session.name : null,
        nocApprovedAt: isDirectApprove ? new Date() : null,
        deptApprovedById: isDirectApprove ? auth.session.id : null,
        deptApprovedByName: isDirectApprove ? auth.session.name : null,
        deptApprovedAt: isDirectApprove ? new Date() : null,
        approvedById: isDirectApprove ? auth.session.id : null,
        approvedByName: isDirectApprove ? auth.session.name : null,
        approvedAt: isDirectApprove ? new Date() : null,
      },
    });

    // Notify Telegram topic about new report
    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const approvalWorkflowBadge = assignedDepartment === 'Internal NOC'
      ? '1-Tier (Verifikasi Supervisor NOC)'
      : `2-Tier (NOC → Supervisor ${assignedDepartment})`;

    if (initialStatus === 'PENDING_APPROVAL') {
      sendTelegramNotification({
        text:
          `📋 <b>[LAPORAN MASUK ANTRIAN APPROVAL]</b>\n\n` +
          `• <b>Pelanggan:</b> ${body.customerName}\n` +
          `• <b>Service ID:</b> <code>${body.serviceId}</code>\n` +
          `• <b>Tipe:</b> ${body.reportType} (${body.graphType || 'MRTG'})\n` +
          `• <b>Periode:</b> ${body.reportPeriod}\n` +
          `• <b>No. Dokumen:</b> <code>${body.documentNumber}</code>\n` +
          `• <b>Tujuan Dept:</b> <b>${assignedDepartment}</b>\n` +
          `• <b>Alur Approval:</b> <i>${approvalWorkflowBadge}</i>\n` +
          `• <b>Dibuat oleh:</b> ${auth.session.name} (${auth.session.role})\n` +
          `• <b>Waktu:</b> ${nowStr} WIB\n` +
          `• <b>Status:</b> ⏳ <b>Menunggu Verifikasi Supervisor NOC</b>\n\n` +
          `<i>Silakan tinjau dan setujui laporan melalui menu Riwayat & Approval Laporan.</i>`,
      }).catch((e) => console.error('[Telegram Notify Report Created Error]', e));
    } else {
      sendTelegramNotification({
        text:
          `✅ <b>[LAPORAN SELESAI & DISETUJUI LANGSUNG]</b>\n\n` +
          `• <b>Pelanggan:</b> ${body.customerName}\n` +
          `• <b>Service ID:</b> <code>${body.serviceId}</code>\n` +
          `• <b>Tipe:</b> ${body.reportType} (${body.graphType || 'MRTG'})\n` +
          `• <b>Periode:</b> ${body.reportPeriod}\n` +
          `• <b>No. Dokumen:</b> <code>${body.documentNumber}</code>\n` +
          `• <b>Dibuat & Disetujui:</b> ${auth.session.name} (${auth.session.role})\n` +
          `• <b>Waktu:</b> ${nowStr} WIB\n` +
          `• <b>Status:</b> ✅ <b>Approved (Siap Kirim)</b>`,
      }).catch((e) => console.error('[Telegram Notify Report Approved Error]', e));
    }

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

export async function PUT(req: NextRequest) {
  const auth = await requirePermission('report:create');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const id = body.id || body.revisingReportId;

    if (!id) {
      return NextResponse.json({ error: 'Report ID wajib disertakan untuk revisi.' }, { status: 400 });
    }

    const existing = await prisma.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Laporan yang akan direvisi tidak ditemukan.' }, { status: 404 });
    }

    const periodMonth = parseInt(body.periodMonth, 10) || existing.periodMonth;
    const periodYear = parseInt(body.periodYear, 10) || existing.periodYear;

    let rawCases: CaseItem[] = [];
    let rawTickets: TicketItem[] = [];
    try {
      rawCases = Array.isArray(body.cases)
        ? body.cases
        : typeof body.cases === 'string'
        ? JSON.parse(body.cases || '[]')
        : [];
      rawTickets = Array.isArray(body.tickets)
        ? body.tickets
        : typeof body.tickets === 'string'
        ? JSON.parse(body.tickets || '[]')
        : [];
    } catch {
      rawCases = [];
      rawTickets = [];
    }

    const computedSla = calculateSla(rawCases, rawTickets, periodYear, periodMonth);

    const onlinePercent = body.onlinePercent !== undefined
      ? parseFloat(body.onlinePercent)
      : computedSla.onlinePercent;
    const downtimePercent = body.downtimePercent !== undefined
      ? parseFloat(body.downtimePercent)
      : computedSla.downtimePercent;
    const availabilityPercent = body.availabilityPercent !== undefined
      ? parseFloat(body.availabilityPercent)
      : computedSla.availabilityPercent;
    const totalDowntimeMinutes = body.totalDowntimeMinutes !== undefined
      ? parseInt(body.totalDowntimeMinutes, 10)
      : computedSla.totalDowntimeMinutes;
    const downtimeDurationStr = body.downtimeDurationStr || computedSla.downtimeDurationStr;

    // Determine status: if supervisor/admin directly approving during revision, otherwise PENDING_NOC_APPROVAL
    const isDirectApprove = Boolean(body.directApprove) && (auth.session.role === 'ADMIN' || auth.session.role === 'SUPERVISOR');
    const newStatus = isDirectApprove ? 'APPROVED' : 'PENDING_NOC_APPROVAL';

    // 1. Update database record
    const updated = await prisma.report.update({
      where: { id },
      data: {
        reportType: body.reportType || existing.reportType,
        graphType: (body.graphType || existing.graphType) as string,
        customerName: body.customerName || existing.customerName,
        customerId: body.customerId || existing.customerId,
        serviceId: body.serviceId || existing.serviceId,
        serviceName: body.serviceName || existing.serviceName,
        nodeCount: parseInt(body.nodeCount, 10) || existing.nodeCount,
        targetSla: parseFloat(body.targetSla) || existing.targetSla,
        reportPeriod: body.reportPeriod || existing.reportPeriod,
        periodMonth,
        periodYear,
        graphId: body.graphId !== undefined ? body.graphId : existing.graphId,
        cactiGraphId: body.cactiGraphId !== undefined ? body.cactiGraphId : existing.cactiGraphId,
        prtgSensorId: body.prtgSensorId !== undefined ? body.prtgSensorId : existing.prtgSensorId,
        graphImage: body.graphImage !== undefined ? body.graphImage : existing.graphImage,
        dlAvg: body.dlAvg !== undefined && body.dlAvg !== null ? parseFloat(body.dlAvg) : null,
        dlMax: body.dlMax !== undefined && body.dlMax !== null ? parseFloat(body.dlMax) : null,
        ulAvg: body.ulAvg !== undefined && body.ulAvg !== null ? parseFloat(body.ulAvg) : null,
        ulMax: body.ulMax !== undefined && body.ulMax !== null ? parseFloat(body.ulMax) : null,
        dlUnit: body.dlUnit || existing.dlUnit,
        ulUnit: body.ulUnit || existing.ulUnit,
        trafficDirection: body.trafficDirection || existing.trafficDirection,
        onlinePercent,
        downtimePercent,
        availabilityPercent,
        totalDowntimeMinutes,
        downtimeDurationStr,
        tickets: body.tickets ? (typeof body.tickets === 'string' ? body.tickets : JSON.stringify(body.tickets)) : null,
        cases: body.cases ? (typeof body.cases === 'string' ? body.cases : JSON.stringify(body.cases)) : null,
        status: newStatus,
        assignedDepartment: body.assignedDepartment || existing.assignedDepartment,
        rejectionNotes: null, // Cleared after revision
        nocApprovedById: isDirectApprove ? auth.session.id : null,
        nocApprovedByName: isDirectApprove ? auth.session.name : null,
        nocApprovedAt: isDirectApprove ? new Date() : null,
        deptApprovedById: isDirectApprove ? auth.session.id : null,
        deptApprovedByName: isDirectApprove ? auth.session.name : null,
        deptApprovedAt: isDirectApprove ? new Date() : null,
        approvedById: isDirectApprove ? auth.session.id : null,
        approvedByName: isDirectApprove ? auth.session.name : null,
        approvedAt: isDirectApprove ? new Date() : null,
      },
    });

    // 2. Regenerate physical PDF
    try {
      const storageDir = path.join(process.cwd(), 'storage', 'reports');
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      const reportData: ReportData = {
        reportType: updated.reportType as 'MRTG' | 'SLA',
        graphType: (updated.graphType as 'MRTG' | 'PRTG') || 'MRTG',
        documentNumber: updated.documentNumber,
        customerName: updated.customerName,
        customerId: updated.customerId,
        serviceId: updated.serviceId,
        serviceName: updated.serviceName,
        nodeCount: updated.nodeCount,
        targetSla: updated.targetSla,
        reportPeriod: updated.reportPeriod,
        graphImage: updated.graphImage || undefined,
        dlAvg: updated.dlAvg !== null ? updated.dlAvg : undefined,
        dlMax: updated.dlMax !== null ? updated.dlMax : undefined,
        ulAvg: updated.ulAvg !== null ? updated.ulAvg : undefined,
        ulMax: updated.ulMax !== null ? updated.ulMax : undefined,
        dlUnit: updated.dlUnit || 'Mbps',
        ulUnit: updated.ulUnit || 'Mbps',
        trafficDirection: (updated.trafficDirection as 'NORMAL' | 'REVERSED') || 'NORMAL',
        tickets: rawTickets,
        cases: rawCases,
      };

      const pdfBuffer = await generatePdfBuffer(reportData);
      const safeDoc = updated.documentNumber.replace(/[/\\?%*:|"<>]/g, '-');
      const filename = `REPORT_${updated.reportType}_${safeDoc}_${updated.id}.pdf`;
      const filePath = path.join(storageDir, filename);

      fs.writeFileSync(filePath, pdfBuffer);

      await prisma.report.update({
        where: { id: updated.id },
        data: { pdfPath: filename },
      });

      // 3. Notify Telegram
      const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      sendTelegramNotification({
        text:
          `🔄 <b>[DOKUMEN TELAH DIREVISI & DIKIRIM ULANG]</b>\n\n` +
          `• <b>Pelanggan:</b> ${updated.customerName}\n` +
          `• <b>Service ID:</b> <code>${updated.serviceId}</code>\n` +
          `• <b>No. Dokumen:</b> <code>${updated.documentNumber}</code>\n` +
          `• <b>Direvisi oleh:</b> ${auth.session.name} (${auth.session.role})\n` +
          `• <b>Waktu:</b> ${nowStr} WIB\n` +
          `• <b>Status:</b> ⏳ <b>Menunggu Review Supervisor</b>\n\n` +
          `<i>Laporan telah diperbarui sesuai catatan evaluasi dan siap ditinjau kembali di Approval Queue.</i>`,
      }).catch((e) => console.error('[Telegram Notify Report Revised Error]', e));

      return NextResponse.json({
        success: true,
        message: `Laporan "${updated.documentNumber}" berhasil direvisi dan dikirim ulang.`,
        report: { ...updated, pdfPath: filename },
        downloadUrl: `/api/reports/download?id=${updated.id}`,
      });
    } catch (pdfErr) {
      console.error('Warning: Could not save physical PDF during report revision:', pdfErr);
      return NextResponse.json({ report: updated });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error revising report:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requirePermission('report:delete');
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
