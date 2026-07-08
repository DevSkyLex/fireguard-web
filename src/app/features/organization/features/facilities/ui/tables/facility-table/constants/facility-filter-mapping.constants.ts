import type { TableFilterParamMapping, TableFilterParamValue } from '@shared/models';
import { stringEqualsResolver } from '@shared/utils';

/**
 * Constant FACILITY_FILTER_MAPPING
 *
 * @description
 * Maps the Facility table's `p-columnFilter` fields to the flat query
 * parameters the org-scoped facilities list provider reads. Passed to
 * `buildTableFilterParams` inside the table's `onLazyLoad` handler so column
 * filters compose with the global search and sort params. The backend uses a
 * hand-rolled provider with bespoke exact-match param names (`status`,
 * `type`, `code`), so the translation is intentionally table-local.
 *
 * - `status` / `type` — enum equality, forwarded verbatim.
 * - `code` — free-text exact match, trimmed before being forwarded.
 *
 * @since 1.0.0
 */
export const FACILITY_FILTER_MAPPING: TableFilterParamMapping = {
  status: stringEqualsResolver('status'),
  type: stringEqualsResolver('type'),
  code: (value: unknown): Readonly<Record<string, TableFilterParamValue>> | null => {
    const code: string = typeof value === 'string' ? value.trim() : '';

    return code ? { code } : null;
  },
};
