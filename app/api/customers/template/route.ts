import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requirePermission } from '@/lib/auth';

export async function GET() {
  const auth = await requirePermission('customer:write');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Complete customer schema columns for full Excel import
    const headers = [
      'Customer Name',
      'Customer ID',
      'Service ID',
      'Service Name',
      'Node Count',
      'Target SLA (%)',
      'Preferred Engine',
      'Cacti Graph ID',
      'PRTG Sensor ID',
      'Traffic Direction',
      'Monthly Routine',
      'Routine Group',
      'Routine Report Type',
    ];

    const sampleRows = [
      [
        'RSJ. Dr. Soeharto Heerdjan',
        '01.2180.1124',
        '01.2180.1',
        'Prime 300 Mbps',
        1,
        99.5,
        'MRTG',
        '1042',
        '',
        'NORMAL',
        'YES',
        'Customer Experience',
        'SLA',
      ],
      [
        'Linknet - Site BFI',
        '01.1496.0624',
        '01.1496.31',
        'Dedicated Lite 100 Mbps',
        31,
        98.0,
        'PRTG',
        '',
        '2450',
        'NORMAL',
        'YES',
        'Account Executive',
        'BOTH',
      ],
      [
        'Uniqlo Queen City Mall',
        '01.1890.0924',
        '01.1890.1',
        'MAXi Easy FO 50 Mbps',
        1,
        95.0,
        'MRTG',
        '',
        '',
        'REVERSED',
        'NO',
        'Finance',
        'MRTG',
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
      { wch: 14 }, // Node Count
      { wch: 16 }, // Target SLA (%)
      { wch: 18 }, // Preferred Engine
      { wch: 18 }, // Cacti Graph ID
      { wch: 18 }, // PRTG Sensor ID
      { wch: 18 }, // Traffic Direction
      { wch: 16 }, // Monthly Routine
      { wch: 24 }, // Routine Group
      { wch: 20 }, // Routine Report Type
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

