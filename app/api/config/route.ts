import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { invalidateCactiSessionCache } from '@/lib/mrtg-service';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    let config = await prisma.appConfig.findUnique({
      where: { id: 'default' },
    });

    if (!config) {
      config = await prisma.appConfig.create({
        data: {
          id: 'default',
          mrtgBaseUrl: 'http://cacti.internal.net',
          mrtgUsername: '',
          mrtgPassword: '',
          mrtgAuthType: 'BASIC',
          prtgBaseUrl: 'http://prtg.internal.net',
          prtgUsername: '',
          prtgPassword: '',
          prtgAuthType: 'PASSWORD',
          coverMrtgPath: '/assets/templates/cover_mrtg.png',
          coverSlaPath: '/assets/templates/cover_sla.png',
          pageBgPath: '/assets/templates/page_bg.png',
          defaultTargetSla: 99.5,
          documentNumberPrefix: 'IMUN.01',
        },
      });
    }

    return NextResponse.json({ config });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const updated = await prisma.appConfig.upsert({
      where: { id: 'default' },
      update: {
        mrtgBaseUrl: body.mrtgBaseUrl,
        mrtgUsername: body.mrtgUsername,
        mrtgPassword: body.mrtgPassword,
        mrtgAuthType: body.mrtgAuthType || 'BASIC',
        prtgBaseUrl: body.prtgBaseUrl || 'http://prtg.internal.net',
        prtgUsername: body.prtgUsername || '',
        prtgPassword: body.prtgPassword || '',
        prtgAuthType: body.prtgAuthType || 'PASSWORD',
        coverMrtgPath: body.coverMrtgPath,
        coverSlaPath: body.coverSlaPath,
        pageBgPath: body.pageBgPath,
        defaultTargetSla: parseFloat(body.defaultTargetSla) || 99.5,
        documentNumberPrefix: body.documentNumberPrefix || 'IMUN.01',
      },
      create: {
        id: 'default',
        mrtgBaseUrl: body.mrtgBaseUrl || 'http://cacti.internal.net',
        mrtgUsername: body.mrtgUsername || '',
        mrtgPassword: body.mrtgPassword || '',
        mrtgAuthType: body.mrtgAuthType || 'BASIC',
        prtgBaseUrl: body.prtgBaseUrl || 'http://prtg.internal.net',
        prtgUsername: body.prtgUsername || '',
        prtgPassword: body.prtgPassword || '',
        prtgAuthType: body.prtgAuthType || 'PASSWORD',
        coverMrtgPath: body.coverMrtgPath || '/assets/templates/cover_mrtg.png',
        coverSlaPath: body.coverSlaPath || '/assets/templates/cover_sla.png',
        pageBgPath: body.pageBgPath || '/assets/templates/page_bg.png',
        defaultTargetSla: parseFloat(body.defaultTargetSla) || 99.5,
        documentNumberPrefix: body.documentNumberPrefix || 'IMUN.01',
      },
    });

    // Invalidate cached Cacti session cookie so new credentials apply immediately
    invalidateCactiSessionCache();

    return NextResponse.json({ config: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
