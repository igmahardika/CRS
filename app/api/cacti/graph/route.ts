import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getReportPeriodTimestamps,
  fetchCactiGraphImage,
  fetchCactiMetrics,
  MrtgAuthConfig,
} from '@/lib/mrtg-service';

export async function POST(req: NextRequest) {
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

    const mrtgConfig: MrtgAuthConfig = {
      baseUrl: configOverride?.mrtgBaseUrl || dbConfig?.mrtgBaseUrl || 'http://cacti.internal.net',
      authType: configOverride?.mrtgAuthType || (dbConfig?.mrtgAuthType as 'BASIC' | 'COOKIE' | 'NONE') || 'BASIC',
      username: configOverride?.mrtgUsername !== undefined ? configOverride.mrtgUsername : dbConfig?.mrtgUsername,
      password: configOverride?.mrtgPassword !== undefined ? configOverride.mrtgPassword : dbConfig?.mrtgPassword,
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
