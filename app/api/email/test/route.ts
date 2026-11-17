import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { testSmtpConnection } from '@/lib/email';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { host, port, secure, user, pass, fromEmail, fromName, toEmail } = body;

    if (!host) {
      return NextResponse.json({ error: 'Host SMTP wajib diisi.' }, { status: 400 });
    }
    if (!toEmail) {
      return NextResponse.json({ error: 'Alamat email penerima uji coba wajib diisi.' }, { status: 400 });
    }

    const result = await testSmtpConnection({
      host: String(host).trim(),
      port: parseInt(port, 10) || 587,
      secure: Boolean(secure),
      user: user ? String(user).trim() : undefined,
      pass: pass ? String(pass) : undefined,
      fromEmail: fromEmail ? String(fromEmail).trim() : 'noreply-reports@nexa.net.id',
      fromName: fromName ? String(fromName).trim() : 'Nexa Customer Reporting System',
      toEmail: String(toEmail).trim(),
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Gagal mengirim email uji coba.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Email uji coba berhasil dikirim ke ${toEmail}! Periksa kotak masuk Anda.`,
      messageId: result.messageId,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

