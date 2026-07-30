import type { TableFilterParamResolver } from './table-filter-param-resolver.type';

/**
 * Type TableFilterParamMapping
 * @typedef TableFilterParamMapping
 *
 * @description
 * Per-table map from a PrimeNG column filter `field` to its
 * {@link TableFilterParamResolver}. Passed to `buildTableFilterParams` to turn a
 * `TableLazyLoadEvent.filters` bag into the flat query parameters a lazy table
 * emits through its `load` output. Only fields present in the mapping are
 * translated; unmapped active filters are ignored.
 *
 * @access public
 * @since 1.0.0
 */
export type TableFilterParamMapping = Readonly<Record<string, TableFilterParamResolver>>;
