import type { CollectionFilterOperator } from './collection-filter-operator.type';

/**
 * Interface CollectionFilterOperatorOption
 * @interface CollectionFilterOperatorOption
 *
 * @description
 * One entry of the operator vocabulary's label catalog
 * (`options/collection-filter-operator.constants.ts`): the operator itself
 * and the generic, field-agnostic label its chip segment or operator menu
 * renders — "is", "contains", "is any of", …
 *
 * @since 8.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface CollectionFilterOperatorOption {
  //#region Properties
  /** The operator this entry labels. */
  readonly value: CollectionFilterOperator;

  /** Its generic, localized label. */
  readonly label: string;
  //#endregion
}
