import { parseOrganizationDashboardPeriodBoundary } from '../organization-dashboard-period.utils';

describe('parseOrganizationDashboardPeriodBoundary', () => {
  it('keeps an API date-only boundary on the same local calendar day', () => {
    const parsed: Date = parseOrganizationDashboardPeriodBoundary('2026-09-05');

    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(5);
    expect(parsed.getHours()).toBe(0);
  });

  it('retains the offset semantics of a full timestamp', () => {
    expect(
      parseOrganizationDashboardPeriodBoundary('2026-09-05T10:30:00+02:00').toISOString(),
    ).toBe('2026-09-05T08:30:00.000Z');
  });

  it('rejects an invalid date-only boundary', () => {
    expect(parseOrganizationDashboardPeriodBoundary('2026-02-30').getTime()).toBeNaN();
  });
});
