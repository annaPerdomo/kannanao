import { describe, it, expect } from 'vitest';
import { isAdminUser, isAdminEmail } from '@/lib/admin';

// NEXT_PUBLIC_ADMIN_USERNAME is not set in tests → falls back to 'test'
// ADMIN_DOMAIN is 'kannanao.local' (hardcoded in admin.ts)

describe('isAdminUser', () => {
  it('should return false for undefined email', () => {
    expect(isAdminUser(undefined)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isAdminUser('')).toBe(false);
  });

  it('should return false for wrong domain', () => {
    expect(isAdminUser('test@gmail.com')).toBe(false);
    expect(isAdminUser('test@example.com')).toBe(false);
  });

  it('should return true for the admin username at kannanao.local', () => {
    // Falls back to username 'test' when NEXT_PUBLIC_ADMIN_USERNAME is unset
    expect(isAdminUser('test@kannanao.local')).toBe(true);
  });

  it('should return false for a non-admin username at kannanao.local', () => {
    expect(isAdminUser('otheruser@kannanao.local')).toBe(false);
    expect(isAdminUser('admin@kannanao.local')).toBe(false);
  });

  it('should return false for email with no @ sign', () => {
    // Splitting on '@' gives ['testkannanao.local', undefined]
    // domain will be undefined, !== ADMIN_DOMAIN
    expect(isAdminUser('testkannanao.local')).toBe(false);
  });
});

describe('isAdminEmail', () => {
  it('should return false for undefined email', () => {
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('should return false for wrong domain', () => {
    expect(isAdminEmail('test@gmail.com')).toBe(false);
  });

  it('should return true for the admin username at kannanao.local', () => {
    expect(isAdminEmail('test@kannanao.local')).toBe(true);
  });

  it('should return false for non-admin username at kannanao.local', () => {
    expect(isAdminEmail('notadmin@kannanao.local')).toBe(false);
  });

  it('should be case-sensitive on username', () => {
    // 'Test' !== 'test'
    expect(isAdminEmail('Test@kannanao.local')).toBe(false);
  });
});
