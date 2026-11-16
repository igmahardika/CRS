import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET() {
  const auth = await requirePermission('customer:export');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const customers = await prisma.customer.findMany({
      orderBy: { customerName: 'asc' },
    });

    const headers = [
      'No',
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
      'Created At',
      'Updated At',
    ];

    const rows = customers.map((c, idx) => [
      idx + 1,
      c.customerName || '',
      c.customerId || '',
      c.serviceId || '',
      c.serviceName || '',
      c.nodeCount ?? 1,
      c.targetSla !== undefined && c.targetSla !== null ? `${c.targetSla}%` : 'No SLA',
      c.graphType || 'MRTG',
      c.cactiGraphId || '',
      c.prtgSensorId || '',
      c.trafficDirection || 'NORMAL',
      c.isMonthlyRoutine ? 'YES' : 'NO',
      c.routineGroup || 'Customer Experience',
      c.routineReportType || 'SLA',
      c.createdAt ? new Date(c.createdAt).toISOString() : '',
      c.updatedAt ? new Date(c.updatedAt).toISOString() : '',
    ]);

    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto fit column widths
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 35 }, // Customer Name
      { wch: 20 }, // Customer ID
      { wch: 20 }, // Service ID
      { wch: 30 }, // Service Name
      { wch: 12 }, // Node Count
      { wch: 16 }, // Target SLA (%)
      { wch: 16 }, // Preferred Engine
      { wch: 18 }, // Cacti Graph ID
      { wch: 18 }, // PRTG Sensor ID
      { wch: 18 }, // Traffic Direction
      { wch: 16 }, // Monthly Routine
      { wch: 24 }, // Routine Group
      { wch: 20 }, // Routine Report Type
      { wch: 24 }, // Created At
      { wch: 24 }, // Updated At
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Customers');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const today = new Date().toISOString().split('T')[0];

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Customers_Full_Export_${today}.xlsx"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error exporting all customers:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

