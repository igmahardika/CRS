import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = await requirePermission('discovery:view');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const engine = searchParams.get('engine') as 'MRTG' | 'PRTG' | null;
    const search = searchParams.get('search')?.toLowerCase().trim() || '';

    const where: Record<string, unknown> = {};
    if (engine && ['MRTG', 'PRTG'].includes(engine)) {
      where.engine = engine;
    }

    // Apply search filter at DB level for indexed fields
    if (search) {
      where.OR = [
        { deviceName: { contains: search } },
        { interfaceName: { contains: search } },
        { fullTitle: { contains: search } },
        { detectedSid: { contains: search } },
        { groupName: { contains: search } },
        { targetId: { contains: search } },
      ];
    }

    const limitParam = parseInt(searchParams.get('limit') || '', 10);
    const take = !isNaN(limitParam) && limitParam > 0 ? limitParam : (search ? 3000 : 1500);

    const totalMatching = await prisma.discoveredItem.count({ where });

    const rawItems = await prisma.discoveredItem.findMany({
      where,
      take,
      orderBy: [{ groupName: 'asc' }, { deviceName: 'asc' }, { interfaceName: 'asc' }],
    });

    // Build grouped tree structure: { groupName -> { deviceName -> items[] } }
    const treeMap = new Map<string, Map<string, typeof rawItems>>();

    for (const item of rawItems) {
      const group = item.groupName || 'Uncategorized';
      if (!treeMap.has(group)) {
        treeMap.set(group, new Map());
      }
      const deviceMap = treeMap.get(group)!;
      if (!deviceMap.has(item.deviceName)) {
        deviceMap.set(item.deviceName, []);
      }
      deviceMap.get(item.deviceName)!.push(item);
    }

    // Convert to serializable structure
    const tree = Array.from(treeMap.entries()).map(([groupName, deviceMap]) => ({
      groupName,
      devices: Array.from(deviceMap.entries()).map(([deviceName, interfaces]) => ({
        deviceName,
        deviceIp: interfaces[0]?.deviceIp || null,
        interfaces: interfaces.map((i) => ({
          id: i.id,
          interfaceName: i.interfaceName,
          fullTitle: i.fullTitle,
          targetId: i.targetId,
          detectedSid: i.detectedSid,
          detectedCid: i.detectedCid,
          status: i.status,
          lastDiscovered: i.lastDiscovered,
        })),
      })),
    }));

    // Summary counts
    const mrtgCount = await prisma.discoveredItem.count({ where: { engine: 'MRTG' } });
    const prtgCount = await prisma.discoveredItem.count({ where: { engine: 'PRTG' } });
    const lastMrtg = await prisma.discoveredItem.findFirst({
      where: { engine: 'MRTG' },
      orderBy: { lastDiscovered: 'desc' },
      select: { lastDiscovered: true },
    });
    const lastPrtg = await prisma.discoveredItem.findFirst({
      where: { engine: 'PRTG' },
      orderBy: { lastDiscovered: 'desc' },
      select: { lastDiscovered: true },
    });

    return NextResponse.json({
      success: true,
      tree,
      totalItems: rawItems.length,
      totalMatching,
      summary: {
        mrtgCount,
        prtgCount,
        lastMrtgSync: lastMrtg?.lastDiscovered || null,
        lastPrtgSync: lastPrtg?.lastDiscovered || null,
      },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Discovery Tree]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

