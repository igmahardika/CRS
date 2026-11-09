import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Exactly 4 columns requested by user for customer upload
    const headers = [
      'Customer Name',
      'Customer ID',
      'Service ID',
      'Service Name',
    ];

    const sampleRows = [
      [
        'RSJ. Dr. Soeharto Heerdjan',
        '01.2180.1124',
        '01.2180.1',
        'Prime 300 Mbps',
      ],
      [
        'Linknet - Site BFI',
        '01.1496.0624',
        '01.1496.31',
        'Dedicated Lite 100 Mbps',
      ],
      [
        'Uniqlo Queen City Mall',
        '01.1890.0924',
        '01.1890.1',
        'MAXi Easy FO 50 Mbps',
      ],
    ];

    // 2. Build worksheet
    const data = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths for readability
    ws['!cols'] = [
      { wch: 34 }, // Customer Name
      { wch: 20 }, // Customer ID
      { wch: 20 }, // Service ID
      { wch: 28 }, // Service Name
    ];

    // 3. Build workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    // 4. Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Customer_Import_Template.xlsx"',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error generating Excel template:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

