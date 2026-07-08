/**
 * Type TableFilterParamValue
 * @typedef TableFilterParamValue
 *
 * @description
 * Primitive value that can be forwarded as a single Hydra query parameter.
 * Mirrors the value type accepted by the transport `params` bag on
 * `RequestOptions` and flattened by `HydraApiService.buildParams`.
 *
 * @access public
 * @since 1.0.0
 */
export type TableFilterParamValue = string | number | boolean;

/**
 * Type TableFilterParamResolver
 * @typedef TableFilterParamResolver
 *
 * @description
 * Pure translator for a single filterable column: given the active value of a
 * PrimeNG column filter (the `FilterMetadata.value`), it returns the flat query
 * parameters the backend expects for that column, or `null` when the filter is
 * empty and should contribute nothing. A resolver may emit **several** params
 * from one column — a date-range column, for example, maps a `[from, to]` tuple
 * to two bespoke params (`performedAtFrom` / `performedAtTo`).
 *
 * Resolvers own the per-table, per-backend naming: the field name PrimeNG uses
 * for the column is decoupled from the query-param name the hand-rolled API
 * providers read, so the mapping is table-local rather than a universal
 * match-mode convention.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {unknown} value Active filter value read from `FilterMetadata.value`.
 * @returns {Readonly<Record<string, TableFilterParamValue>> | null} Query params
 * contributed by this column, or `null` when the column contributes none.
 */
export type TableFilterParamResolver = (
  value: unknown,
) => Readonly<Record<string, TableFilterParamValue>> | null;

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
