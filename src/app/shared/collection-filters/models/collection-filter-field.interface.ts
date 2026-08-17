import type { CollectionFilterOperator } from './collection-filter-operator.type';

/**
 * Interface CollectionFilterField
 * @interface CollectionFilterField
 *
 * @description
 * One entry of a `CollectionFilterBar`'s field catalog: the key a page's own
 * `applyFilter`-style method patches, the field's own label, the `ng-icon`
 * name its chip and its "+ Filter" menu entry both render, and the operator
 * vocabulary this field accepts. A feature's own narrower catalog type (a
 * string-literal-keyed variant) is structurally assignable here — `shared/`
 * never needs to know the concrete key union.
 *
 * {@link operators} is never empty: a field with exactly one entry still
 * renders through the same operator segment, just as a fixed, non-editable
 * label — `FilterChip` only offers a picker once a second choice exists. A
 * feature declares here only the operators its own data-access layer
 * actually maps to a real query param; the full vocabulary
 * (`CollectionFilterOperator`) may be wider than what any one field lists.
 *
 * {@link operatorLabels}, when present, overrides `collectionFilterOperatorLabel`'s
 * generic wording for specific operators of this field alone — a date field
 * reading "greater than" is not natural, "after" is. Every operator the
 * override omits still falls back to the generic registry, and a field that
 * sets no override at all is entirely unaffected: this is opt-in per field,
 * never a second registry to keep in sync with the generic one.
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

  /** The operators this field accepts, in the operator picker's own order. Never empty. */
  readonly operators: readonly CollectionFilterOperator[];

  /** Field-specific operator labels, overriding the generic registry for this field only. Optional. */
  readonly operatorLabels?: Readonly<Partial<Record<CollectionFilterOperator, string>>>;
  //#endregion
}
