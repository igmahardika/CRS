import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSupervisorOrAdmin } from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  const auth = await requireSupervisorOrAdmin();
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

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: auth.session.id,
        approvedByName: auth.session.name,
        approvedAt: new Date(),
        rejectionNotes: null,
      },
    });

    const nowStr = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    sendTelegramNotification({
      text:
        `✅ <b>REPORT APPROVED</b>\n\n` +
        `• <b>Pelanggan:</b> ${updated.customerName}\n` +
        `• <b>Service ID:</b> <code>${updated.serviceId}</code>\n` +
        `• <b>Tipe Laporan:</b> ${updated.reportType}\n` +
        `• <b>Periode:</b> ${updated.reportPeriod}\n` +
        `• <b>No. Dokumen:</b> <code>${updated.documentNumber}</code>\n` +
        `• <b>Disetujui oleh:</b> ${auth.session.name} (${auth.session.role})\n` +
        `• <b>Waktu Approval:</b> ${nowStr} WIB\n\n` +
        `<i>Laporan telah diverifikasi resmi dan dokumen PDF siap didistribusikan ke pelanggan.</i>`,
    }).catch((e) => console.error('[Telegram Approve Error]', e));

    return NextResponse.json({
      success: true,
      message: `Laporan "${updated.customerName}" berhasil disetujui.`,
      report: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Report Approve]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

