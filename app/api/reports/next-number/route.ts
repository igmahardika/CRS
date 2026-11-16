import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { getNextUniqueDocumentNumber } from '@/lib/doc-number-server';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('report:create');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const reportType = (searchParams.get('type') || 'SLA').toUpperCase() as 'MRTG' | 'SLA';

    // Nomor urut dan bulan/tahun dokumen mencerminkan WAKTU PEMBUATAN (creation time)
    const allocated = await getNextUniqueDocumentNumber(reportType);

    return NextResponse.json({
      seq: allocated.seq,
      month: allocated.createdMonth,
      year: allocated.createdYear,
      reportType,
      prefix: allocated.prefix,
      documentNumber: allocated.documentNumber,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error getting next document number:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

