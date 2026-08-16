/**
 * Interface CollectionFilterField
 * @interface CollectionFilterField
 *
 * @description
 * One entry of a `CollectionFilterBar`'s field catalog: the key a page's own
 * `applyFilter`-style method patches, the field's own label, and the
 * `ng-icon` name its chip and its "+ Filter" menu entry both render. A
 * feature's own narrower catalog type (a string-literal-keyed variant) is
 * structurally assignable here — `shared/` never needs to know the concrete
 * key union.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CollectionFilterField {
  //#region Properties
  /** The narrowed field's own key, patched back through the page's outputs. */
  readonly key: string;

  /** The field's label — "Status", "Type", … */
  readonly fieldLabel: string;

  /** The `ng-icon` name rendered on the chip's field segment and the menu entry. */
  readonly icon: string;
  //#endregion
}
