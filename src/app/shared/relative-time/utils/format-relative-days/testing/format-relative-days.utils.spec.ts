import { formatRelativeDays } from '../format-relative-days.utils';

describe('formatRelativeDays', () => {
  it('should render "today" for the same calendar day', () => {
    expect(formatRelativeDays('2026-06-15', '2026-06-15', 'en-US')).toBe('today');
  });

  it('should render "tomorrow" for the next calendar day', () => {
    expect(formatRelativeDays('2026-06-16', '2026-06-15', 'en-US')).toBe('tomorrow');
  });

  it('should render "yesterday" for the previous calendar day', () => {
    expect(formatRelativeDays('2026-06-14', '2026-06-15', 'en-US')).toBe('yesterday');
  });

  it('should render a future day count beyond tomorrow', () => {
    expect(formatRelativeDays('2026-06-18', '2026-06-15', 'en-US')).toBe('in 3 days');
  });

  it('should render a past day count beyond yesterday', () => {
    expect(formatRelativeDays('2026-06-10', '2026-06-15', 'en-US')).toBe('5 days ago');
  });

  it('should accept a UTC-midnight ISO instant for the target date', () => {
    expect(formatRelativeDays('2026-06-18T00:00:00.000Z', '2026-06-15', 'en-US')).toBe('in 3 days');
  });

  it('should accept a UTC-midnight ISO instant for the reference date', () => {
    expect(formatRelativeDays('2026-06-18', '2026-06-15T00:00:00.000Z', 'en-US')).toBe('in 3 days');
  });

  it('should stay a whole calendar day across the spring-forward DST transition', () => {
    expect(formatRelativeDays('2026-03-30', '2026-03-29', 'en-US')).toBe('tomorrow');
  });

  it('should stay a whole calendar day across the autumn DST transition', () => {
    expect(formatRelativeDays('2026-10-26', '2026-10-25', 'en-US')).toBe('tomorrow');
  });

  it('should never let the calendar day shift when the runtime timezone is behind UTC', () => {
    const originalTz: string | undefined = process.env['TZ'];
    process.env['TZ'] = 'Pacific/Honolulu';
    try {
      expect(
        formatRelativeDays('2026-06-16T00:00:00.000Z', '2026-06-15T00:00:00.000Z', 'en-US'),
      ).toBe('tomorrow');
    } finally {
      if (originalTz === undefined) {
        delete process.env['TZ'];
      } else {
        process.env['TZ'] = originalTz;
      }
    }
  });

  it('should honor the given locale', () => {
    expect(formatRelativeDays('2026-06-16', '2026-06-15', 'fr-FR')).toBe('demain');
  });
  it('should return the raw value when either date cannot be parsed', () => {
    expect(formatRelativeDays('not-a-date', '2026-06-15', 'en-US')).toBe('not-a-date');
    expect(formatRelativeDays('2026-06-16', 'not-a-date', 'en-US')).toBe('2026-06-16');
  });
});
