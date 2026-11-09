import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSlaByServiceName } from '@/lib/service-sla';
import { requireAuth, requireOperatorOrAdmin } from '@/lib/auth';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const customers = await prisma.customer.findMany({
      orderBy: { customerName: 'asc' },
    });
    return NextResponse.json({ customers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      customerName,
      customerId,
      serviceId,
      serviceName,
      nodeCount,
      targetSla,
      graphType,
      graphId,
      cactiGraphId,
      prtgSensorId,
      trafficDirection,
    } = body;

    if (!customerName || !customerId || !serviceId) {
      return NextResponse.json(
        { error: 'Customer Name, Customer ID, and Service ID are required' },
        { status: 400 }
      );
    }

    const effectiveCactiId = cactiGraphId || (graphType === 'MRTG' ? graphId : null);
    const effectivePrtgId = prtgSensorId || (graphType === 'PRTG' ? graphId : null);

    const autoSla = getSlaByServiceName(serviceName).targetSla;
    const resolvedTargetSla = (targetSla !== undefined && targetSla !== '' && !isNaN(parseFloat(targetSla)))
      ? parseFloat(targetSla)
      : autoSla;

    const newCustomer = await prisma.customer.create({
      data: {
        customerName,
        customerId,
        serviceId,
        serviceName: serviceName || 'Prime 300 Mbps',
        nodeCount: parseInt(nodeCount, 10) || 1,
        targetSla: resolvedTargetSla,
        graphType: graphType || 'MRTG',
        graphId: effectiveCactiId || graphId || null,
        cactiGraphId: effectiveCactiId || null,
        prtgSensorId: effectivePrtgId || null,
        trafficDirection: trafficDirection || 'NORMAL',
      },
    });

    return NextResponse.json({ customer: newCustomer });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        cactiGraphId: data.cactiGraphId !== undefined ? (data.cactiGraphId ? String(data.cactiGraphId) : null) : undefined,
        prtgSensorId: data.prtgSensorId !== undefined ? (data.prtgSensorId ? String(data.prtgSensorId) : null) : undefined,
        graphId: data.cactiGraphId !== undefined ? (data.cactiGraphId ? String(data.cactiGraphId) : null) : (data.graphId !== undefined ? (data.graphId ? String(data.graphId) : null) : undefined),
        nodeCount: data.nodeCount ? parseInt(data.nodeCount, 10) : undefined,
        targetSla: (data.targetSla !== undefined && data.targetSla !== '' && !isNaN(parseFloat(data.targetSla)))
          ? parseFloat(data.targetSla)
          : (data.serviceName ? getSlaByServiceName(data.serviceName).targetSla : undefined),
      },
    });

    return NextResponse.json({ customer: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { id, serviceId, customerId, graphId, cactiGraphId, prtgSensorId, graphType, trafficDirection } = body;

    if (!id && !serviceId && !customerId) {
      return NextResponse.json({ error: 'Either id, serviceId, or customerId is required' }, { status: 400 });
    }

    // Find customer by id, serviceId, or customerId (serviceId prioritized as it is unique per link)
    const customer = id
      ? await prisma.customer.findUnique({ where: { id } })
      : (serviceId
        ? await prisma.customer.findFirst({ where: { serviceId } })
        : await prisma.customer.findFirst({ where: { customerId } }));

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        graphType: graphType !== undefined ? graphType : undefined,
        cactiGraphId: cactiGraphId !== undefined ? (cactiGraphId ? String(cactiGraphId) : null) : undefined,
        prtgSensorId: prtgSensorId !== undefined ? (prtgSensorId ? String(prtgSensorId) : null) : undefined,
        graphId: cactiGraphId !== undefined
          ? (cactiGraphId ? String(cactiGraphId) : null)
          : (graphId !== undefined ? (graphId ? String(graphId) : null) : undefined),
        trafficDirection: trafficDirection !== undefined ? trafficDirection : undefined,
      },
    });

    return NextResponse.json({ customer: updated, success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    // Single delete via query parameter
    if (id) {
      await prisma.customer.delete({ where: { id } });
      return NextResponse.json({ success: true, count: 1 });
    }

    // Multiple or Bulk Delete via JSON body
    try {
      const body = await req.json();

      if (body.all === true) {
        const result = await prisma.customer.deleteMany({});
        return NextResponse.json({ success: true, count: result.count });
      }

      if (Array.isArray(body.ids) && body.ids.length > 0) {
        const result = await prisma.customer.deleteMany({
          where: {
            id: { in: body.ids },
          },
        });
        return NextResponse.json({ success: true, count: result.count });
      }
    } catch {
      // Body was empty or not valid JSON
    }

    return NextResponse.json({ error: 'Customer ID or array of IDs is required' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
