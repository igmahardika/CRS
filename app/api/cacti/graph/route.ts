import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import {
  getReportPeriodTimestamps,
  fetchCactiGraphImage,
  fetchCactiMetrics,
  MrtgAuthConfig,
} from '@/lib/mrtg-service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('report:create');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { graphId, month, year, configOverride } = body;

    if (!graphId) {
      return NextResponse.json({ error: 'graphId is required' }, { status: 400 });
    }

    const currentYear = parseInt(year, 10) || new Date().getFullYear();
    const currentMonth = parseInt(month, 10) || (new Date().getMonth() + 1);

    const { startTs, endTs } = getReportPeriodTimestamps(currentYear, currentMonth);

    // Get MRTG server configuration from database
    const dbConfig = await prisma.appConfig.findUnique({
      where: { id: 'default' },
    });

    // Use trusted system configuration from database only to prevent SSRF
    const mrtgConfig: MrtgAuthConfig = {
      baseUrl: dbConfig?.mrtgBaseUrl || 'http://cacti.internal.net',
      authType: (dbConfig?.mrtgAuthType as 'BASIC' | 'COOKIE' | 'NONE') || 'BASIC',
      username: dbConfig?.mrtgUsername || undefined,
      password: dbConfig?.mrtgPassword || undefined,
    };

    // Parallel fetch for image and metrics
    const [graphResult, metricsResult] = await Promise.all([
      fetchCactiGraphImage(mrtgConfig, String(graphId), startTs, endTs),
      fetchCactiMetrics(mrtgConfig, String(graphId), startTs, endTs),
    ]);

    return NextResponse.json({
      success: graphResult.success,
      imageBase64: graphResult.imageBase64,
      metrics: metricsResult.metrics,
      startTs,
      endTs,
      isFallback: graphResult.isFallback,
      isSimulated: metricsResult.isSimulated,
      error: graphResult.error || metricsResult.error,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
