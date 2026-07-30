import { dateRangeResolver } from '../date-range-resolver.utils';

describe('dateRangeResolver', () => {
  const from = new Date('2026-01-01T00:00:00.000Z');
  const to = new Date('2026-02-01T00:00:00.000Z');

  it('expands a [from, to] tuple into two ISO params', () => {
    expect(dateRangeResolver('performedAtFrom', 'performedAtTo')([from, to])).toEqual({
      performedAtFrom: from.toISOString(),
      performedAtTo: to.toISOString(),
    });
  });

  it('emits only the bound end of a partial range', () => {
    expect(dateRangeResolver('dueAtAfter', 'dueAtBefore')([from, null])).toEqual({
      dueAtAfter: from.toISOString(),
    });
    expect(dateRangeResolver('dueAtAfter', 'dueAtBefore')([null, to])).toEqual({
      dueAtBefore: to.toISOString(),
    });
  });

  it('returns null for an empty or missing range', () => {
    expect(dateRangeResolver('a', 'b')([null, null])).toBeNull();
    expect(dateRangeResolver('a', 'b')(null)).toBeNull();
  });
});
