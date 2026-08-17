import type { CollectionFilterOperator, CollectionFilterOperatorOption } from '../../models';
import { COLLECTION_FILTER_OPERATOR_OPTIONS } from '../../options';

/**
 * Function collectionFilterOperatorLabel
 *
 * @description
 * The generic, field-agnostic label for one operator — what a chip's
 * operator segment renders, whether as the single fixed label of a
 * one-operator field or as an item in a multi-operator field's picker.
 * Falls back to the operator's own raw value rather than throwing:
 * {@link COLLECTION_FILTER_OPERATOR_OPTIONS} covers every
 * `CollectionFilterOperator`, so the fallback is unreachable in practice.
 *
 * @access public
 * @since 8.0.0
 *
 * @param {CollectionFilterOperator} operator - The operator to label.
 *
 * @returns {string} Its generic label.
 */
export function collectionFilterOperatorLabel(operator: CollectionFilterOperator): string {
  return (
    COLLECTION_FILTER_OPERATOR_OPTIONS.find(
      (option: CollectionFilterOperatorOption): boolean => option.value === operator,
    )?.label ?? operator
  );
}
