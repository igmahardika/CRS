import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../lib/auth';
import { createToken, verifyToken } from '../lib/token';

describe('Auth Unit Tests (lib/auth.ts & lib/token.ts)', () => {
  it('should correctly hash and verify passwords using scrypt', () => {
    const password = 'SuperSecretPassword2026!';
    const { hash, salt } = hashPassword(password);

    assert.ok(hash && hash.length > 20, 'Hash should be generated');
    assert.ok(salt && salt.length > 10, 'Salt should be generated');

    const isValid = verifyPassword(password, hash, salt);
    assert.equal(isValid, true, 'Valid password should verify successfully');

    const isInvalid = verifyPassword('WrongPassword', hash, salt);
    assert.equal(isInvalid, false, 'Invalid password should fail verification');
  });

  it('should sign and cryptographically verify tokens', () => {
    const payload = {
      id: 'user_123',
      username: 'noc_admin',
      name: 'NOC Administrator',
      email: 'admin@nexa.net.id',
      role: 'ADMIN' as const,
      department: 'Network Operation',
    };

    const token = createToken(payload, 7);
    assert.ok(token, 'Token string should be generated');

    const verified = verifyToken(token);
    assert.ok(verified, 'Token should verify successfully');
    assert.equal(verified?.id, 'user_123');
    assert.equal(verified?.username, 'noc_admin');
    assert.equal(verified?.role, 'ADMIN');
    assert.equal(verified?.department, 'Network Operation');
  });

  it('should reject tampered or corrupted tokens', () => {
    const payload = {
      id: 'user_456',
      username: 'operator',
      name: 'Operator User',
      email: 'operator@nexa.net.id',
      role: 'OPERATOR' as const,
      department: 'Network Operation',
    };

    const token = createToken(payload, 1);
    const tampered = token.slice(0, -5) + 'xxxxx';

    const verified = verifyToken(tampered);
    assert.equal(verified, null, 'Tampered token must return null');

    const invalidFormat = verifyToken('not.a.valid.jwt.format');
    assert.equal(invalidFormat, null, 'Invalid format must return null');
  });
});
