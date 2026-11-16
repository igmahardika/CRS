import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { botToken, chatId, threadId } = body as {
      botToken?: string;
      chatId?: string;
      threadId?: string;
    };

    const nowStr = new Date().toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'full',
      timeStyle: 'medium',
    });

    const testText =
      `<b>🤖 Uji Coba Integrasi Genre Reporting Bot</b>\n\n` +
      `✅ <b>Koneksi Berhasil!</b>\n` +
      `Pesan ini berhasil diterima di topik grup Telegram pada <code>${nowStr} WIB</code>.\n\n` +
      `<i>Sistem pelaporan Genre Reporting siap mempublikasikan notifikasi antrean, jadwal SLA 24 jam, dan approval supervisor ke topik ini.</i>`;

    const result = await sendTelegramNotification({
      botToken,
      chatId,
      threadId,
      text: testText,
      isTest: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Gagal mengirim pesan uji coba ke Telegram.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Pesan uji coba berhasil dikirim ke topik grup Telegram Anda!',
      messageId: result.messageId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

