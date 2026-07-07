import { resolveReturnUrl } from '../return-url.utils';

describe('resolveReturnUrl', () => {
  it('accepts an absolute in-app path', () => {
    expect(resolveReturnUrl('/organizations/invitations/accept?token=abc')).toBe(
      '/organizations/invitations/accept?token=abc',
    );
  });

  it('falls back when the value is absent', () => {
    expect(resolveReturnUrl(null)).toBe('/');
    expect(resolveReturnUrl(undefined)).toBe('/');
    expect(resolveReturnUrl('')).toBe('/');
  });

  it('uses the provided fallback', () => {
    expect(resolveReturnUrl(null, '/dashboard')).toBe('/dashboard');
    expect(resolveReturnUrl('https://evil.com', '/dashboard')).toBe('/dashboard');
  });

  it('rejects protocol-relative and absolute URLs', () => {
    expect(resolveReturnUrl('//evil.com')).toBe('/');
    expect(resolveReturnUrl('https://evil.com')).toBe('/');
    expect(resolveReturnUrl('http://evil.com/path')).toBe('/');
  });

  it('rejects backslash-obfuscated paths', () => {
    expect(resolveReturnUrl('\\evil.com')).toBe('/');
    expect(resolveReturnUrl('/\\evil.com')).toBe('/');
    expect(resolveReturnUrl('/\\/evil.com')).toBe('/');
  });

  it('rejects values that are not absolute paths', () => {
    expect(resolveReturnUrl('evil.com')).toBe('/');
    expect(resolveReturnUrl('javascript:alert(1)')).toBe('/');
  });
});
