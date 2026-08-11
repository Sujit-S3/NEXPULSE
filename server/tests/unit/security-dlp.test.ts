import { describe, expect, it } from 'vitest';
import { inspectSensitiveData, redactSensitiveData } from '../../src/modules/security/dlp.js';

describe('data loss prevention', () => {
  it('detects sensitive values without retaining the raw value', () => {
    const findings = inspectSensitiveData({
      contact: 'security@example.com',
      payment: '4111 1111 1111 1111',
      nested: { token: 'nxk_abcdefgh.abcdefghijklmnopqrstuvwxyz123456' }, // secret-scan:allow synthetic DLP fixture
    });
    expect(findings.map((finding) => finding.type)).toEqual(
      expect.arrayContaining(['email', 'payment_card', 'credential']),
    );
    expect(JSON.stringify(findings)).not.toContain('4111 1111 1111 1111');
    expect(JSON.stringify(findings)).not.toContain('abcdefghijklmnopqrstuvwxyz123456');
  });

  it('redacts sensitive keys and inline identifiers for safe logging', () => {
    const redacted = redactSensitiveData({
      password: 'not-for-logs',
      message: 'Contact security@example.com',
    });
    expect(redacted).toEqual({
      password: '[REDACTED]',
      message: 'Contact [REDACTED:email]',
    });
  });

  it('does not classify an invalid card checksum as a payment card', () => {
    const findings = inspectSensitiveData('Card 4111 1111 1111 1112');
    expect(findings.some((finding) => finding.type === 'payment_card')).toBe(false);
  });
});
