import type { CollectionFilterOperator } from './collection-filter-operator.type';

/**
 * Interface CollectionFilterOperatorChangedEvent
 * @interface CollectionFilterOperatorChangedEvent
 *
 * @description
 * Payload of `CollectionFilterBar`'s `operatorChanged` output: which field's
 * operator segment changed and the operator it now reads. The page reacts by
 * re-resolving that field's own narrowing under the new operator — this
 * event never carries a value, only the operator picked.
 *
 * @since 8.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CollectionFilterOperatorChangedEvent {
  //#region Properties
  /** The field key whose operator segment changed. */
  readonly key: string;

  /** The operator now active for that field. */
  readonly operator: CollectionFilterOperator;
  //#endregion
}
