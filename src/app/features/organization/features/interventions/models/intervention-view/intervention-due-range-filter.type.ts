/**
 * Type InterventionDueRangeFilter
 *
 * @description
 * The `dueRange` filter-bar field's own narrowing — a real, multi-operator
 * date bound, distinct from the legacy `dueWindow` preset {@link
 * InterventionListFilters.dueWindow} still drives (segmented views, the
 * Today page's deep link). Each variant maps to exactly one or both of the
 * API's own `dueAtAfter`/`dueAtBefore` bounds
 * (`utils/intervention-list-query/`):
 *
 * - `greaterThan` — due after {@link after} (`dueAtAfter` only),
 * - `lessThan` — due before {@link before} (`dueAtBefore` only),
 * - `between` — due within [{@link after}, {@link before}] (both bounds).
 *
 * @since 8.1.0
 */
export type InterventionDueRangeFilter =
  | { readonly operator: 'greaterThan'; readonly after: Date }
  | { readonly operator: 'lessThan'; readonly before: Date }
  | { readonly operator: 'between'; readonly after: Date; readonly before: Date };
