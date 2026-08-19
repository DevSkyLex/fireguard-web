import type { CollectionFilterOperator } from '@shared/collection-filters';
import type { InterventionFilterFieldKey } from './intervention-filter-field.type';

/**
 * Interface InterventionFilterFieldOption
 * @interface InterventionFilterFieldOption
 *
 * @description
 * One entry of the filter bar's field catalog: the key `applyFilter` patches,
 * its label, the icon its chip and its "+ Filter" menu entry both render, the
 * operators this field accepts, and an optional per-field operator label
 * override. Six entries declare `['equals', 'isAnyOf']` — the API accepts
 * either a single exact value or a repeated `key[]=` value OR-combined via
 * `IN()` for each; `dueRange` and `plannedStartRange` are the two fields
 * wired to date-bound operators instead — `greaterThan`, `lessThan` and
 * `between`, mapped to real API bounds (`FEATURE.md`).
 *
 * @since 6.5.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface InterventionFilterFieldOption {
  //#region Properties
  /** The narrowed field's own key. */
  readonly key: InterventionFilterFieldKey;

  /** The field's label — "Status", "Site", … */
  readonly fieldLabel: string;

  /** The `ng-icon` name rendered on the chip's field segment and the menu entry. */
  readonly icon: string;

  /** The operators this field accepts, in picker order. */
  readonly operators: readonly CollectionFilterOperator[];

  /** Field-specific operator labels ("after" rather than the generic "greater than"), overriding the shared registry for this field alone. Optional. */
  readonly operatorLabels?: Readonly<Partial<Record<CollectionFilterOperator, string>>>;
  //#endregion
}
