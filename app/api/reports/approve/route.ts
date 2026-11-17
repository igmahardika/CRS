import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requirePermission } from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';
import { sendEmail, getDepartmentEmail, getHelpdeskEmail } from '@/lib/email';
import { renderApprovalNeededHtml, renderReportApprovedHtml } from '@/lib/email-templates';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('report:approve');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Laporan wajib disertakan.' }, { status: 400 });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
    }

    const isNocUser = auth.session.department === 'Network Operation';
    const isAdmin = auth.session.role === 'ADMIN';
    const currentStatus = report.status;
    const assignedDept = report.assignedDepartment || 'Internal NOC';
    const isInternalOnly = !assignedDept || assignedDept === 'Internal NOC' || assignedDept === 'Network Operation';

    let nextStatus = 'APPROVED';
    let updateData: Prisma.ReportUpdateInput = {};
    let notificationText = '';
    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // TIER 1: Technical Verification by NOC Supervisor
    if (currentStatus === 'PENDING_NOC_APPROVAL' || currentStatus === 'PENDING_APPROVAL') {
      if (!isNocUser && !isAdmin) {
        return NextResponse.json({
          error: 'Akses ditolak: Verifikasi teknis tahap 1 hanya dapat disetujui oleh Supervisor NOC.',
        }, { status: 403 });
      }

      // Four-Eyes Principle / Anti Self-Approval Check
      if (!isAdmin && report.generatedById && report.generatedById === auth.session.id) {
        return NextResponse.json({
          error: 'Akses ditolak (Four-Eyes Principle): Anda tidak dapat menyetujui laporan yang Anda buat sendiri. Wajib diverifikasi oleh Supervisor lain.',
        }, { status: 403 });
      }

      if (isInternalOnly) {
        // 1-Tier Approval: No external department authorization required -> Final Approved immediately
        nextStatus = 'APPROVED';
        updateData = {
          status: nextStatus,
          nocApprovedById: auth.session.id,
          nocApprovedByName: auth.session.name,
          nocApprovedAt: new Date(),
          deptApprovedById: auth.session.id,
          deptApprovedByName: auth.session.name,
          deptApprovedAt: new Date(),
          approvedById: auth.session.id,
          approvedByName: auth.session.name,
          approvedAt: new Date(),
          rejectionNotes: null,
        };

        notificationText =
          `🏆 <b>FINAL REPORT APPROVED (INTERNAL NOC)</b>\n\n` +
          `• <b>Pelanggan:</b> ${report.customerName}\n` +
          `• <b>Service ID:</b> <code>${report.serviceId}</code>\n` +
          `• <b>Tipe Laporan:</b> ${report.reportType}\n` +
          `• <b>Periode:</b> ${report.reportPeriod}\n` +
          `• <b>No. Dokumen:</b> <code>${report.documentNumber}</code>\n` +
          `• <b>Disetujui oleh:</b> ${auth.session.name} (NOC Supervisor)\n` +
          `• <b>Alur:</b> 1-Tier Internal NOC (Langsung Approved)\n` +
          `• <b>Waktu:</b> ${nowStr} WIB\n\n` +
          `<i>Laporan telah disetujui penuh oleh Supervisor NOC dan siap diunduh.</i>`;
      } else {
        // 2-Tier Approval: Forward to target Department Supervisor (CX / AE / Finance)
        nextStatus = 'PENDING_DEPT_APPROVAL';
        updateData = {
          status: nextStatus,
          nocApprovedById: auth.session.id,
          nocApprovedByName: auth.session.name,
          nocApprovedAt: new Date(),
          rejectionNotes: null,
        };

        notificationText =
          `✅ <b>STAGE 1 APPROVED (TECHNICAL NOC)</b>\n\n` +
          `• <b>Pelanggan:</b> ${report.customerName}\n` +
          `• <b>Service ID:</b> <code>${report.serviceId}</code>\n` +
          `• <b>Tipe Laporan:</b> ${report.reportType}\n` +
          `• <b>Periode:</b> ${report.reportPeriod}\n` +
          `• <b>No. Dokumen:</b> <code>${report.documentNumber}</code>\n` +
          `• <b>Disetujui Teknis oleh:</b> ${auth.session.name} (NOC)\n` +
          `• <b>Diteruskan ke:</b> Supervisor ${assignedDept}\n\n` +
          `<i>Dokumen valid secara teknis. Menunggu persetujuan akhir dari Supervisor ${assignedDept}.</i>`;
      }
    } 
    // TIER 2: Departmental Authorization by CX / AE / Finance Supervisor
    else if (currentStatus === 'PENDING_DEPT_APPROVAL') {
      const isAuthorizedDept = isAdmin || auth.session.department === assignedDept;
      if (!isAuthorizedDept) {
        return NextResponse.json({
          error: `Akses ditolak: Persetujuan akhir dokumen ini menjadi wewenang Supervisor departemen ${assignedDept}.`,
        }, { status: 403 });
      }

      // Check linked request for requester self-approval in Tier 2
      const linkedRequestCheck = await prisma.reportRequest.findFirst({
        where: {
          OR: [
            { processedReportId: report.id },
            { processedMrtgReportId: report.id },
            { processedSlaReportId: report.id },
          ],
        },
        select: { requesterUserId: true },
      });

      if (!isAdmin && linkedRequestCheck?.requesterUserId && linkedRequestCheck.requesterUserId === auth.session.id) {
        return NextResponse.json({
          error: 'Akses ditolak (Four-Eyes Principle): Anda adalah pemohon awal tiket permintaan ini. Pengesahan akhir Tier 2 wajib dilakukan oleh Supervisor lain di departemen Anda.',
        }, { status: 403 });
      }

      nextStatus = 'APPROVED';
      updateData = {
        status: nextStatus,
        deptApprovedById: auth.session.id,
        deptApprovedByName: auth.session.name,
        deptApprovedAt: new Date(),
        approvedById: auth.session.id,
        approvedByName: auth.session.name,
        approvedAt: new Date(),
        rejectionNotes: null,
      };

      notificationText =
        `🏆 <b>FINAL REPORT AUTHORIZED & RELEASED</b>\n\n` +
        `• <b>Pelanggan:</b> ${report.customerName}\n` +
        `• <b>Service ID:</b> <code>${report.serviceId}</code>\n` +
        `• <b>Tipe Laporan:</b> ${report.reportType}\n` +
        `• <b>Periode:</b> ${report.reportPeriod}\n` +
        `• <b>No. Dokumen:</b> <code>${report.documentNumber}</code>\n` +
        `• <b>Disahkan oleh:</b> ${auth.session.name} (${auth.session.department})\n` +
        `• <b>Waktu:</b> ${nowStr} WIB\n\n` +
        `<i>Dokumen resmi telah disetujui penuh (Final Approved) dan siap diunduh oleh staf untuk dikirimkan ke pelanggan.</i>`;
    } else {
      return NextResponse.json({
        error: `Laporan ini sudah berada dalam status ${currentStatus}.`,
      }, { status: 400 });
    }

    // Atomic transaction for Report Update + Audit Log Recording
    const auditAction = currentStatus === 'PENDING_DEPT_APPROVAL'
      ? 'DEPT_APPROVED'
      : (isInternalOnly ? 'FINAL_APPROVED' : 'NOC_APPROVED');

    const auditNotes = currentStatus === 'PENDING_DEPT_APPROVAL'
      ? `Disahkan oleh Supervisor ${auth.session.department || assignedDept}`
      : (isInternalOnly
          ? 'Disetujui penuh oleh Supervisor NOC (Alur 1-Tier Internal)'
          : `Disetujui secara teknis oleh Supervisor NOC dan diteruskan ke Supervisor ${assignedDept}`);

    const [updated] = await prisma.$transaction([
      prisma.report.update({
        where: { id },
        data: updateData,
      }),
      prisma.reportAuditLog.create({
        data: {
          reportId: id,
          action: auditAction,
          actorId: auth.session.id,
          actorName: auth.session.name,
          actorDept: auth.session.department || 'Network Operation',
          actorRole: auth.session.role,
          notes: auditNotes,
        },
      }),
    ]);

    sendTelegramNotification({ text: notificationText }).catch((e) => console.error('[Telegram Approve Error]', e));

    // Handle Threaded Email Notifications & Linked Request Status update
    (async () => {
      try {
        const origin = req.nextUrl.origin || 'http://localhost:3000';

        // Check if there is an active linked request
        const linkedRequest = await prisma.reportRequest.findFirst({
          where: {
            OR: [
              { processedReportId: updated.id },
              { processedMrtgReportId: updated.id },
              { processedSlaReportId: updated.id },
              {
                customerName: updated.customerName,
                periodMonth: updated.periodMonth,
                periodYear: updated.periodYear,
              },
            ],
          },
        });

        const ticketNumber = linkedRequest?.ticketNumber || null;
        const targetDept = updated.assignedDepartment || 'Customer Experience';
        const deptEmail = await getDepartmentEmail(targetDept);
        const helpdeskEmail = await getHelpdeskEmail();

        // Milestone 2: Stage 1 Approved (NOC) -> Forward to Dept Supervisor for Approval
        if (nextStatus === 'PENDING_DEPT_APPROVAL') {
          const reviewUrl = `${origin}/approvals`;
          const emailHtml = renderApprovalNeededHtml({
            ticketNumber,
            customerName: updated.customerName,
            serviceId: updated.serviceId,
            reportType: updated.reportType,
            period: updated.reportPeriod,
            documentNumber: updated.documentNumber,
            deptName: targetDept,
            verifiedByNocName: auth.session.name,
            reviewUrl,
          });

          const approvalSubject = ticketNumber
            ? `Re: [${ticketNumber}] Report Request ${updated.reportType} - ${updated.customerName} (${updated.reportPeriod})`
            : `[${updated.documentNumber}] Report Request ${updated.reportType} - ${updated.customerName} (${updated.reportPeriod})`;

          await sendEmail({
            to: deptEmail,
            subject: approvalSubject,
            html: emailHtml,
            ticketNumber: ticketNumber || undefined,
            isFollowUp: Boolean(ticketNumber),
          });
        }

        // Milestone 3: Final Approved -> Released & Ready for Download
        if (nextStatus === 'APPROVED') {
          // If linked request exists, mark as COMPLETED
          if (linkedRequest && linkedRequest.status !== 'COMPLETED') {
            await prisma.reportRequest.update({
              where: { id: linkedRequest.id },
              data: {
                status: 'COMPLETED',
                processedReportId: updated.id,
              },
            }).catch(() => {});
          }

          const downloadUrl = `${origin}/api/reports/download?id=${updated.id}`;
          const emailHtml = renderReportApprovedHtml({
            ticketNumber,
            customerName: updated.customerName,
            serviceId: updated.serviceId,
            reportType: updated.reportType,
            period: updated.reportPeriod,
            documentNumber: updated.documentNumber,
            approvedByName: auth.session.name,
            approvedDeptName: auth.session.department || targetDept,
            downloadUrl,
            appUrl: `${origin}/history`,
          });

          const ccList = new Set<string>();
          if (helpdeskEmail) ccList.add(helpdeskEmail);
          if (linkedRequest?.requesterEmail && linkedRequest.requesterEmail.includes('@')) {
            ccList.add(linkedRequest.requesterEmail.trim().toLowerCase());
          }
          if (linkedRequest?.salesPicEmail && linkedRequest.salesPicEmail.includes('@')) {
            ccList.add(linkedRequest.salesPicEmail.trim().toLowerCase());
          }
          if (linkedRequest?.cePicEmail && linkedRequest.cePicEmail.includes('@')) {
            ccList.add(linkedRequest.cePicEmail.trim().toLowerCase());
          }
          ccList.delete(deptEmail.toLowerCase());

          const publishedSubject = ticketNumber
            ? `Re: [${ticketNumber}] Report Request ${updated.reportType} - ${updated.customerName} (${updated.reportPeriod})`
            : `[${updated.documentNumber}] Report Request ${updated.reportType} - ${updated.customerName} (${updated.reportPeriod})`;

          await sendEmail({
            to: deptEmail,
            cc: Array.from(ccList),
            subject: publishedSubject,
            html: emailHtml,
            ticketNumber: ticketNumber || undefined,
            isFollowUp: Boolean(ticketNumber),
          });
        }
      } catch (notifyErr) {
        console.error('[Approval Notify Error]', notifyErr);
      }
    })();

    return NextResponse.json({
      success: true,
      message: nextStatus === 'PENDING_DEPT_APPROVAL'
        ? `Report "${updated.customerName}" verified by NOC and forwarded to ${assignedDept} Supervisor.`
        : `Report "${updated.customerName}" fully approved and ready for download!`,
      report: updated,
      nextStatus,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Report Approve]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

