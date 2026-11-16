import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie, ensureDefaultAdmin } from '@/lib/auth';
import { getDefaultLandingRoute } from '@/lib/permissions';
import { UserSession } from '@/lib/token';

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanUsername },
        ],
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Your account has been disabled. Please contact your system administrator.' },
        { status: 403 }
      );
    }

    const isMatch = verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Update lastLogin timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const userSession: UserSession = {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role as UserSession['role'],
      department: user.department || 'Network Operation',
    };

    await setSessionCookie(userSession);

    const defaultRoute = getDefaultLandingRoute(userSession);

    return NextResponse.json({
      success: true,
      message: 'Sign in successful.',
      user: userSession,
      defaultRoute,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[API Auth Login]', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

