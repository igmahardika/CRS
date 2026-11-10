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
    const { id, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID Laporan wajib disertakan.' }, { status: 400 });
    }

    const report = await prisma.report.findUnique({ where: { id } });
    if (!report) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan.' }, { status: 404 });
    }

    const rejectionNotes = String(notes || '').trim() || 'Ditolak tanpa catatan spesifik.';

    const updated = await prisma.report.update({
      where: { id },
      data: {
        status: 'REVISION_NEEDED',
        rejectionNotes,
      },
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
      message: `Status laporan diubah menjadi Perlu Revisi.`,
      report: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Report Reject]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

