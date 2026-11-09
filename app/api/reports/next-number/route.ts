import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateDocumentNumber, parseDocumentNumber } from '@/lib/doc-number';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || '10', 10);
    const year = parseInt(searchParams.get('year') || '2026', 10);
    const reportType = (searchParams.get('type') || 'SLA').toUpperCase() as 'MRTG' | 'SLA';

    const dbConfig = await prisma.appConfig.findUnique({
      where: { id: 'default' },
    });
    const prefix = dbConfig?.documentNumberPrefix || 'IMUN.01';

    // Find all existing reports for this month, year, and type
    const existingReports = await prisma.report.findMany({
      where: {
        periodMonth: month,
        periodYear: year,
        reportType: reportType,
      },
      select: {
        documentNumber: true,
      },
    });

    let maxSeq = 0;
    for (const r of existingReports) {
      const parsed = parseDocumentNumber(r.documentNumber);
      if (parsed.seq && parsed.seq > maxSeq) {
        maxSeq = parsed.seq;
      }
    }

    const nextSeq = maxSeq + 1;
    const documentNumber = generateDocumentNumber(nextSeq, reportType, month, year, prefix);

    return NextResponse.json({
      seq: nextSeq,
      month,
      year,
      reportType,
      prefix,
      documentNumber,
      totalExistingInPeriod: existingReports.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error getting next document number:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

