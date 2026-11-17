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
    const { id, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Laporan wajib disertakan.' }, { status: 400 });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
    }

    // 1. State Guard: Only pending approval reports can be rejected
    if (
      report.status !== 'PENDING_NOC_APPROVAL' &&
      report.status !== 'PENDING_APPROVAL' &&
      report.status !== 'PENDING_DEPT_APPROVAL'
    ) {
      return NextResponse.json({
        error: `Aksi ditolak: Laporan dengan status "${report.status}" tidak dapat dikembalikan untuk revisi. Hanya laporan pending approval yang dapat direvisi.`,
      }, { status: 400 });
    }

    // 2. Department Authority Guard
    const isNocUser = auth.session.department === 'Network Operation';
    const isAdmin = auth.session.role === 'ADMIN';
    const assignedDept = report.assignedDepartment || 'Internal NOC';

    if (report.status === 'PENDING_DEPT_APPROVAL') {
      const isAuthorizedDept = isAdmin || auth.session.department === assignedDept;
      if (!isAuthorizedDept) {
        return NextResponse.json({
          error: `Akses ditolak: Hanya Supervisor departemen ${assignedDept} atau Administrator yang dapat meminta revisi pada tahap ini.`,
        }, { status: 403 });
      }
    } else {
      // Tier 1
      if (!isNocUser && !isAdmin) {
        return NextResponse.json({
          error: 'Akses ditolak: Penolakan verifikasi teknis tahap 1 hanya dapat dilakukan oleh Supervisor NOC atau Administrator.',
        }, { status: 403 });
      }
    }

    // 3. Mandatory Rejection Notes Validation (minimum 5 characters)
    const rejectionNotes = String(notes || '').trim();
    if (!rejectionNotes || rejectionNotes.length < 5) {
      return NextResponse.json({
        error: 'Catatan alasan revisi wajib diisi secara jelas (minimal 5 karakter) untuk memandu perbaikan oleh staf.',
      }, { status: 400 });
    }

    // 4. Atomic Transaction: Update Report, Log Audit Trail, and Sync Linked Request
    const [updated] = await prisma.$transaction(async (tx) => {
      const rep = await tx.report.update({
        where: { id },
        data: {
          status: 'REVISION_NEEDED',
          rejectionNotes,
        },
      });

      await tx.reportAuditLog.create({
        data: {
          reportId: id,
          action: 'REVISION_REQUESTED',
          actorId: auth.session.id,
          actorName: auth.session.name,
          actorDept: auth.session.department || 'Network Operation',
          actorRole: auth.session.role,
          notes: rejectionNotes,
        },
      });

      // Find linked request and keep/set its status to IN_PROGRESS so it stays active in queue
      const linkedRequest = await tx.reportRequest.findFirst({
        where: {
          OR: [
            { processedReportId: id },
            { processedMrtgReportId: id },
            { processedSlaReportId: id },
          ],
        },
      });

      if (linkedRequest && linkedRequest.status !== 'IN_PROGRESS') {
        await tx.reportRequest.update({
          where: { id: linkedRequest.id },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return [rep];
    });

    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    sendTelegramNotification({
      text:
        `⚠️ <b>REPORT MEMBUTUHKAN REVISI</b>\n\n` +
        `• <b>Pelanggan:</b> ${updated.customerName}\n` +
        `• <b>Service ID:</b> <code>${updated.serviceId}</code>\n` +
        `• <b>Tipe Laporan:</b> ${updated.reportType}\n` +
        `• <b>Periode:</b> ${updated.reportPeriod}\n` +
        `• <b>Ditolak oleh:</b> ${auth.session.name} (${auth.session.role})\n` +
        `• <b>Waktu:</b> ${nowStr} WIB\n\n` +
        `📝 <b>Catatan Revisi dari Supervisor:</b>\n<i>${rejectionNotes}</i>\n\n` +
        `<i>Mohon staf terkait segera memeriksa catatan dan melakukan penyesuaian di Generator.</i>`,
    }).catch((e) => console.error('[Telegram Reject Error]', e));

    return NextResponse.json({
      success: true,
      message: 'Report status changed to Revision Needed.',
      report: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Report Reject]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

