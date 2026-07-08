import type { TableFilterParamMapping } from '@shared/models';
import { stringEqualsResolver } from '@shared/utils';

/**
 * Constant CHECKLIST_FILTER_MAPPING
 *
 * @description
 * Maps the Checklist table's column filter fields to the flat query parameters
 * the org-scoped checklists list provider reads. Passed to
 * `buildTableFilterParams` inside the table's `onLazyLoad` handler so column
 * filters compose with sort params. The checklists list endpoint supports a
 * single column filter (`status`), forwarded verbatim as an exact-match enum
 * parameter.
 *
 * @since 1.0.0
 */
export const CHECKLIST_FILTER_MAPPING: TableFilterParamMapping = {
  status: stringEqualsResolver('status'),
};
