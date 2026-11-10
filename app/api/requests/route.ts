import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTelegramNotification } from '@/lib/telegram';
import { requireAuth } from '@/lib/auth';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};

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

    return NextResponse.json({ requests });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Requests GET]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const requesterName = String(body.requesterName || '').trim();
    const requesterDept = String(body.requesterDept || '').trim();
    const customerName = String(body.customerName || '').trim();
    const reportType = String(body.reportType || 'SLA').toUpperCase();
    const periodMonth = parseInt(body.periodMonth, 10) || new Date().getMonth() + 1;
    const periodYear = parseInt(body.periodYear, 10) || new Date().getFullYear();
    const urgency = body.urgency === 'URGENT' ? 'URGENT' : 'NORMAL';
    const notes = String(body.notes || '').trim() || null;
    const requesterEmail = body.requesterEmail ? String(body.requesterEmail).trim() : null;
    const customerId = body.customerId ? String(body.customerId).trim() : null;
    const serviceId = body.serviceId ? String(body.serviceId).trim() : null;

    if (!requesterName || !requesterDept || !customerName) {
      return NextResponse.json({
        error: 'Nama pemohon, departemen, dan nama pelanggan wajib diisi.',
      }, { status: 400 });
    }

    // Generate unique sequential ticket number: REQ-YYYYMM-XXXX
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `REQ-${yyyy}${mm}-`;

    const countThisMonth = await prisma.reportRequest.count({
      where: {
        ticketNumber: {
          startsWith: prefix,
        },
      },
    });

    const nextSeq = String(countThisMonth + 1).padStart(4, '0');
    const ticketNumber = `${prefix}${nextSeq}`;

    const created = await prisma.reportRequest.create({
      data: {
        ticketNumber,
        requesterName,
        requesterEmail,
        requesterDept,
        reportType,
        customerName,
        customerId,
        serviceId,
        periodMonth,
        periodYear,
        urgency,
        notes,
        status: 'PENDING',
      },
    });

    // Notify Telegram group topic
    const monthName = monthNames[periodMonth - 1] || `Bulan ${periodMonth}`;
    const urgencyBadge = urgency === 'URGENT' ? '🔴 <b>URGENT (Butuh Cepat)</b>' : '🟢 Normal';

    sendTelegramNotification({
      text:
        `📥 <b>[PERMINTAAN LAPORAN BARU DITERIMA]</b>\n\n` +
        `• <b>No. Tiket:</b> <code>${created.ticketNumber}</code>\n` +
        `• <b>Pemohon:</b> ${created.requesterName} (${created.requesterDept})\n` +
        (created.requesterEmail ? `• <b>Email/Kontak:</b> ${created.requesterEmail}\n` : '') +
        `• <b>Pelanggan:</b> <b>${created.customerName}</b>\n` +
        (created.serviceId ? `• <b>Service ID:</b> <code>${created.serviceId}</code>\n` : '') +
        `• <b>Tipe Laporan:</b> ${created.reportType}\n` +
        `• <b>Periode:</b> ${monthName} ${created.periodYear}\n` +
        `• <b>Urgensi:</b> ${urgencyBadge}\n` +
        `• <b>Catatan Pemohon:</b> <i>${created.notes || '-'}</i>\n\n` +
        `<i>Permintaan telah masuk antrean sistem. Staf dapat memproses melalui menu Antrean & Jadwal > Antrean Permintaan.</i>`,
    }).catch((e) => console.error('[Telegram Notify Request Error]', e));

    return NextResponse.json({
      success: true,
      message: 'Permintaan laporan berhasil disubmit.',
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
    const { id, status, processedReportId } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status wajib disertakan.' }, { status: 400 });
    }

    const updated = await prisma.reportRequest.update({
      where: { id },
      data: {
        status,
        processedById: auth.session.id,
        processedByName: auth.session.name,
        processedReportId: processedReportId || undefined,
      },
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

