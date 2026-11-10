import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    const now = new Date();
    // Default to current month/year or previous month
    let targetMonth = month ? parseInt(month, 10) : now.getMonth(); // 0-indexed month gives previous month number (1..12)
    let targetYear = year ? parseInt(year, 10) : now.getFullYear();
    if (targetMonth === 0) {
      targetMonth = 12;
      targetYear -= 1;
    }

    const where: any = {};
    if (month && month !== 'ALL') where.periodMonth = parseInt(month, 10);
    if (year && year !== 'ALL') where.periodYear = parseInt(year, 10);
    if (status && status !== 'ALL') where.status = status;

    const tasks = await prisma.monthlyScheduleTask.findMany({
      where,
      orderBy: [
        { deadlineTime: 'asc' },
        { customerName: 'asc' },
      ],
    });

    // Auto-update breached status if deadline has passed for pending tasks
    const nowTime = new Date().getTime();
    for (const t of tasks) {
      if (t.status === 'PENDING' && nowTime > new Date(t.deadlineTime).getTime()) {
        t.status = 'BREACHED';
        prisma.monthlyScheduleTask.update({
          where: { id: t.id },
          data: { status: 'BREACHED' },
        }).catch(() => {});
      }
    }

    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
    const breachedCount = tasks.filter((t) => t.status === 'BREACHED').length;

    return NextResponse.json({
      tasks,
      stats: {
        total: totalCount,
        completed: completedCount,
        pending: pendingCount,
        breached: breachedCount,
        completionRate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Schedule GET]', err);
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
    const { id, status, completedReportId } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'ID dan status wajib disertakan.' }, { status: 400 });
    }

    const updated = await prisma.monthlyScheduleTask.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : undefined,
        completedReportId: completedReportId || undefined,
        processedByName: auth.session.name,
      },
    });

    return NextResponse.json({
      success: true,
      task: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Schedule PATCH]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

