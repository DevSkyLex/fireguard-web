import type { TableFilterParamMapping } from '@core/api';
import { stringEqualsResolver } from '@core/api';

/**
 * Constant EQUIPMENT_FILTER_MAPPING
 *
 * @description
 * Maps the Equipment table's `p-columnFilter` fields to the flat query
 * parameters the org-scoped and facility-scoped equipment list providers read.
 * Passed to `buildTableFilterParams` inside the table's `onLazyLoad` handler so
 * column filters compose with the global search and sort params. The backend
 * exposes bespoke exact-match query params (`status`, `type`, `subType`,
 * `brand`, `model`), so the translation is intentionally table-local.
 *
 * - `status` — enum equality, forwarded verbatim.
 * - `type` / `subType` / `brand` / `model` — free-text exact-match equality,
 *   forwarded verbatim (`EquipmentOutput.type`/`subType` are arbitrary
 *   strings, not fixed unions, per the equipment models and creation form).
 *
 * @since 1.0.0
 */
export const EQUIPMENT_FILTER_MAPPING: TableFilterParamMapping = {
  status: stringEqualsResolver('status'),
  type: stringEqualsResolver('type'),
  subType: stringEqualsResolver('subType'),
  brand: stringEqualsResolver('brand'),
  model: stringEqualsResolver('model'),
};
