import type { HydraItem } from '@core/api/models';

/**
 * Aggregate equipment counters for the organization equipment page.
 *
 * ⚠️ `openNonConformities` is **organization-wide**, not equipment-scoped: the
 * backend attaches non-conformities to inspections, not to equipment, so there
 * is no reliable per-equipment count (see `src/Equipment/MODULE.md`). Rendering
 * it next to equipment counters would read as "non-conformities on these
 * assets", which it is not.
 *
 * @since 1.0.0
 */
export interface EquipmentKpiOutput extends HydraItem {
  readonly totalAssets: number;
  readonly compliant: number;
  readonly dueSoon: number;
  readonly openNonConformities: number;
}
