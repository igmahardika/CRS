export interface UserSession {
  id: string;
  username: string;
  name: string;
  email?: string | null;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
}

export const AUTH_COOKIE_NAME = 'genre_auth_token';
export const AUTH_SECRET = process.env.AUTH_SECRET || 'nexa-genre-reporting-secure-key-2026-auth-prod';

/**
 * Web-Crypto (Edge-compatible) HMAC-SHA256 signature verification
 */
export async function verifyTokenEdge(token: string): Promise<(UserSession & { exp: number }) | null> {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(AUTH_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const sigBuffer = await globalThis.crypto.subtle.sign(
      'HMAC',
      key,
      enc.encode(`${header}.${body}`)
    );

    const expectedSig = Buffer.from(sigBuffer).toString('base64url');

    if (signature !== expectedSig) {
      return null; // Signature mismatch
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

