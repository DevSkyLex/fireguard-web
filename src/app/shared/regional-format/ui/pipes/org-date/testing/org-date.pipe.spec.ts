import type { RegionalFormatSettings } from '../../../../models/regional-format-settings.interface';
import { OrgDatePipe } from '../org-date.pipe';

describe('OrgDatePipe', () => {
  let pipe: OrgDatePipe;

  const settings: RegionalFormatSettings = {
    dateFormat: 'MM/dd/yyyy',
    timezone: 'UTC',
  };

  beforeEach(() => {
    pipe = new OrgDatePipe();
  });

  it('should format a date with the default settings when none are given', () => {
    expect(pipe.transform('2026-01-05T00:00:00.000Z')).toBe('2026-01-05');
  });

  it('should format a date with the given settings', () => {
    expect(pipe.transform('2026-01-05T00:00:00.000Z', 'date', settings)).toBe('01/05/2026');
  });

  it('should append the time in datetime mode', () => {
    expect(pipe.transform('2026-01-05T14:30:00.000Z', 'datetime', settings)).toBe(
      '01/05/2026 14:30',
    );
  });

  it('should apply the given timezone', () => {
    const offsetSettings: RegionalFormatSettings = { ...settings, timezone: '+0200' };

    expect(pipe.transform('2026-01-05T14:30:00.000Z', 'datetime', offsetSettings)).toBe(
      '01/05/2026 16:30',
    );
  });

  it('should return an empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return an empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return an empty string for an empty string', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('should return an empty string for an invalid date', () => {
    expect(pipe.transform('not-a-date')).toBe('');
  });

  it('should format a Date instance', () => {
    expect(pipe.transform(new Date('2026-06-15T00:00:00.000Z'))).toBe('2026-06-15');
  });

  it('should format a numeric timestamp', () => {
    expect(pipe.transform(new Date('2026-06-15T00:00:00.000Z').getTime())).toBe('2026-06-15');
  });
});
