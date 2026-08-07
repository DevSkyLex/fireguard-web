import { formatInterventionRelativeTime } from '../intervention-relative-time.utils';

describe('formatInterventionRelativeTime', () => {
  it('should format a past timestamp as a relative label', () => {
    const twoHoursAgo: string = new Date(Date.now() - 2 * 3_600 * 1000).toISOString();

    expect(formatInterventionRelativeTime(twoHoursAgo, 'en-US')).toBe('2 hours ago');
  });

  it('should format a future timestamp as a relative label', () => {
    const inThreeDays: string = new Date(Date.now() + 3 * 86_400 * 1000).toISOString();

    expect(formatInterventionRelativeTime(inThreeDays, 'en-US')).toBe('in 3 days');
  });

  it('should fall back to seconds under the smallest threshold', () => {
    const fewSecondsAgo: string = new Date(Date.now() - 5 * 1000).toISOString();

    expect(formatInterventionRelativeTime(fewSecondsAgo, 'en-US')).toBe('5 seconds ago');
  });

  it('should return the raw value when it cannot be parsed', () => {
    expect(formatInterventionRelativeTime('not-a-date', 'en-US')).toBe('not-a-date');
  });

  it('should honor the given locale', () => {
    const oneHourAgo: string = new Date(Date.now() - 3_600 * 1000).toISOString();

    expect(formatInterventionRelativeTime(oneHourAgo, 'fr-FR')).toBe('il y a 1 heure');
  });
});
