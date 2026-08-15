import type { InterventionListFilters } from '@features/organization/features/interventions/models';
import type { InterventionFilterFieldKey } from './intervention-filter-field.type';

/**
 * Interface InterventionFilterChip
 * @interface InterventionFilterChip
 *
 * @description
 * One segmented chip in the toolbar's filter bar: the narrowed field's own
 * icon and label, the active value's resolved label, and the patch that
 * clears just that field through the page's existing `applyFilter` path. The
 * value segment itself is not part of this contract — it is rendered by the
 * page as a live `hlm-select`, so editing a value never goes through this
 * shape (`FEATURE.md`).
 *
 * @since 6.3.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionFilterChip {
  //#region Properties
  /** Track key, and the narrowed field's name. */
  readonly key: InterventionFilterFieldKey;

  /** The `ng-icon` name rendered on the chip's field segment. */
  readonly icon: string;

  /** The filter's own label — "Status", "Site", … */
  readonly fieldLabel: string;

  /** The active value's resolved label. */
  readonly valueLabel: string;

  /** What clears just this field when handed to `applyFilter`. */
  readonly patch: Partial<InterventionListFilters>;
  //#endregion
}
