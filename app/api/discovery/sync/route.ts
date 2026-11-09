import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { discoverPrtg, discoverMrtg } from '@/lib/discovery-service';
import { MrtgAuthConfig } from '@/lib/mrtg-service';
import { PrtgAuthConfig } from '@/lib/prtg-service';
import { requireOperatorOrAdmin } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireOperatorOrAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { engine } = body as { engine: 'MRTG' | 'PRTG' };

    if (!engine || !['MRTG', 'PRTG'].includes(engine)) {
      return NextResponse.json({ error: 'engine harus "MRTG" atau "PRTG"' }, { status: 400 });
    }

    // Load config from database
    const dbConfig = await prisma.appConfig.findUnique({ where: { id: 'default' } });

    let result;

    if (engine === 'PRTG') {
      const prtgConfig: PrtgAuthConfig = {
        baseUrl: dbConfig?.prtgBaseUrl || 'https://nms.nexa.net.id',
        username: dbConfig?.prtgUsername || undefined,
        password: dbConfig?.prtgPassword || undefined,
        authType: (dbConfig?.prtgAuthType || 'PASSHASH') as 'PASSWORD' | 'PASSHASH',
        basicAuthUsername: dbConfig?.mrtgUsername || 'appsmg01',
        basicAuthPassword: dbConfig?.mrtgPassword || 'appsmg01',
      };
      result = await discoverPrtg(prtgConfig);
    } else {
      const mrtgConfig: MrtgAuthConfig = {
        baseUrl: dbConfig?.mrtgBaseUrl || 'https://mrtg.nexa.net.id',
        authType: (dbConfig?.mrtgAuthType || 'COOKIE') as 'BASIC' | 'COOKIE' | 'NONE',
        username: dbConfig?.mrtgUsername || undefined,
        password: dbConfig?.mrtgPassword || undefined,
      };
      // Fetch all pages dynamically (discovers all >34,000 graphs and devices)
      result = await discoverMrtg(mrtgConfig, 60);
    }

    if (result.items.length === 0) {
      return NextResponse.json({
        success: false,
        engine,
        error: result.error || 'Tidak ada data yang ditemukan dari server monitoring.',
        isFallback: result.isFallback,
      }, { status: 502 });
    }

    // Bulk upsert: delete old records for this engine, then insert new ones
    // This ensures stale devices that no longer exist are removed
    await prisma.discoveredItem.deleteMany({ where: { engine } });

    // Batch insert in chunks of 500 (safe within SQLite variable limits)
    const CHUNK = 500;
    let inserted = 0;
    for (let i = 0; i < result.items.length; i += CHUNK) {
      const chunk = result.items.slice(i, i + CHUNK);
      await prisma.discoveredItem.createMany({
        data: chunk.map((item) => ({
          engine: item.engine,
          groupName: item.groupName || null,
          subGroupName: item.subGroupName || null,
          deviceName: item.deviceName,
          deviceIp: item.deviceIp || null,
          interfaceName: item.interfaceName,
          fullTitle: item.fullTitle,
          targetId: item.targetId,
          detectedSid: item.detectedSid || null,
          detectedCid: item.detectedCid || null,
          status: item.status || 'Up',
        })),
      });
      inserted += chunk.length;
    }

    return NextResponse.json({
      success: true,
      engine,
      isFallback: result.isFallback,
      totalDevices: result.totalDevices,
      totalInterfaces: result.totalInterfaces,
      insertedCount: inserted,
      error: result.error || null,
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Discovery Sync]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

