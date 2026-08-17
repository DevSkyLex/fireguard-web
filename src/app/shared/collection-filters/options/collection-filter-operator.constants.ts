import type { CollectionFilterOperatorOption } from '../models';

/**
 * Constant COLLECTION_FILTER_OPERATOR_OPTIONS
 *
 * @description
 * The generic, field-agnostic label for every `CollectionFilterOperator` —
 * the single source `collectionFilterOperatorLabel`
 * (`utils/collection-filter-operator-label/`) resolves against, and the
 * catalog `FilterChip`'s operator picker lists from, restricted to whichever
 * subset a given `CollectionFilterField.operators` actually declares.
 *
 * @since 8.0.0
 */
export const COLLECTION_FILTER_OPERATOR_OPTIONS: readonly CollectionFilterOperatorOption[] = [
  { value: 'equals', label: $localize`:@@shared.collectionFilters.operatorEquals:is` },
  { value: 'notEquals', label: $localize`:@@shared.collectionFilters.operatorNotEquals:is not` },
  { value: 'contains', label: $localize`:@@shared.collectionFilters.operatorContains:contains` },
  {
    value: 'notContains',
    label: $localize`:@@shared.collectionFilters.operatorNotContains:does not contain`,
  },
  {
    value: 'startsWith',
    label: $localize`:@@shared.collectionFilters.operatorStartsWith:starts with`,
  },
  { value: 'endsWith', label: $localize`:@@shared.collectionFilters.operatorEndsWith:ends with` },
  {
    value: 'greaterThan',
    label: $localize`:@@shared.collectionFilters.operatorGreaterThan:greater than`,
  },
  { value: 'lessThan', label: $localize`:@@shared.collectionFilters.operatorLessThan:less than` },
  { value: 'between', label: $localize`:@@shared.collectionFilters.operatorBetween:between` },
  { value: 'isEmpty', label: $localize`:@@shared.collectionFilters.operatorIsEmpty:is empty` },
  {
    value: 'isNotEmpty',
    label: $localize`:@@shared.collectionFilters.operatorIsNotEmpty:is not empty`,
  },
  { value: 'isAnyOf', label: $localize`:@@shared.collectionFilters.operatorIsAnyOf:is any of` },
  {
    value: 'isNoneOf',
    label: $localize`:@@shared.collectionFilters.operatorIsNoneOf:is none of`,
  },
];
