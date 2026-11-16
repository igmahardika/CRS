import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendEmail, getDepartmentEmail, getHelpdeskEmail } from '@/lib/email';
import { renderRequestReceivedHtml } from '@/lib/email-templates';
import { requireAuth, requirePermission } from '@/lib/auth';
import { hasPermission, isValidDepartment } from '@/lib/permissions';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

    // Department Scoping: Non-NOC only sees requests belonging to their department
    const canViewAll = hasPermission(auth.session, 'request:view_all');
    if (!canViewAll) {
      where.requesterDept = auth.session.department;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { ticketNumber: { contains: q } },
        { customerName: { contains: q } },
        { requesterName: { contains: q } },
        { requesterDept: { contains: q } },
        { serviceId: { contains: q } },
      ];
    }

    const requests = await prisma.reportRequest.findMany({
      where,
      orderBy: [
        { urgency: 'desc' }, // URGENT first
        { createdAt: 'desc' },
      ],
      take: 200,
    });

    // Collect linked report IDs to enrich report status (APPROVED / PENDING_APPROVAL)
    const reportIds = new Set<string>();
    for (const r of requests) {
      if (r.processedReportId) reportIds.add(r.processedReportId);
      if (r.processedSlaReportId) reportIds.add(r.processedSlaReportId);
      if (r.processedMrtgReportId) reportIds.add(r.processedMrtgReportId);
    }

    const linkedReports = reportIds.size > 0
      ? await prisma.report.findMany({
          where: { id: { in: Array.from(reportIds) } },
          select: { id: true, status: true, documentNumber: true },
        })
      : [];

    const reportStatusMap = new Map(linkedReports.map((rp) => [rp.id, rp]));

    const enrichedRequests = requests.map((r) => {
      const mainReport = r.processedReportId ? reportStatusMap.get(r.processedReportId) : null;
      const slaReport = r.processedSlaReportId ? reportStatusMap.get(r.processedSlaReportId) : null;
      const mrtgReport = r.processedMrtgReportId ? reportStatusMap.get(r.processedMrtgReportId) : null;

      const isReportApproved =
        (mainReport && mainReport.status === 'APPROVED') ||
        (slaReport && slaReport.status === 'APPROVED') ||
        (mrtgReport && mrtgReport.status === 'APPROVED');

      return {
        ...r,
        processedReportStatus: mainReport?.status || null,
        processedReportDocNum: mainReport?.documentNumber || null,
        processedSlaStatus: slaReport?.status || null,
        processedMrtgStatus: mrtgReport?.status || null,
        isApproved: Boolean(isReportApproved),
      };
    });

    return NextResponse.json({ requests: enrichedRequests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Requests GET]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission('request:create');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();

    const requesterName = String(body.requesterName || auth.session.name || '').trim();
    // Enforce department from session if not ADMIN; if ADMIN allow valid department override
    let requesterDept = auth.session.department || 'Network Operation';
    if (auth.session.role === 'ADMIN' && body.requesterDept && isValidDepartment(body.requesterDept)) {
      requesterDept = body.requesterDept;
    }

    const customerName = String(body.customerName || '').trim();
    const reportType = String(body.reportType || 'SLA').toUpperCase();
    const periodMonth = parseInt(body.periodMonth, 10) || new Date().getMonth() + 1;
    const periodYear = parseInt(body.periodYear, 10) || new Date().getFullYear();
    const periodsJson = body.periodsJson ? JSON.stringify(body.periodsJson) : null;
    const urgency = body.urgency === 'URGENT' ? 'URGENT' : 'NORMAL';
    const notes = String(body.notes || '').trim() || null;
    const requesterEmail = body.requesterEmail ? String(body.requesterEmail).trim() : (auth.session.email || null);
    const customerId = body.customerId ? String(body.customerId).trim() : null;
    const serviceId = body.serviceId ? String(body.serviceId).trim() : null;
    const salesPicName = body.salesPicName ? String(body.salesPicName).trim() : null;
    const salesPicEmail = body.salesPicEmail ? String(body.salesPicEmail).trim().toLowerCase() : null;
    const cePicName = body.cePicName ? String(body.cePicName).trim() : null;
    const cePicEmail = body.cePicEmail ? String(body.cePicEmail).trim().toLowerCase() : null;
    const isRoutineSchedule = Boolean(body.isRoutineSchedule);

    if (!requesterName || !customerName) {
      return NextResponse.json({
        error: 'Nama pemohon dan nama pelanggan wajib diisi.',
      }, { status: 400 });
    }

    // Generate unique sequential ticket number: REQ-YYYYMM-XXXX
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `REQ-${yyyy}${mm}-`;

    const existingRequests = await prisma.reportRequest.findMany({
      where: {
        ticketNumber: {
          startsWith: prefix,
        },
      },
      select: {
        ticketNumber: true,
      },
    });

    let maxSeq = 0;
    for (const r of existingRequests) {
      const parts = r.ticketNumber.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }

    const nextSeq = String(maxSeq + 1).padStart(4, '0');
    const ticketNumber = `${prefix}${nextSeq}`;
    const emailThreadMessageId = `<${ticketNumber}@genre.nexa.net.id>`;

    // If requested for future schedule / routine, auto-enroll customer into Monthly Routine
    if (isRoutineSchedule && customerId) {
      await prisma.customer.updateMany({
        where: { id: customerId },
        data: {
          isMonthlyRoutine: true,
          routineGroup: requesterDept,
          routineReportType: reportType,
          salesPicName: salesPicName || undefined,
          cePicName: cePicName || undefined,
        },
      }).catch((e) => console.error('[Auto-enroll Routine Error]', e));
    }

    const initialStatus = isRoutineSchedule ? 'SCHEDULED_ROUTINE' : 'PENDING';

    const created = await prisma.reportRequest.create({
      data: {
        ticketNumber,
        requesterUserId: auth.session.id,
        requesterName,
        requesterEmail,
        requesterDept,
        salesPicName,
        salesPicEmail,
        cePicName,
        cePicEmail,
        reportType,
        customerName,
        customerId,
        serviceId,
        periodMonth,
        periodYear,
        periodsJson,
        urgency,
        notes,
        status: initialStatus,
        emailThreadMessageId,
      },
    });

    // Notify Telegram group topic
    const monthName = monthNames[periodMonth - 1] || `Bulan ${periodMonth}`;
    const periodLabel = periodsJson
      ? `${monthName} ${periodYear} (Multi-Bulan)`
      : `${monthName} ${periodYear}`;
    const urgencyBadge = urgency === 'URGENT' ? '🔴 <b>URGENT (Butuh Cepat)</b>' : '🟢 Normal';

    sendTelegramNotification({
      text:
        `📥 <b>[PERMINTAAN LAPORAN BARU DITERIMA]</b>\n\n` +
        `• <b>No. Tiket:</b> <code>${created.ticketNumber}</code>\n` +
        `• <b>Pemohon:</b> ${created.requesterName} (${created.requesterDept})\n` +
        (created.salesPicName ? `• <b>PIC Sales:</b> ${created.salesPicName}\n` : '') +
        (created.cePicName ? `• <b>PIC CE:</b> ${created.cePicName}\n` : '') +
        (created.requesterEmail ? `• <b>Email/Kontak:</b> ${created.requesterEmail}\n` : '') +
        `• <b>Pelanggan:</b> <b>${created.customerName}</b>\n` +
        (created.serviceId ? `• <b>Service ID:</b> <code>${created.serviceId}</code>\n` : '') +
        `• <b>Tipe Laporan:</b> ${created.reportType}\n` +
        `• <b>Periode:</b> ${periodLabel}\n` +
        `• <b>Urgensi:</b> ${urgencyBadge}\n` +
        (isRoutineSchedule ? `• <b>Jadwal:</b> 🗓️ Terjadwal Rutin Bulanan\n` : '') +
        `• <b>Catatan Pemohon:</b> <i>${created.notes || '-'}</i>\n\n` +
        `<i>Permintaan telah masuk antrean sistem. Staf dapat memproses melalui menu Antrean & Jadwal > Antrean Permintaan.</i>`,
    }).catch((e) => console.error('[Telegram Notify Request Error]', e));

    // Send Threaded Email (Milestone 1)
    (async () => {
      try {
        const deptEmail = await getDepartmentEmail(created.requesterDept);
        const helpdeskEmail = await getHelpdeskEmail();

        // CC list: Helpdesk always receives copy + requesterEmail or salesPicEmail if valid
        const ccSet = new Set<string>();
        if (helpdeskEmail) ccSet.add(helpdeskEmail);
        if (created.requesterEmail && created.requesterEmail.includes('@')) {
          ccSet.add(created.requesterEmail.trim().toLowerCase());
        }
        if (created.salesPicEmail && created.salesPicEmail.includes('@')) {
          ccSet.add(created.salesPicEmail.trim().toLowerCase());
        }
        if (created.cePicEmail && created.cePicEmail.includes('@')) {
          ccSet.add(created.cePicEmail.trim().toLowerCase());
        }
        // Remove recipient from CC if identical
        ccSet.delete(deptEmail.toLowerCase());

        const origin = req.nextUrl.origin || 'http://localhost:3000';
        const appUrl = `${origin}/requests?ticket=${encodeURIComponent(created.ticketNumber)}`;

        const emailHtml = renderRequestReceivedHtml({
          ticketNumber: created.ticketNumber,
          customerName: created.customerName,
          serviceId: created.serviceId,
          reportType: created.reportType,
          period: periodLabel,
          urgency: created.urgency,
          requesterName: created.requesterName,
          requesterDept: created.requesterDept,
          salesPicName: created.salesPicName,
          cePicName: created.cePicName,
          notes: created.notes,
          appUrl,
        });

        await sendEmail({
          to: deptEmail,
          cc: Array.from(ccSet),
          subject: `[GENRE - Tiket ${created.ticketNumber}] Permintaan Laporan ${created.reportType} - ${created.customerName} (${periodLabel})`,
          html: emailHtml,
          ticketNumber: created.ticketNumber,
          messageId: emailThreadMessageId,
        });
      } catch (emailErr) {
        console.error('[Send Request Email Error]', emailErr);
      }
    })();

    return NextResponse.json({
      success: true,
      message: isRoutineSchedule
        ? 'Permintaan laporan berhasil disubmit dan dijadwalkan ke Kalender Rutin Bulanan.'
        : 'Permintaan laporan berhasil disubmit.',
      request: created,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Requests POST]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { id, status, processedReportId, processedMrtgReportId, processedSlaReportId } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status wajib disertakan.' }, { status: 400 });
    }

    const existingRequest = await prisma.reportRequest.findUnique({
      where: { id },
    });

    if (!existingRequest) {
      return NextResponse.json({ error: 'Tiket permintaan tidak ditemukan.' }, { status: 404 });
    }

    const canProcess = hasPermission(auth.session, 'request:process');
    const canCancelOwn = hasPermission(auth.session, 'request:cancel_own');

    // If user is not NOC/Admin, they can ONLY cancel a PENDING request belonging to their department
    if (!canProcess) {
      if (
        canCancelOwn &&
        status === 'CANCELLED' &&
        existingRequest.status === 'PENDING' &&
        existingRequest.requesterDept === auth.session.department
      ) {
        // Allowed to cancel own pending ticket
      } else {
        return NextResponse.json({
          error: 'Akses ditolak: Hanya tim operasional yang dapat memproses antrean permintaan.',
        }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {
      status,
      processedById: auth.session.id,
      processedByName: auth.session.name,
    };
    if (processedReportId !== undefined) updateData.processedReportId = processedReportId || null;
    if (processedMrtgReportId !== undefined) updateData.processedMrtgReportId = processedMrtgReportId || null;
    if (processedSlaReportId !== undefined) updateData.processedSlaReportId = processedSlaReportId || null;

    const updated = await prisma.reportRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      request: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Requests PATCH]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


