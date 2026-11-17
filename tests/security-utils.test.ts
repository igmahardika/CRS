import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../lib/utils';

describe('Security Utilities Unit Tests (lib/utils.ts)', () => {
  it('should escape malicious HTML and script injection tags', () => {
    const malicious = '<script>alert("XSS")</script>';
    const escaped = escapeHtml(malicious);
    assert.equal(escaped, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
  });

  it('should escape quotes, ampersands, and single quotes', () => {
    const input = `Customer & Partners "VIP" 'Special'`;
    const escaped = escapeHtml(input);
    assert.equal(escaped, 'Customer &amp; Partners &quot;VIP&quot; &#039;Special&#039;');
  });

  it('should handle null, undefined, and non-string values gracefully', () => {
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(12345), '12345');
    assert.equal(escapeHtml(0), '0');
  });
});
