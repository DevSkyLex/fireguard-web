import { formatDate } from '@angular/common';
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

  describe('IANA timezone support', () => {
    const isoSettings: RegionalFormatSettings = { dateFormat: 'yyyy-MM-dd', timezone: 'UTC' };

    it('should apply the CEST offset for Europe/Paris in summer', () => {
      const zoneSettings: RegionalFormatSettings = { ...isoSettings, timezone: 'Europe/Paris' };

      expect(pipe.transform('2026-07-15T12:00:00.000Z', 'datetime', zoneSettings)).toBe(
        '2026-07-15 14:00',
      );
    });

    it('should apply the CET offset for Europe/Paris in winter', () => {
      const zoneSettings: RegionalFormatSettings = { ...isoSettings, timezone: 'Europe/Paris' };

      expect(pipe.transform('2026-01-15T12:00:00.000Z', 'datetime', zoneSettings)).toBe(
        '2026-01-15 13:00',
      );
    });

    it('should apply the America/New_York offset', () => {
      const zoneSettings: RegionalFormatSettings = {
        ...isoSettings,
        timezone: 'America/New_York',
      };

      expect(pipe.transform('2026-07-15T12:00:00.000Z', 'datetime', zoneSettings)).toBe(
        '2026-07-15 08:00',
      );
    });

    it('should apply the Asia/Tokyo offset, which never observes DST', () => {
      const zoneSettings: RegionalFormatSettings = { ...isoSettings, timezone: 'Asia/Tokyo' };

      expect(pipe.transform('2026-07-15T12:00:00.000Z', 'datetime', zoneSettings)).toBe(
        '2026-07-15 21:00',
      );
    });

    it('should switch offset across the spring-forward DST transition', () => {
      const zoneSettings: RegionalFormatSettings = { ...isoSettings, timezone: 'Europe/Paris' };

      expect(pipe.transform('2026-03-29T00:59:00.000Z', 'datetime', zoneSettings)).toBe(
        '2026-03-29 01:59',
      );
      expect(pipe.transform('2026-03-29T01:01:00.000Z', 'datetime', zoneSettings)).toBe(
        '2026-03-29 03:01',
      );
    });

    it("should not throw for an invalid timezone and keep formatDate's own fallback behavior", () => {
      const zoneSettings: RegionalFormatSettings = { ...isoSettings, timezone: 'Not/AZone' };
      const instant = '2026-07-15T12:00:00.000Z';

      expect(() => pipe.transform(instant, 'datetime', zoneSettings)).not.toThrow();
      expect(pipe.transform(instant, 'datetime', zoneSettings)).toBe(
        formatDate(instant, 'yyyy-MM-dd HH:mm', 'en-US', 'Not/AZone'),
      );
    });
  });

  describe('dateOnly mode', () => {
    const dateOnlySettings: RegionalFormatSettings = { dateFormat: 'MM/dd/yyyy', timezone: 'UTC' };

    it('should format a plain YYYY-MM-DD string with no timezone conversion', () => {
      expect(pipe.transform('2026-03-01', 'dateOnly', dateOnlySettings)).toBe('03/01/2026');
    });

    it('should format a UTC-midnight ISO instant on the same calendar day as the string form', () => {
      expect(pipe.transform('2026-03-01T00:00:00.000Z', 'dateOnly', dateOnlySettings)).toBe(
        '03/01/2026',
      );
    });

    it('should never let the calendar day shift when the runtime timezone is behind UTC', () => {
      const originalTz: string | undefined = process.env['TZ'];
      process.env['TZ'] = 'Pacific/Honolulu';
      try {
        expect(pipe.transform('2026-03-01T00:00:00.000Z', 'dateOnly', dateOnlySettings)).toBe(
          '03/01/2026',
        );
        expect(pipe.transform('2026-03-01', 'dateOnly', dateOnlySettings)).toBe('03/01/2026');
      } finally {
        if (originalTz === undefined) {
          delete process.env['TZ'];
        } else {
          process.env['TZ'] = originalTz;
        }
      }
    });

    it('should return an empty string for an unparsable value', () => {
      expect(pipe.transform('not-a-date', 'dateOnly', dateOnlySettings)).toBe('');
    });

    it('should ignore the organization timezone, east or west of UTC', () => {
      for (const timezone of ['Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
        const zoned: RegionalFormatSettings = { dateFormat: 'MM/dd/yyyy', timezone };

        expect(pipe.transform('2026-03-01', 'dateOnly', zoned)).toBe('03/01/2026');
        expect(pipe.transform('2026-03-01T00:00:00.000Z', 'dateOnly', zoned)).toBe('03/01/2026');
      }
    });
  });
});
