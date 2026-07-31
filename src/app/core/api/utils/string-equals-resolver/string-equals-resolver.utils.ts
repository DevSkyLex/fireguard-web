import type { TableFilterParamResolver, TableFilterParamValue } from '../../models';

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
