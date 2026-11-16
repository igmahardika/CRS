import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';

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
    let updateData: any = {};
    let notificationText = '';
    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // TIER 1: Technical Verification by NOC Supervisor
    if (currentStatus === 'PENDING_NOC_APPROVAL' || currentStatus === 'PENDING_APPROVAL') {
      if (!isNocUser && !isAdmin) {
        return NextResponse.json({
          error: 'Akses ditolak: Verifikasi teknis tahap 1 hanya dapat disetujui oleh Supervisor NOC.',
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

    const updated = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    sendTelegramNotification({ text: notificationText }).catch((e) => console.error('[Telegram Approve Error]', e));

    return NextResponse.json({
      success: true,
      message: nextStatus === 'PENDING_DEPT_APPROVAL'
        ? `Laporan "${updated.customerName}" lolos verifikasi teknis NOC dan diteruskan ke Supervisor ${assignedDept}.`
        : `Laporan "${updated.customerName}" telah disetujui penuh (Approved) dan siap diunduh!`,
      report: updated,
      nextStatus,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Report Approve]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

