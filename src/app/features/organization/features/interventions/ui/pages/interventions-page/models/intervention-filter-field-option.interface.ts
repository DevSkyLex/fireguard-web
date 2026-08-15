import type { InterventionFilterFieldKey } from './intervention-filter-field.type';

/**
 * Interface InterventionFilterFieldOption
 * @interface InterventionFilterFieldOption
 *
 * @description
 * One entry of the filter bar's field catalog: the key `applyFilter` patches,
 * its label, and the icon its chip and its "+ Filter" menu entry both render.
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
  //#endregion
}
