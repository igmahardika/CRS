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
export const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('FATAL: AUTH_SECRET environment variable is mandatory in production mode.');
      })()
    : 'dev-crs-reporting-insecure-key-local-only');

/**
 * Creates a signed JWT-like token (HMAC-SHA256)
 */
export function createToken(payload: UserSession, expiresInDays = 7): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
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

