import type { TableFilterParamMapping } from '@shared/models';
import { dateRangeResolver, stringEqualsResolver } from '@shared/utils';

/**
 * Constant INTERVENTION_FILTER_MAPPING
 *
 * @description
 * Maps the Intervention table's `p-columnFilter` fields to the flat query
 * parameters the org-scoped interventions list provider reads. Passed to
 * `buildTableFilterParams` inside the table's `onLazyLoad` handler so column
 * filters compose with the (currently sort-only) request options. The backend
 * uses bespoke exact-match/date param names (`status`, `type`,
 * `dueAtAfter`/`dueAtBefore`), so the translation is intentionally table-local.
 *
 * - `status` / `type` — enum equality, forwarded verbatim.
 * - `dueAt` — a `[from, to]` date-range tuple expanded into the two
 *   bound params (`dueAtAfter` / `dueAtBefore`), each emitted only when its
 *   end of the range is set.
 *
 * `responsible`, `participant`, and `site` are intentionally not mapped here:
 * they take a member/facility IRI and need option lists supplied by the
 * parent page, which is out of scope for this presentational table.
 *
 * @since 1.4.0
 */
export const INTERVENTION_FILTER_MAPPING: TableFilterParamMapping = {
  status: stringEqualsResolver('status'),
  type: stringEqualsResolver('type'),
  dueAt: dateRangeResolver('dueAtAfter', 'dueAtBefore'),
};
