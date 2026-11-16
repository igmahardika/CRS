import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';
import {
  getPrtgPeriodDates,
  fetchPrtgGraphImage,
  fetchPrtgTrafficMetrics,
  PrtgAuthConfig,
} from '@/lib/prtg-service';

export async function POST(req: NextRequest) {
  const auth = await requirePermission('report:create');
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { sensorId, month, year, configOverride } = body;

    if (!sensorId) {
      return NextResponse.json({ error: 'sensorId is required' }, { status: 400 });
    }

    const currentYear = parseInt(year, 10) || new Date().getFullYear();
    const currentMonth = parseInt(month, 10) || (new Date().getMonth() + 1);

    const { sdate, edate, startDateStr, endDateStr } = getPrtgPeriodDates(currentYear, currentMonth);

    // Get PRTG server configuration from database
    const dbConfig = (await prisma.appConfig.findUnique({
      where: { id: 'default' },
    })) as any;

    const prtgConfig: PrtgAuthConfig = {
      baseUrl: configOverride?.prtgBaseUrl || dbConfig?.prtgBaseUrl || 'https://nms.nexa.net.id',
      username: configOverride?.prtgUsername !== undefined ? configOverride.prtgUsername : dbConfig?.prtgUsername,
      password: configOverride?.prtgPassword !== undefined ? configOverride.prtgPassword : dbConfig?.prtgPassword,
      authType: (configOverride?.prtgAuthType || dbConfig?.prtgAuthType || 'PASSHASH') as 'PASSWORD' | 'PASSHASH',
      basicAuthUsername: configOverride?.prtgBasicUsername || dbConfig?.prtgBasicUsername || dbConfig?.mrtgUsername || 'appsmg01',
      basicAuthPassword: configOverride?.prtgBasicPassword || dbConfig?.prtgBasicPassword || dbConfig?.mrtgPassword || 'appsmg01',
    };

    // Parallel fetch for PRTG graph image and traffic metrics
    const [graphResult, metricsResult] = await Promise.all([
      fetchPrtgGraphImage(prtgConfig, String(sensorId), currentYear, currentMonth),
      fetchPrtgTrafficMetrics(prtgConfig, String(sensorId), currentYear, currentMonth),
    ]);

    return NextResponse.json({
      success: !graphResult.isFallback || Boolean(graphResult.imageBase64),
      engine: 'PRTG',
      imageBase64: graphResult.imageBase64,
      metrics: metricsResult.metrics,
      sdate,
      edate,
      startDateStr,
      endDateStr,
      isFallback: graphResult.isFallback || metricsResult.isFallback,
      metricsFallback: metricsResult.isFallback,
      error: graphResult.error || metricsResult.error || null,
      metricsError: metricsResult.error || null,
      debugKeys: (metricsResult as any).debugKeys || null,
      debugSample: (metricsResult as any).debugSample || null,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching PRTG graph:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

