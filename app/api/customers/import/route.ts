import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { extractNodeFromServiceId } from '@/lib/service-utils';
import { getSlaByServiceName } from '@/lib/service-sla';
import { requireOperatorOrAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Excel file is required.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });

    // Pick first worksheet
    const sheetName = wb.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: 'Excel file is empty or contains no worksheets.' }, { status: 400 });
    }

    const ws = wb.Sheets[sheetName];
    // Read rows as string arrays/objects
    const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, {
      defval: '',
      raw: false, // Ensures IDs retain leading zeroes as strings!
    });

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in the uploaded Excel file.' }, { status: 400 });
    }

    let inserted = 0;
    let updated = 0;
    const errors: { row: number; reason: string }[] = [];
    const validCustomers: any[] = [];

    // Helper to find key case-insensitively
    const findVal = (row: Record<string, any>, candidates: string[]): string => {
      const keys = Object.keys(row);
      for (const cand of candidates) {
        const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(cand.toLowerCase().replace(/[^a-z0-9]/g, '')));
        if (foundKey && row[foundKey] !== undefined) {
          return String(row[foundKey]).trim();
        }
      }
      return '';
    };

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowIdx = i + 2; // 1-based index including header

      const customerName = findVal(row, ['customername', 'namapelanggan', 'customer', 'nama']);
      const customerId = findVal(row, ['customerid', 'idpelanggan', 'cid']);
      const serviceId = findVal(row, ['serviceid', 'idlayanan', 'sid']);
      const serviceName = findVal(row, ['servicename', 'namalayanan', 'bandwidth', 'paket']) || 'Prime 300 Mbps';
      const nodeCountStr = findVal(row, ['nodecount', 'node', 'titik']);
      const targetSlaStr = findVal(row, ['targetsla', 'sla', 'target']);
      const cactiGraphId = findVal(row, ['cactigraphid', 'cactiid', 'cacti', 'graphid', 'localgraphid']);
      const prtgSensorId = findVal(row, ['prtgsensorid', 'prtgid', 'prtg', 'sensorid', 'objectid']);
      const defaultEngineStr = findVal(row, ['defaultengine', 'engine', 'graphtype', 'mode']);
      const trafficDirStr = findVal(row, ['trafficdirection', 'direction', 'arahtrafik', 'arah']);

      if (!customerName || !customerId || !serviceId) {
        errors.push({
          row: rowIdx,
          reason: `Row ${rowIdx}: Customer Name, Customer ID, or Service ID is empty.`,
        });
        continue;
      }

      let graphType = 'MRTG';
      if (defaultEngineStr.toUpperCase().includes('PRTG')) {
        graphType = 'PRTG';
      } else if (!cactiGraphId && prtgSensorId) {
        // Jika hanya ada PRTG Sensor ID, default ke PRTG
        graphType = 'PRTG';
      }

      // Parse Node Count: otomatis ekstrak dari Service ID jika kolom Excel kosong/0
      const parsedNode = parseInt(nodeCountStr, 10);
      const nodeCount = !isNaN(parsedNode) && parsedNode > 0 ? parsedNode : extractNodeFromServiceId(serviceId);

      // Parse Target SLA: otomatis deteksi dari Service Name jika kolom Excel kosong/tidak terisi
      const autoSla = getSlaByServiceName(serviceName).targetSla;
      let targetSla = autoSla;
      if (targetSlaStr && targetSlaStr.trim() !== '') {
        const cleanSla = targetSlaStr.replace('%', '').trim();
        const parsed = parseFloat(cleanSla);
        if (!isNaN(parsed)) {
          if (parsed > 0 && parsed <= 1.0) {
            targetSla = Number((parsed * 100).toFixed(2));
          } else {
            targetSla = parsed;
          }
        }
      }

      // Parse Traffic Direction
      let trafficDirection = 'NORMAL';
      if (trafficDirStr.toUpperCase().includes('REV')) {
        trafficDirection = 'REVERSED';
      }

      validCustomers.push({
        customerName,
        customerId,
        serviceId,
        serviceName,
        nodeCount,
        targetSla,
        graphType,
        cactiGraphId: cactiGraphId || null,
        prtgSensorId: prtgSensorId || null,
        graphId: cactiGraphId || (graphType === 'PRTG' ? prtgSensorId : null),
        trafficDirection,
        rowIdx,
      });
    }

    // Optional: Reset all existing customer records before importing if requested
    const reset = formData.get('reset') === 'true';
    if (reset) {
      await prisma.customer.deleteMany({});
    }

    // Load existing records indexed by unique Service ID (case-insensitive)
    const existingRecords = await prisma.customer.findMany({
      select: {
        id: true,
        serviceId: true,
        cactiGraphId: true,
        prtgSensorId: true,
        graphId: true,
        graphType: true,
      },
    });

    const existingMap = new Map<string, {
      id: string;
      serviceId: string;
      cactiGraphId: string | null;
      prtgSensorId: string | null;
      graphId: string | null;
      graphType: string;
    }>();

    for (const rec of existingRecords) {
      if (rec.serviceId) {
        existingMap.set(rec.serviceId.trim().toLowerCase(), rec);
      }
    }

    // Upsert into database based on unique Service ID
    for (const cust of validCustomers) {
      const sidKey = cust.serviceId.trim().toLowerCase();
      const existing = existingMap.get(sidKey);

      if (existing) {
        await prisma.customer.update({
          where: { id: existing.id },
          data: {
            customerName: cust.customerName,
            customerId: cust.customerId,
            serviceId: cust.serviceId,
            serviceName: cust.serviceName,
            nodeCount: cust.nodeCount,
            targetSla: cust.targetSla,
            graphType: cust.graphType || existing.graphType,
            cactiGraphId: cust.cactiGraphId !== null ? cust.cactiGraphId : existing.cactiGraphId,
            prtgSensorId: cust.prtgSensorId !== null ? cust.prtgSensorId : existing.prtgSensorId,
            graphId: cust.cactiGraphId || existing.cactiGraphId || cust.graphId || existing.graphId,
            trafficDirection: cust.trafficDirection,
          },
        });
        updated++;
      } else {
        const created = await prisma.customer.create({
          data: {
            customerName: cust.customerName,
            customerId: cust.customerId,
            serviceId: cust.serviceId,
            serviceName: cust.serviceName,
            nodeCount: cust.nodeCount,
            targetSla: cust.targetSla,
            graphType: cust.graphType || 'MRTG',
            cactiGraphId: cust.cactiGraphId,
            prtgSensorId: cust.prtgSensorId,
            graphId: cust.cactiGraphId || cust.prtgSensorId,
            trafficDirection: cust.trafficDirection,
          },
        });
        existingMap.set(sidKey, created);
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: rawRows.length,
      processed: validCustomers.length,
      inserted,
      updated,
      errorCount: errors.length,
      errors: errors.slice(0, 10), // Limit error details
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error importing Excel:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

