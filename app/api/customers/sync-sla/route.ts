import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSlaByServiceName } from '@/lib/service-sla';
import { requireOperatorOrAdmin } from '@/lib/auth';

export async function POST() {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const customers = await prisma.customer.findMany({
      select: { id: true, serviceName: true, targetSla: true },
    });

    let updatedCount = 0;
    const breakdown: Record<string, number> = {
      '99.5%': 0,
      '98.0%': 0,
      '95.0%': 0,
      'Tanpa SLA': 0,
    };

    // Group IDs by target SLA to perform fast batch updates
    const idsToUpdateBySla = new Map<number, string[]>();

    for (const c of customers) {
      const { targetSla, hasSla } = getSlaByServiceName(c.serviceName);
      const key = hasSla ? `${targetSla.toFixed(1)}%` : 'Tanpa SLA';
      breakdown[key] = (breakdown[key] || 0) + 1;

      if (c.targetSla !== targetSla) {
        if (!idsToUpdateBySla.has(targetSla)) {
          idsToUpdateBySla.set(targetSla, []);
        }
        idsToUpdateBySla.get(targetSla)!.push(c.id);
        updatedCount++;
      }
    }

    // Execute batch updates grouped by target SLA
    for (const [targetSla, ids] of idsToUpdateBySla.entries()) {
      if (ids.length > 0) {
        // SQLite has variable limits, chunk by 500
        const CHUNK_SIZE = 500;
        for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
          const chunk = ids.slice(i, i + CHUNK_SIZE);
          await prisma.customer.updateMany({
            where: { id: { in: chunk } },
            data: { targetSla },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalCustomers: customers.length,
      updatedCount,
      breakdown,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
