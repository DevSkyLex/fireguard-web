/**
 * Type InterventionEnumFilterValue
 * @description One selected filter value, a readonly OR selection, or no narrowing.
 * @template T - Value represented by the filter.
 * @since 8.3.0
 */
export type InterventionEnumFilterValue<T> = T | readonly T[] | null;
