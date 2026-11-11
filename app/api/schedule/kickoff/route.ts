import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/auth';
import { sendTelegramNotification } from '@/lib/telegram';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export async function POST(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));

    const now = new Date();
    // Default to previous month if not specified
    let periodMonth = body.periodMonth ? parseInt(body.periodMonth, 10) : now.getMonth();
    let periodYear = body.periodYear ? parseInt(body.periodYear, 10) : now.getFullYear();
    if (periodMonth === 0) {
      periodMonth = 12;
      periodYear -= 1;
    }

    // 1. Fetch routine customers
    let routineCustomers = await prisma.customer.findMany({
      where: { isMonthlyRoutine: true },
      orderBy: { customerName: 'asc' },
    });

    // If no customers have isMonthlyRoutine set, fallback to all customers if body.includeAll is true
    if (routineCustomers.length === 0 && body.includeAll) {
      routineCustomers = await prisma.customer.findMany({
        orderBy: { customerName: 'asc' },
      });
    }

    if (routineCustomers.length === 0) {
      return NextResponse.json({
        error: 'Belum ada pelanggan yang ditandai sebagai Wajib Report Bulanan di Direktori Pelanggan.',
        totalRoutineCustomers: 0,
      }, { status: 400 });
    }

    const kickoffTime = new Date();
    // 24 Hours SLA Deadline
    const deadlineTime = new Date(kickoffTime.getTime() + 24 * 60 * 60 * 1000);

    let createdCount = 0;
    const tasksToReturn = [];

    for (const c of routineCustomers) {
      // Check if task already exists for this customer & period
      const existing = await prisma.monthlyScheduleTask.findFirst({
        where: {
          customerId: c.customerId,
          periodMonth,
          periodYear,
        },
      });

      if (!existing) {
        const task = await prisma.monthlyScheduleTask.create({
          data: {
            customerId: c.customerId,
            customerName: c.customerName,
            serviceId: c.serviceId,
            serviceName: c.serviceName,
            periodMonth,
            periodYear,
            reportType: c.routineReportType || 'SLA',
            kickoffTime,
            deadlineTime,
            status: 'PENDING',
          },
        });
        createdCount++;
        tasksToReturn.push(task);
      } else {
        tasksToReturn.push(existing);
      }
    }

    // Format dates for Telegram Broadcast
    const monthName = monthNames[periodMonth - 1];
    const kickoffStr = kickoffTime.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const deadlineStr = deadlineTime.toLocaleString('id-ID', {
      timeZone: 'Asia/Jakarta',
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    // Send Kickoff Broadcast to Telegram Topic
    sendTelegramNotification({
      text:
        `📢 <b>[KICKOFF SLA 24 JAM: LAPORAN RUTIN AWAL BULAN]</b>\n\n` +
        `• <b>Periode Laporan:</b> ${monthName} ${periodYear}\n` +
        `• <b>Total Pelanggan Wajib:</b> <b>${routineCustomers.length} Pelanggan</b> (${createdCount} tugas baru di-generate)\n` +
        `• <b>Waktu Kickoff:</b> ${kickoffStr} WIB\n` +
        `• <b>Batas Akhir SLA:</b> ⏳ <b>${deadlineStr} WIB (Tepat 24 Jam)</b>\n\n` +
        `<i>Seluruh staf diharapkan segera membuka menu <b>Antrean & Jadwal > Jadwal Bulanan & SLA 24 Jam</b> untuk mulai memproses pembuatan laporan agar tidak melampaui batas waktu 24 jam.</i>`,
    }).catch((e) => console.error('[Telegram Kickoff Error]', e));

    return NextResponse.json({
      success: true,
      message: `Kickoff berhasil! ${createdCount} tugas baru dibuat untuk periode ${monthName} ${periodYear}. Batas waktu 24 jam telah dimulai.`,
      createdCount,
      totalRoutineCustomers: routineCustomers.length,
      deadlineTime: deadlineTime.toISOString(),
      tasks: tasksToReturn,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Schedule Kickoff POST]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

