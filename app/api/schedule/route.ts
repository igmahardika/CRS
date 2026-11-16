import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('schedule:view');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const reportType = searchParams.get('reportType');

    const now = new Date();
    // Default to December 2026 (starting period) or specified query
    let targetMonth = month ? parseInt(month, 10) : 12;
    let targetYear = year ? parseInt(year, 10) : 2026;

    const where: any = {};
    if (month && month !== 'ALL') where.periodMonth = parseInt(month, 10);
    if (year && year !== 'ALL') where.periodYear = parseInt(year, 10);
    if (status && status !== 'ALL') where.status = status;
    if (department && department !== 'ALL') where.assignedDepartment = department;
    if (reportType && reportType !== 'ALL') where.reportType = reportType;

    let tasks = await prisma.monthlyScheduleTask.findMany({
      where,
      orderBy: [
        { deadlineTime: 'asc' },
        { customerName: 'asc' },
      ],
    });

    // 1. AUTO-TRIGGER: If no tasks exist for this month/year, automatically compile from enrolled routine customers
    if (tasks.length === 0 && month && month !== 'ALL' && year && year !== 'ALL') {
      const pMonth = parseInt(month, 10);
      const pYear = parseInt(year, 10);

      const routineCustomers = await prisma.customer.findMany({
        where: { isMonthlyRoutine: true },
        orderBy: [{ routineGroup: 'asc' } as any, { customerName: 'asc' }],
      });

      if (routineCustomers.length > 0) {
        const kickoffTime = new Date();
        const deadlineTime = new Date(kickoffTime.getTime() + 24 * 60 * 60 * 1000);

        for (const c of routineCustomers) {
          const dept = c.routineGroup || 'Customer Experience';
          const rType = c.routineReportType || 'SLA';

          if (rType === 'BOTH') {
            await prisma.monthlyScheduleTask.create({
              data: {
                customerId: c.customerId,
                customerName: c.customerName,
                serviceId: c.serviceId,
                serviceName: c.serviceName,
                periodMonth: pMonth,
                periodYear: pYear,
                reportType: 'SLA',
                assignedDepartment: dept,
                executionType: 'MANUAL',
                kickoffTime,
                deadlineTime,
                status: 'PENDING',
              },
            });
            await prisma.monthlyScheduleTask.create({
              data: {
                customerId: c.customerId,
                customerName: c.customerName,
                serviceId: c.serviceId,
                serviceName: c.serviceName,
                periodMonth: pMonth,
                periodYear: pYear,
                reportType: 'MRTG',
                assignedDepartment: dept,
                executionType: 'AUTO_SCHEDULED',
                kickoffTime,
                deadlineTime,
                status: 'PENDING',
              },
            });
          } else {
            await prisma.monthlyScheduleTask.create({
              data: {
                customerId: c.customerId,
                customerName: c.customerName,
                serviceId: c.serviceId,
                serviceName: c.serviceName,
                periodMonth: pMonth,
                periodYear: pYear,
                reportType: rType,
                assignedDepartment: dept,
                executionType: rType === 'MRTG' ? 'AUTO_SCHEDULED' : 'MANUAL',
                kickoffTime,
                deadlineTime,
                status: 'PENDING',
              },
            });
          }
        }

        // Re-query tasks after auto-compilation
        tasks = await prisma.monthlyScheduleTask.findMany({
          where,
          orderBy: [
            { deadlineTime: 'asc' },
            { customerName: 'asc' },
          ],
        });
      }
    }

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

    // Fetch the persistent routine customer enrollment list (NOC classified)
    const routineCustomers = await prisma.customer.findMany({
      where: { isMonthlyRoutine: true },
      orderBy: [{ routineGroup: 'asc' } as any, { customerName: 'asc' }],
    });

    const totalCount = tasks.length;
    const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    const pendingCount = tasks.filter((t) => t.status === 'PENDING').length;
    const failedCount = tasks.filter((t) => t.status === 'FAILED_MANUAL_REQUIRED').length;
    const breachedCount = tasks.filter((t) => t.status === 'BREACHED').length;

    return NextResponse.json({
      tasks,
      routineCustomers,
      stats: {
        total: totalCount,
        completed: completedCount,
        pending: pendingCount,
        failed: failedCount,
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

// POST /api/schedule - NOC endpoint to manage customer routine enrollments, additions, and removals
export async function POST(req: NextRequest) {
  const auth = await requirePermission('schedule:manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { action, customerId, routineGroup, routineReportType, isMonthlyRoutine, periodMonth, periodYear } = body;

    // Action 1: Add customer(s) to routine list (single or batch)
    if (action === 'add_to_routine' || action === 'batch_add_to_routine') {
      const ids: string[] = Array.isArray(body.customerIds)
        ? body.customerIds.filter(Boolean)
        : customerId
        ? [customerId]
        : [];

      if (ids.length === 0) {
        return NextResponse.json({ error: 'Customer ID or Customer IDs array is required.' }, { status: 400 });
      }

      const dept = routineGroup || 'Customer Experience';
      const rType = routineReportType || 'SLA';

      // Find all target customers
      const targetCustomers = await prisma.customer.findMany({
        where: { id: { in: ids } },
      });

      if (targetCustomers.length === 0) {
        return NextResponse.json({ error: 'No matching customers found.' }, { status: 404 });
      }

      // Update routine attributes in batch
      await prisma.customer.updateMany({
        where: { id: { in: ids } },
        data: {
          isMonthlyRoutine: true,
          routineGroup: dept,
          routineReportType: rType,
        } as any,
      });

      // If active period is specified, auto-insert task for each customer immediately
      if (periodMonth && periodYear) {
        const pMonth = parseInt(periodMonth, 10);
        const pYear = parseInt(periodYear, 10);
        const kickoffTime = new Date();
        const deadlineTime = new Date(kickoffTime.getTime() + 24 * 60 * 60 * 1000);

        // Fetch existing tasks in this period to prevent duplicate tasks
        const existingTasks = await prisma.monthlyScheduleTask.findMany({
          where: {
            periodMonth: pMonth,
            periodYear: pYear,
            customerId: { in: targetCustomers.map((c) => c.customerId) },
          },
          select: { customerId: true, reportType: true },
        });
        const existingTaskSet = new Set(existingTasks.map((t) => `${t.customerId}_${t.reportType}`));

        const tasksToCreate: any[] = [];
        for (const cust of targetCustomers) {
          if (rType === 'BOTH') {
            if (!existingTaskSet.has(`${cust.customerId}_SLA`)) {
              tasksToCreate.push({
                customerId: cust.customerId,
                customerName: cust.customerName,
                serviceId: cust.serviceId,
                serviceName: cust.serviceName,
                periodMonth: pMonth,
                periodYear: pYear,
                reportType: 'SLA',
                assignedDepartment: dept,
                executionType: 'MANUAL',
                kickoffTime,
                deadlineTime,
                status: 'PENDING',
              });
            }
            if (!existingTaskSet.has(`${cust.customerId}_MRTG`)) {
              tasksToCreate.push({
                customerId: cust.customerId,
                customerName: cust.customerName,
                serviceId: cust.serviceId,
                serviceName: cust.serviceName,
                periodMonth: pMonth,
                periodYear: pYear,
                reportType: 'MRTG',
                assignedDepartment: dept,
                executionType: 'AUTO_SCHEDULED',
                kickoffTime,
                deadlineTime,
                status: 'PENDING',
              });
            }
          } else {
            if (!existingTaskSet.has(`${cust.customerId}_${rType}`)) {
              tasksToCreate.push({
                customerId: cust.customerId,
                customerName: cust.customerName,
                serviceId: cust.serviceId,
                serviceName: cust.serviceName,
                periodMonth: pMonth,
                periodYear: pYear,
                reportType: rType,
                assignedDepartment: dept,
                executionType: rType === 'MRTG' ? 'AUTO_SCHEDULED' : 'MANUAL',
                kickoffTime,
                deadlineTime,
                status: 'PENDING',
              });
            }
          }
        }

        if (tasksToCreate.length > 0) {
          await prisma.monthlyScheduleTask.createMany({
            data: tasksToCreate,
          });
        }
      }

      return NextResponse.json({
        success: true,
        count: targetCustomers.length,
        message:
          targetCustomers.length === 1
            ? `Customer "${targetCustomers[0].customerName}" successfully enrolled in ${dept} routine list.`
            : `Successfully enrolled ${targetCustomers.length} customer(s) into ${dept} routine list.`,
      });
    }

    // Action 2: Remove customer from routine list
    if (action === 'remove_from_routine') {
      if (!customerId) {
        return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
      }

      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: {
          isMonthlyRoutine: false,
        } as any,
      });

      // Remove pending tasks for this customer in the target period if specified
      if (periodMonth && periodYear) {
        await prisma.monthlyScheduleTask.deleteMany({
          where: {
            customerId: updated.customerId,
            periodMonth: parseInt(periodMonth, 10),
            periodYear: parseInt(periodYear, 10),
            status: 'PENDING',
          },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Customer "${updated.customerName}" removed from monthly routine reporting.`,
        customer: updated,
      });
    }

    // Action 3: General update enrollment
    if (action === 'update_enrollment') {
      if (!customerId) {
        return NextResponse.json({ error: 'Customer ID is required.' }, { status: 400 });
      }

      const updated = await prisma.customer.update({
        where: { id: customerId },
        data: {
          isMonthlyRoutine: isMonthlyRoutine !== undefined ? Boolean(isMonthlyRoutine) : undefined,
          routineGroup: routineGroup ? String(routineGroup) : undefined,
          routineReportType: routineReportType ? String(routineReportType) : undefined,
        } as any,
      });

      return NextResponse.json({
        success: true,
        message: `Customer "${updated.customerName}" routine subscription updated.`,
        customer: updated,
      });
    }

    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Schedule POST]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requirePermission('schedule:manage');
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
