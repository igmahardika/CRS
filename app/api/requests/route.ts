import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendEmail, getDepartmentEmail, getHelpdeskEmail } from '@/lib/email';
import { renderRequestReceivedHtml } from '@/lib/email-templates';
import { requireAuth, requirePermission } from '@/lib/auth';
import { hasPermission, isValidDepartment } from '@/lib/permissions';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const monthShortNames = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
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

    const where: Prisma.ReportRequestWhereInput = {};

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

    // Parse requested periods (accept array of periods or single period)
    let periods: Array<{ month: number; year: number }> = [];
    if (Array.isArray(body.periods) && body.periods.length > 0) {
      periods = body.periods
        .map((p: any) => ({
          month: parseInt(p.month, 10),
          year: parseInt(p.year, 10),
        }))
        .filter((p: { month: number; year: number }) => !isNaN(p.month) && !isNaN(p.year) && p.month >= 1 && p.month <= 12);
    } else if (Array.isArray(body.periodsJson)) {
      periods = body.periodsJson
        .map((p: any) => ({
          month: parseInt(p.month, 10),
          year: parseInt(p.year, 10),
        }))
        .filter((p: { month: number; year: number }) => !isNaN(p.month) && !isNaN(p.year) && p.month >= 1 && p.month <= 12);
    } else {
      const pm = parseInt(body.periodMonth, 10) || new Date().getMonth() + 1;
      const py = parseInt(body.periodYear, 10) || new Date().getFullYear();
      periods = [{ month: pm, year: py }];
    }

    // Sort periods chronologically
    periods.sort((a, b) => a.year - b.year || a.month - b.month);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    // Segregate into past periods vs future/ongoing periods
    const pastPeriods = periods.filter(
      (p) => p.year < currentYear || (p.year === currentYear && p.month < currentMonth)
    );
    const futurePeriods = periods.filter(
      (p) => p.year > currentYear || (p.year === currentYear && p.month >= currentMonth)
    );

    let enrolledRoutine = false;
    // Auto-enroll customer into Monthly Routine if future periods requested or explicit flag
    if ((futurePeriods.length > 0 || isRoutineSchedule) && customerId) {
      await prisma.customer.updateMany({
        where: { id: customerId },
        data: {
          isMonthlyRoutine: true,
          routineGroup: requesterDept,
          routineReportType: reportType,
        },
      }).catch((e) => console.error('[Auto-enroll Routine Error]', e));
      enrolledRoutine = true;
    }

    // Determine target periods for queue creation:
    // If past periods exist, create 1 ticket per past period with status PENDING.
    // If only future periods were selected, create tickets with status SCHEDULED_ROUTINE.
    const periodsToCreate = pastPeriods.length > 0 ? pastPeriods : futurePeriods;
    const initialStatus = pastPeriods.length > 0 ? 'PENDING' : 'SCHEDULED_ROUTINE';

    // Generate unique sequential ticket numbers: REQ-YYYYMM-XXXX with transaction & collision retry
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `REQ-${yyyy}${mm}-`;

    let createdRequests: any[] = [];
    let attempts = 0;

    while (createdRequests.length === 0 && attempts < 5) {
      try {
        createdRequests = await prisma.$transaction(async (tx) => {
          const existingRequests = await tx.reportRequest.findMany({
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

          const results = [];
          for (let i = 0; i < periodsToCreate.length; i++) {
            const targetPeriod = periodsToCreate[i];
            const nextSeq = String(maxSeq + 1 + i + attempts).padStart(4, '0');
            const ticketNumber = `${prefix}${nextSeq}`;
            const emailThreadMessageId = `<${ticketNumber}@crs.nexa.net.id>`;

            const reqRecord = await tx.reportRequest.create({
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
                periodMonth: targetPeriod.month,
                periodYear: targetPeriod.year,
                periodsJson: JSON.stringify([targetPeriod]),
                urgency,
                notes,
                status: initialStatus,
                emailThreadMessageId,
              },
            });
            results.push(reqRecord);
          }
          return results;
        });
      } catch (err: any) {
        if (err.code === 'P2002') {
          attempts++;
        } else {
          throw err;
        }
      }
    }

    if (!createdRequests || createdRequests.length === 0) {
      throw new Error('Gagal mengalokasikan nomor tiket unik setelah beberapa percobaan.');
    }

    const firstReq = createdRequests[0];
    const periodLabel = createdRequests.length === 1
      ? `${monthNames[firstReq.periodMonth - 1]} ${firstReq.periodYear}`
      : `${createdRequests.length} Periods (${createdRequests.map((r) => `${monthShortNames[r.periodMonth - 1]} ${r.periodYear}`).join(', ')})`;
    const urgencyBadge = urgency === 'URGENT' ? '🔴 <b>URGENT (Butuh Cepat)</b>' : '🟢 Normal';

    const ticketSummaryText = createdRequests.length === 1
      ? `• <b>No. Tiket:</b> <code>${firstReq.ticketNumber}</code>\n`
      : `• <b>No. Tiket (${createdRequests.length} Permintaan Terpisah):</b>\n` +
        createdRequests
          .map((r) => `  - <code>${r.ticketNumber}</code>: ${monthNames[r.periodMonth - 1]} ${r.periodYear}`)
          .join('\n') + '\n';

    // Notify Telegram group topic
    sendTelegramNotification({
      text:
        `📥 <b>[PERMINTAAN LAPORAN BARU DITERIMA]</b>\n\n` +
        ticketSummaryText +
        `• <b>Pemohon:</b> ${firstReq.requesterName} (${firstReq.requesterDept})\n` +
        (firstReq.salesPicName ? `• <b>PIC Sales:</b> ${firstReq.salesPicName}\n` : '') +
        (firstReq.cePicName ? `• <b>PIC CE:</b> ${firstReq.cePicName}\n` : '') +
        (firstReq.requesterEmail ? `• <b>Email/Kontak:</b> ${firstReq.requesterEmail}\n` : '') +
        `• <b>Pelanggan:</b> <b>${firstReq.customerName}</b>\n` +
        (firstReq.serviceId ? `• <b>Service ID:</b> <code>${firstReq.serviceId}</code>\n` : '') +
        `• <b>Tipe Laporan:</b> ${firstReq.reportType}\n` +
        `• <b>Periode:</b> ${periodLabel}\n` +
        `• <b>Urgensi:</b> ${urgencyBadge}\n` +
        (enrolledRoutine ? `• <b>Jadwal Rutin:</b> 🗓️ Terdaftar Jadwal Rutin Bulanan (${futurePeriods.length} bulan mendatang)\n` : '') +
        `• <b>Catatan Pemohon:</b> <i>${firstReq.notes || '-'}</i>\n\n` +
        `<i>Permintaan telah masuk antrean sistem. Staf dapat memproses melalui menu Antrean & Jadwal > Antrean Permintaan.</i>`,
    }).catch((e) => console.error('[Telegram Notify Request Error]', e));

    // Send Threaded Email (Milestone 1)
    (async () => {
      try {
        const deptEmail = await getDepartmentEmail(firstReq.requesterDept);
        const helpdeskEmail = await getHelpdeskEmail();

        // CC list: Helpdesk always receives copy + requesterEmail or salesPicEmail if valid
        const ccSet = new Set<string>();
        if (helpdeskEmail) ccSet.add(helpdeskEmail);
        if (firstReq.requesterEmail && firstReq.requesterEmail.includes('@')) {
          ccSet.add(firstReq.requesterEmail.trim().toLowerCase());
        }
        if (firstReq.salesPicEmail && firstReq.salesPicEmail.includes('@')) {
          ccSet.add(firstReq.salesPicEmail.trim().toLowerCase());
        }
        if (firstReq.cePicEmail && firstReq.cePicEmail.includes('@')) {
          ccSet.add(firstReq.cePicEmail.trim().toLowerCase());
        }
        // Remove recipient from CC if identical
        ccSet.delete(deptEmail.toLowerCase());

        const origin = req.nextUrl.origin || 'http://localhost:3000';
        const appUrl = `${origin}/requests?ticket=${encodeURIComponent(firstReq.ticketNumber)}`;

        const emailHtml = renderRequestReceivedHtml({
          ticketNumber: createdRequests.length === 1
            ? firstReq.ticketNumber
            : `${firstReq.ticketNumber} (+${createdRequests.length - 1} more)`,
          customerName: firstReq.customerName,
          serviceId: firstReq.serviceId,
          reportType: firstReq.reportType,
          period: periodLabel,
          urgency: firstReq.urgency,
          requesterName: firstReq.requesterName,
          requesterDept: firstReq.requesterDept,
          salesPicName: firstReq.salesPicName,
          cePicName: firstReq.cePicName,
          notes: firstReq.notes,
          appUrl,
        });

        await sendEmail({
          to: deptEmail,
          cc: Array.from(ccSet),
          subject: `[${firstReq.ticketNumber}] Report Request ${firstReq.reportType} - ${firstReq.customerName} (${periodLabel})`,
          html: emailHtml,
          ticketNumber: firstReq.ticketNumber,
          messageId: firstReq.emailThreadMessageId || undefined,
        });
      } catch (emailErr) {
        console.error('[Send Request Email Error]', emailErr);
      }
    })();

    return NextResponse.json({
      success: true,
      message: createdRequests.length > 1
        ? `Successfully generated ${createdRequests.length} request tickets in queue.${enrolledRoutine ? ' Customer also enrolled in Monthly Routine Schedule.' : ''}`
        : (initialStatus === 'SCHEDULED_ROUTINE'
          ? 'Report request submitted and scheduled in Monthly Calendar.'
          : 'Report request submitted successfully.'),
      count: createdRequests.length,
      request: firstReq,
      requests: createdRequests,
      enrolledRoutine,
      futurePeriodsCount: futurePeriods.length,
      pastPeriodsCount: pastPeriods.length,
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

    // Rule: if ticket is already CANCELLED, only SUPERVISOR or ADMIN can reactivate it
    if (existingRequest.status === 'CANCELLED' && status !== 'CANCELLED') {
      const isSupervisorOrAdmin = auth.session.role === 'ADMIN' || auth.session.role === 'SUPERVISOR';
      if (!isSupervisorOrAdmin) {
        return NextResponse.json({
          error: 'Akses ditolak: Hanya Supervisor atau Administrator yang dapat membuka kembali tiket yang telah dibatalkan.',
        }, { status: 403 });
      }
    }

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


