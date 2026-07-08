import type { TableFilterParamResolver, TableFilterParamValue } from '@shared/models';

/**
 * Function stringEqualsResolver
 *
 * @description
 * Builds a {@link TableFilterParamResolver} for a column whose active value is
 * forwarded verbatim as a single exact-match query parameter. The value is
 * stringified; a nullish/empty value contributes nothing. This is the shared
 * factory behind the per-table enum/exact-match column filters, so the
 * one-liner `(value) => value ? { X: String(value) } : null` is declared once.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} param Query-parameter name the backend reads for this column.
 *
 * @returns {TableFilterParamResolver} Resolver emitting `{ [param]: String(value) }`
 * for a truthy value, or `null` otherwise.
 */
export function stringEqualsResolver(param: string): TableFilterParamResolver {
  return (value: unknown): Readonly<Record<string, TableFilterParamValue>> | null =>
    value ? { [param]: String(value) } : null;
}

/**
 * Function dateRangeResolver
 *
 * @description
 * Builds a {@link TableFilterParamResolver} for a `p-columnFilter` date-range
 * column whose active value is a `[from, to]` tuple. Each bound present is
 * emitted as its own ISO-8601 query parameter; a bound left `null` contributes
 * nothing, and an empty range yields `null`. Shared factory behind every
 * per-table date-range column filter.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {string} fromParam Query-parameter name for the lower (`from`) bound.
 * @param {string} toParam Query-parameter name for the upper (`to`) bound.
 *
 * @returns {TableFilterParamResolver} Resolver expanding the tuple into the two
 * bespoke params, or `null` when neither bound is set.
 */
export function dateRangeResolver(fromParam: string, toParam: string): TableFilterParamResolver {
  return (value: unknown): Readonly<Record<string, TableFilterParamValue>> | null => {
    const [from, to] = (value as [Date | null, Date | null] | null) ?? [null, null];
    const params: Record<string, TableFilterParamValue> = {};

    if (from) {
      params[fromParam] = from.toISOString();
    }
    if (to) {
      params[toParam] = to.toISOString();
    }

    return Object.keys(params).length ? params : null;
  };
}
