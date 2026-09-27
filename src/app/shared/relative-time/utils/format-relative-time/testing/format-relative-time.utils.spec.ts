import { formatRelativeTime } from '../format-relative-time.utils';

describe('formatRelativeTime', () => {
  const now: Date = new Date('2026-06-15T12:00:00.000Z');

  it('should return the "Just now" label for an elapsed time under a minute', () => {
    const iso: string = new Date(now.getTime() - 59_700).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('Just now');
  });

  it('should format 45 minutes in the past without being promoted to hours', () => {
    const iso: string = new Date(now.getTime() - 45 * 60 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('45 minutes ago');
  });

  it('should format 45 minutes in the future without being promoted to hours', () => {
    const iso: string = new Date(now.getTime() + 45 * 60 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('in 45 minutes');
  });

  it('should format a past timestamp in hours', () => {
    const iso: string = new Date(now.getTime() - 2 * 3_600 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('2 hours ago');
  });

  it('should format a past timestamp in days', () => {
    const iso: string = new Date(now.getTime() - 3 * 86_400 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('3 days ago');
  });

  it('should format a future timestamp', () => {
    const iso: string = new Date(now.getTime() + 3 * 86_400 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('in 3 days');
  });

  it('should return the raw value when it cannot be parsed', () => {
    expect(formatRelativeTime('not-a-date', 'en-US', now)).toBe('not-a-date');
  });

  it('should honor the given locale', () => {
    const iso: string = new Date(now.getTime() - 3_600 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'fr-FR', now)).toBe('il y a 1 heure');
  });

  it('should default to the current time when now is omitted', () => {
    const iso: string = new Date(Date.now() - 2 * 3_600 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US')).toBe('2 hours ago');
  });

  it('should round a past half-minute boundary the same way as a future one', () => {
    const iso: string = new Date(now.getTime() - 90 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('2 minutes ago');
  });

  it('should round a future half-minute boundary the same way as a past one', () => {
    const iso: string = new Date(now.getTime() + 90 * 1000).toISOString();

    expect(formatRelativeTime(iso, 'en-US', now)).toBe('in 2 minutes');
  });
  it('should promote a rounded count that reaches the next unit', () => {
    const cases: ReadonlyArray<readonly [number, string]> = [
      [(59 * 60 + 40) * 1000, '1 hour ago'],
      [(23 * 3_600 + 40 * 60) * 1000, 'yesterday'],
      [(6 * 86_400 + 14 * 3_600) * 1000, 'last week'],
      [350 * 86_400 * 1000, 'last year'],
    ];

    for (const [elapsed, label] of cases) {
      const iso: string = new Date(now.getTime() - elapsed).toISOString();

      expect(formatRelativeTime(iso, 'en-US', now)).toBe(label);
    }
  });
});
