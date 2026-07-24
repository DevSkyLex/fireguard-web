import { getTimezoneOffsetLabel } from './timezone-offset.utils';

describe('getTimezoneOffsetLabel', () => {
  it('formats a positive UTC offset', () => {
    expect(getTimezoneOffsetLabel('Europe/Paris')).toMatch(/^UTC\+\d{2}:\d{2}$/);
  });

  it('formats a negative UTC offset', () => {
    expect(getTimezoneOffsetLabel('America/New_York')).toMatch(/^UTC-\d{2}:\d{2}$/);
  });

  it('returns UTC for zero-offset zones', () => {
    expect(getTimezoneOffsetLabel('UTC')).toBe('UTC');
  });

  it('returns an empty string for an unknown timezone', () => {
    expect(getTimezoneOffsetLabel('Not/ATimezone')).toBe('');
  });
});
