import type { FilterMetadata } from 'primeng/api';
import type { TableLazyLoadEvent } from 'primeng/table';
import type { TableFilterParamMapping, TableFilterParamValue } from '@shared/models';

/**
 * Function buildTableFilterParams
 *
 * @description
 * Translates the `filters` bag of a PrimeNG `TableLazyLoadEvent` into the flat
 * query parameters a server-side (lazy) table forwards to the backend. In lazy
 * mode PrimeNG never runs its client-side `FilterService`; each `p-columnFilter`
 * only records a value in `event.filters`, and it is the table's
 * `onLazyLoad` handler that must turn those values into query params. This pure
 * helper does exactly that, driven by a per-table {@link TableFilterParamMapping}
 * so the bespoke, per-backend param names stay out of this generic function.
 *
 * For every field present in `mapping`, it reads the active
 * `FilterMetadata.value` (handling both the single-constraint
 * `FilterMetadata` and the multi-constraint `FilterMetadata[]` shapes), calls
 * the field's resolver, and merges the non-null result. Fields with no active
 * filter, or resolvers returning `null`, contribute nothing. Unmapped filters
 * are ignored.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {TableLazyLoadEvent['filters']} filters PrimeNG lazy-load filter bag.
 * @param {TableFilterParamMapping} mapping Per-table field-to-param resolvers.
 *
 * @returns {Record<string, TableFilterParamValue>} Flat query parameters to
 * merge into the table's request `params` bag.
 */
export function buildTableFilterParams(
  filters: TableLazyLoadEvent['filters'],
  mapping: TableFilterParamMapping,
): Record<string, TableFilterParamValue> {
  const params: Record<string, TableFilterParamValue> = {};

  if (!filters) {
    return params;
  }

  for (const [field, resolver] of Object.entries(mapping)) {
    const value: unknown = readFilterValue(filters[field]);
    const resolved: Readonly<Record<string, TableFilterParamValue>> | null = resolver(value);

    if (resolved) {
      Object.assign(params, resolved);
    }
  }

  return params;
}

/**
 * Function readFilterValue
 *
 * @description
 * Extracts the active value from a PrimeNG filter entry, which may be a single
 * {@link FilterMetadata}, an array of them (multi-constraint columns), or
 * `undefined`. Returns the first defined constraint value, or `null` when the
 * entry carries no usable value.
 *
 * @access private
 * @since 1.0.0
 *
 * @param {FilterMetadata | FilterMetadata[] | undefined} entry Filter entry for
 * one field.
 *
 * @returns {unknown} The active filter value, or `null` when absent.
 */
function readFilterValue(entry: FilterMetadata | FilterMetadata[] | undefined): unknown {
  if (!entry) {
    return null;
  }

  const metadata: FilterMetadata | undefined = Array.isArray(entry)
    ? entry.find((constraint: FilterMetadata): boolean => constraint.value != null)
    : entry;

  return metadata?.value ?? null;
}
