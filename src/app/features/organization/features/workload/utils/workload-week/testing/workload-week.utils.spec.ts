import { workloadWeekStart } from '../workload-week.utils';
describe('workloadWeekStart', () => {
  it('uses the organization week boundary, including Sunday itself', () => {
    expect(workloadWeekStart('2026-09-20', 'sunday', 0)).toBe('2026-09-20');
    expect(workloadWeekStart('2026-09-20', 'monday', 0)).toBe('2026-09-14');
  });
  it('crosses DST and year boundaries using local dates', () => {
    expect(workloadWeekStart('2026-03-29', 'monday', 1)).toBe('2026-03-30');
    expect(workloadWeekStart('2026-01-01', 'monday', -1)).toBe('2025-12-22');
  });
  it('rejects invalid dates and fractional offsets', () => {
    expect(() => workloadWeekStart('2026-02-30', 'monday', 0)).toThrow(RangeError);
    expect(() => workloadWeekStart('2026-01-01', 'monday', 0.5)).toThrow(RangeError);
  });
});
