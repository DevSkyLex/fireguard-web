import type { TableFilterParamValue } from './table-filter-param-value.type';

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
