import { NextRequest, NextResponse } from 'next/server';
import { runMrtgBatchScheduler } from '@/lib/mrtg-batch-scheduler';
import { requirePermission } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('schedule:manage');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const month = body.month ? parseInt(body.month, 10) : undefined;
    const year = body.year ? parseInt(body.year, 10) : undefined;

    const result = await runMrtgBatchScheduler(month, year);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Auto-MRTG Batch]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

