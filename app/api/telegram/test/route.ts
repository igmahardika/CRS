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
      `<b>🤖 Customer Reporting System Bot Test</b>\n\n` +
      `✅ <b>Connection Successful!</b>\n` +
      `This message was received in the Telegram group topic at <code>${nowStr} WIB</code>.\n\n` +
      `<i>Customer Reporting System is configured and ready to publish queue alerts, 24H SLA schedules, and supervisor approvals.</i>`;

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

