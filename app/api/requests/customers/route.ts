import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('request:create');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || searchParams.get('q')?.trim() || '';

    const where = search
      ? {
          OR: [
            { customerName: { contains: search } },
            { serviceId: { contains: search } },
            { customerId: { contains: search } },
          ],
        }
      : undefined;

    const customers = await prisma.customer.findMany({
      where,
      select: {
        id: true,
        customerName: true,
        customerId: true,
        serviceId: true,
        serviceName: true,
        routineReportType: true,
        targetSla: true,
        salesPicId: true,
        salesPicName: true,
        cePicId: true,
        cePicName: true,
      },
      orderBy: { customerName: 'asc' },
      take: 25,
    });

    return NextResponse.json({ customers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

