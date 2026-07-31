import type { TableLazyLoadEvent } from 'primeng/table';
import type { TableFilterParamMapping } from '../../../models';
import { dateRangeResolver } from '../../date-range-resolver/date-range-resolver.utils';
import { stringEqualsResolver } from '../../string-equals-resolver/string-equals-resolver.utils';
import { buildTableFilterParams } from '../table-filter-params.utils';

const MAPPING: TableFilterParamMapping = {
  status: stringEqualsResolver('status'),
  performedAt: dateRangeResolver('performedAtFrom', 'performedAtTo'),
};

describe('buildTableFilterParams', () => {
  it('returns an empty object when the filters bag is undefined', () => {
    expect(buildTableFilterParams(undefined, MAPPING)).toEqual({});
  });

  it('returns an empty object when no mapped field has an active value', () => {
    const filters: TableLazyLoadEvent['filters'] = {
      status: { value: null, matchMode: 'equals' },
    };

    expect(buildTableFilterParams(filters, MAPPING)).toEqual({});
  });

  it('translates a single enum field to its query parameter', () => {
    const filters: TableLazyLoadEvent['filters'] = {
      status: { value: 'draft', matchMode: 'equals' },
    };

    expect(buildTableFilterParams(filters, MAPPING)).toEqual({ status: 'draft' });
  });

  it('expands a date-range tuple into two bespoke parameters', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-02-01T00:00:00.000Z');
    const filters: TableLazyLoadEvent['filters'] = {
      performedAt: { value: [from, to], matchMode: 'between' },
    };

    expect(buildTableFilterParams(filters, MAPPING)).toEqual({
      performedAtFrom: from.toISOString(),
      performedAtTo: to.toISOString(),
    });
  });

  it('emits only the bound end of a partial date range', () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const filters: TableLazyLoadEvent['filters'] = {
      performedAt: { value: [from, null], matchMode: 'between' },
    };

    expect(buildTableFilterParams(filters, MAPPING)).toEqual({
      performedAtFrom: from.toISOString(),
    });
  });

  it('reads the first defined constraint of a multi-constraint filter', () => {
    const filters: TableLazyLoadEvent['filters'] = {
      status: [
        { value: null, matchMode: 'equals' },
        { value: 'closed', matchMode: 'equals' },
      ],
    };

    expect(buildTableFilterParams(filters, MAPPING)).toEqual({ status: 'closed' });
  });

  it('ignores active filters that are not present in the mapping', () => {
    const filters: TableLazyLoadEvent['filters'] = {
      unmapped: { value: 'x', matchMode: 'equals' },
      status: { value: 'submitted', matchMode: 'equals' },
    };

    expect(buildTableFilterParams(filters, MAPPING)).toEqual({ status: 'submitted' });
  });
});
