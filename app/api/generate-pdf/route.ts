import { NextRequest, NextResponse } from 'next/server';
import { generatePdfBuffer } from '@/lib/pdf-generator';
import { ReportData } from '@/lib/pdf-template';

export async function POST(req: NextRequest) {
  try {
    const data: ReportData = await req.json();

    if (!data.customerName || !data.reportType) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName or reportType' },
        { status: 400 }
      );
    }

    const pdfBuffer = await generatePdfBuffer(data);
    const filename = `REPORT ${data.reportType} - ${data.customerName} - ${data.reportPeriod || 'Period'}.pdf`;
    
    // Clean filename of unsafe characters
    const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '-');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error generating PDF:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
