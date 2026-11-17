import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    // Verify database connectivity by running a lightweight query
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch (err: unknown) {
    dbStatus = 'unhealthy';
    console.error('[Health Check DB Error]', err);
  }

  const memoryUsage = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());

  const isHealthy = dbStatus === 'healthy';

  const payload = {
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'customer-reporting-system',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    checks: {
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      },
    },
    responseTimeMs: Date.now() - startTime,
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
  });
}
