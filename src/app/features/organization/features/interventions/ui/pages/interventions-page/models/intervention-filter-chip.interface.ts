import type { InterventionListFilters } from '@features/organization/features/interventions/models';

/**
 * Interface InterventionFilterChip
 * @interface InterventionFilterChip
 *
 * @description
 * One removable chip in the list toolbar's filter-chip row: the narrowed
 * field's own label, the active value's resolved label, and the patch that
 * clears just that field through the page's existing `applyFilter` path.
 *
 * @since 6.3.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionFilterChip {
  //#region Properties
  /** Track key, and the narrowed field's name. */
  readonly key: string;

  /** The filter's own label — "Status", "Site", … */
  readonly fieldLabel: string;

  /** The active value's resolved label. */
  readonly valueLabel: string;

  /** What clears just this field when handed to `applyFilter`. */
  readonly patch: Partial<InterventionListFilters>;
  //#endregion
}
