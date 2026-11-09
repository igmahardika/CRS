import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireOperatorOrAdmin } from '@/lib/auth';

/**
 * POST /api/discovery/map-customer
 * Maps a discovered interface's targetId to a Customer record.
 * Body: { customerId: string; engine: 'MRTG' | 'PRTG'; targetId: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { customerId, serviceId, id, engine, targetId } = body as {
      customerId?: string;
      serviceId?: string;
      id?: string;
      engine: 'MRTG' | 'PRTG';
      targetId: string;
    };

    if ((!customerId && !serviceId && !id) || !engine || !targetId) {
      return NextResponse.json(
        { error: 'customerId atau serviceId, engine, dan targetId wajib diisi.' },
        { status: 400 }
      );
    }

    // Find customer by id, serviceId, or customerId (serviceId prioritized as it is unique per link)
    const customer = id
      ? await prisma.customer.findUnique({ where: { id } })
      : (serviceId
        ? await prisma.customer.findFirst({ where: { serviceId } })
        : await prisma.customer.findFirst({ where: { customerId } }));

    if (!customer) {
      return NextResponse.json({ error: `Customer with CID "${customerId}" not found.` }, { status: 404 });
    }

    // Update the appropriate graph ID field
    const updateData: Record<string, string> = {};
    if (engine === 'MRTG') {
      updateData.cactiGraphId = targetId;
      updateData.graphId = targetId;
      updateData.graphType = 'MRTG';
    } else {
      updateData.prtgSensorId = targetId;
      updateData.graphId = targetId;
      updateData.graphType = 'PRTG';
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: `${engine} ID "${targetId}" mapped successfully to customer "${updated.customerName}".`,
      customer: {
        id: updated.id,
        customerName: updated.customerName,
        customerId: updated.customerId,
        cactiGraphId: updated.cactiGraphId,
        prtgSensorId: updated.prtgSensorId,
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Discovery Map Customer]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/discovery/map-customer?targetId=...&engine=MRTG
 * Find customers already mapped to a specific graph/sensor ID.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get('targetId');
    const engine = searchParams.get('engine') as 'MRTG' | 'PRTG' | null;

    if (!targetId) {
      return NextResponse.json({ error: 'targetId wajib diisi.' }, { status: 400 });
    }

    const where: Record<string, string> = {};
    if (engine === 'MRTG') {
      where.cactiGraphId = targetId;
    } else if (engine === 'PRTG') {
      where.prtgSensorId = targetId;
    } else {
      // Search both
      const customers = await prisma.customer.findMany({
        where: {
          OR: [{ cactiGraphId: targetId }, { prtgSensorId: targetId }, { graphId: targetId }],
        },
        select: { id: true, customerName: true, customerId: true, serviceId: true, serviceName: true },
      });
      return NextResponse.json({ customers });
    }

    const customers = await prisma.customer.findMany({
      where,
      select: { id: true, customerName: true, customerId: true, serviceId: true, serviceName: true },
    });

    return NextResponse.json({ customers });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

