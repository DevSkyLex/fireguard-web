/**
 * Interface CollectionFilterOption
 * @interface CollectionFilterOption
 *
 * @description
 * One selectable entry of a `CollectionFilterMultiSelect`'s catalog: the raw
 * value a page's own filter state stores, and the human label the chip and
 * the popover render — the same label the popover's search box matches
 * against. Deliberately `string`-keyed: a feature's own narrower option type
 * (a string-literal-keyed `SelectOption`, say) is structurally assignable
 * here, so `shared/` never needs to know the concrete value union.
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CollectionFilterOption {
  //#region Properties
  /** The value stored in the page's filter state and sent back through `valuesChanged`. */
  readonly value: string;

  /** The label rendered in the chip and the popover, and matched by the search box. */
  readonly label: string;
  //#endregion
}
