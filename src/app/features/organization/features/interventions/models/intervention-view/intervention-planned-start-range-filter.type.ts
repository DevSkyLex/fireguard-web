/**
 * Type InterventionPlannedStartRangeFilter
 *
 * @description
 * The `plannedStartRange` filter-bar field's own narrowing — the same shape
 * as `InterventionDueRangeFilter` (`./intervention-due-range-filter.type.ts`),
 * duplicated rather than shared per the rule of three (`ARCHITECTURE.md`
 * §2.9): two date-range filters do not yet justify a common generic type.
 * Each variant maps to one or both of the API's own
 * `plannedStartAtAfter`/`plannedStartAtBefore` bounds
 * (`ui/pages/interventions-page/utils/intervention-list-query/`):
 *
 * - `greaterThan` — planned to start after {@link after} (`plannedStartAtAfter` only),
 * - `lessThan` — planned to start before {@link before} (`plannedStartAtBefore` only),
 * - `between` — planned to start within [{@link after}, {@link before}] (both bounds).
 *
 * @since 8.2.0
 */
export type InterventionPlannedStartRangeFilter =
  | { readonly operator: 'greaterThan'; readonly after: Date }
  | { readonly operator: 'lessThan'; readonly before: Date }
  | { readonly operator: 'between'; readonly after: Date; readonly before: Date };
