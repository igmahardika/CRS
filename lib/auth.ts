import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import {
  UserSession,
  AUTH_COOKIE_NAME,
  AUTH_SECRET,
  createToken,
  verifyToken,
} from './token';

export type { UserSession };
export { AUTH_COOKIE_NAME, AUTH_SECRET, createToken, verifyToken };

// ============================================================
// Password Hashing (PBKDF2 / scrypt)
// ============================================================

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
    const compBuf = Buffer.from(computedHash, 'hex');
    const hashBuf = Buffer.from(hash, 'hex');
    if (compBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(compBuf, hashBuf);
  } catch {
    return false;
  }
}

// ============================================================
// Next.js Cookie Session Helpers
// ============================================================

export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    // Verify user exists and is active in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, username: true, name: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role as 'ADMIN' | 'SUPERVISOR' | 'STAFF' | 'OPERATOR' | 'VIEWER' | 'REQUESTER',
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(session: UserSession) {
  const token = createToken(session);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.SECURE_COOKIES === 'true',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

// ============================================================
// API Route RBAC Authorization Guards
// ============================================================

export type AuthCheckResult =
  | { authorized: true; session: UserSession }
  | { authorized: false; error: string; status: number };

export async function requireAuth(): Promise<AuthCheckResult> {
  const session = await getSession();
  if (!session) {
    return {
      authorized: false,
      error: 'Your session is invalid or has expired. Please sign in again.',
      status: 401,
    };
  }
  return { authorized: true, session };
}

export async function requireAdmin(): Promise<AuthCheckResult> {
  const check = await requireAuth();
  if (!check.authorized) return check;
  if (check.session.role !== 'ADMIN') {
    return {
      authorized: false,
      error: 'Access denied: Administrator privileges required.',
      status: 403,
    };
  }
  return check;
}

export async function requireSupervisorOrAdmin(): Promise<AuthCheckResult> {
  const check = await requireAuth();
  if (!check.authorized) return check;
  if (check.session.role !== 'ADMIN' && check.session.role !== 'SUPERVISOR') {
    return {
      authorized: false,
      error: 'Akses ditolak: Wewenang Supervisor atau Administrator diperlukan untuk tindakan ini.',
      status: 403,
    };
  }
  return check;
}

export async function requireOperatorOrAdmin(): Promise<AuthCheckResult> {
  const check = await requireAuth();
  if (!check.authorized) return check;
  const role = check.session.role;
  if (role !== 'ADMIN' && role !== 'SUPERVISOR' && role !== 'STAFF' && role !== 'OPERATOR') {
    return {
      authorized: false,
      error: 'Access denied: Read-only accounts cannot modify records.',
      status: 403,
    };
  }
  return check;
}

export async function requireStaffOrAbove(): Promise<AuthCheckResult> {
  return requireOperatorOrAdmin();
}

// ============================================================
// Default Admin Seeding
// ============================================================

export async function ensureDefaultAdmin() {
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    const { hash, salt } = hashPassword('admin123');
    await prisma.user.create({
      data: {
        username: 'admin',
        name: 'System Administrator',
        email: 'admin@internal.net',
        passwordHash: hash,
        passwordSalt: salt,
        role: 'ADMIN',
        isActive: true,
      },
    });
  }
}
