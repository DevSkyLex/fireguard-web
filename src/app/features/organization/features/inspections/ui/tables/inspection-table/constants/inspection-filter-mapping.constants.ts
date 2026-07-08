import type { TableFilterParamMapping } from '@shared/models';
import { dateRangeResolver, stringEqualsResolver } from '@shared/utils';

/**
 * Constant INSPECTION_FILTER_MAPPING
 *
 * @description
 * Maps the Inspection table's `p-columnFilter` fields to the flat query
 * parameters the org-scoped inspections list provider reads. Passed to
 * `buildTableFilterParams` inside the table's `onLazyLoad` handler so column
 * filters compose with the global search and sort params. The backend uses
 * bespoke exact-match/date param names (`result`, `status`, `performedAtFrom`,
 * `performedAtTo`), so the translation is intentionally table-local.
 *
 * - `result` / `status` — enum equality, forwarded verbatim.
 * - `performedAt` — a `[from, to]` date-range tuple expanded into the two
 *   bound params (`performedAtFrom` / `performedAtTo`), each emitted only when
 *   its end of the range is set.
 *
 * @since 1.0.0
 */
export const INSPECTION_FILTER_MAPPING: TableFilterParamMapping = {
  result: stringEqualsResolver('result'),
  status: stringEqualsResolver('status'),
  performedAt: dateRangeResolver('performedAtFrom', 'performedAtTo'),
};
