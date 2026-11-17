import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, setSessionCookie, ensureDefaultAdmin } from '@/lib/auth';
import { getDefaultLandingRoute } from '@/lib/permissions';
import { UserSession } from '@/lib/token';

// In-memory rate limiter for failed login attempts (5 attempts per 15 minutes)
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const record = failedAttempts.get(key);
  if (!record) return false;
  if (now > record.resetAt) {
    failedAttempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const now = Date.now();
  const record = failedAttempts.get(key);
  if (!record || now > record.resetAt) {
    failedAttempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    record.count += 1;
  }
}

function clearFailure(key: string) {
  failedAttempts.delete(key);
}

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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateLimitKey = `${ip}:${cleanUsername.toLowerCase()}`;

    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan login gagal. Demi keamanan akun, silakan coba kembali setelah 15 menit.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: cleanUsername },
          { email: cleanUsername },
        ],
      },
    });

    if (!user) {
      recordFailure(rateLimitKey);
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
      recordFailure(rateLimitKey);
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      );
    }

    // Login successful: reset rate limit tracking for this account/IP
    clearFailure(rateLimitKey);

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
    console.error('[API Auth Login]', err);
    return NextResponse.json(
      { error: 'Terjadi kesalahan sistem saat memproses login.' },
      { status: 500 }
    );
  }
}

