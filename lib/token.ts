import crypto from 'crypto';

export interface UserSession {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: 'ADMIN' | 'SUPERVISOR' | 'STAFF' | 'OPERATOR' | 'VIEWER';
  department: string;
}

export const AUTH_COOKIE_NAME = 'crs_auth_token';
export const LEGACY_AUTH_COOKIE_NAME = 'genre_auth_token';
const FALLBACK_SECRET = 'nexa-crs-default-auth-secret-change-in-production';
export const AUTH_SECRET = process.env.AUTH_SECRET || FALLBACK_SECRET;

if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
  if (typeof window === 'undefined' && process.env.NEXT_PHASE !== 'phase-production-build') {
    console.warn('[SECURITY WARNING] AUTH_SECRET is not set in environment. Using fallback secret.');
  }
}

export const ROLE_SESSION_MAX_AGE_SECONDS: Record<string, number> = {
  ADMIN: 4 * 60 * 60,        // 4 Hours (High Privilege security boundary)
  SUPERVISOR: 8 * 60 * 60,   // 8 Hours (Standard supervisory work day)
  OPERATOR: 12 * 60 * 60,    // 12 Hours (NOC duty shift)
  STAFF: 12 * 60 * 60,       // 12 Hours (Departmental duty shift)
  VIEWER: 24 * 60 * 60,      // 24 Hours (Read-only observer session)
};

export function getSessionDurationSeconds(role?: string): number {
  if (role && role in ROLE_SESSION_MAX_AGE_SECONDS) {
    return ROLE_SESSION_MAX_AGE_SECONDS[role];
  }
  return 8 * 60 * 60; // default 8 hours
}

/**
 * Creates a signed JWT-like token (HMAC-SHA256)
 */
export function createToken(payload: UserSession, expiresInSeconds?: number): string {
  const duration = expiresInSeconds || getSessionDurationSeconds(payload.role);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + duration;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

/**
 * Cryptographically verifies token signature and expiration
 */
export function verifyToken(token: string): (UserSession & { exp: number }) | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    if (!payload.department) {
      payload.department = 'Network Operation';
    }

    return payload;
  } catch {
    return null;
  }
}

