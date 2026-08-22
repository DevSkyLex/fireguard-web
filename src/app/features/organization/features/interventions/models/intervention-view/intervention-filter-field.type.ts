/**
 * Type InterventionFilterFieldKey
 *
 * @description
 * The nine fields the toolbar's filter bar edits — one segmented chip per
 * active key, in this fixed display order. `mine` is deliberately excluded:
 * it keeps its own toggle chip and is never counted or offered through the
 * "+ Filter" menu (`FEATURE.md`).
 *
 * Six of the eight (`status`, `type`, `priority`, `site`, `responsible`,
 * `label`) are both `equals`- and `isAnyOf`-capable, discriminated by
 * whether their own `InterventionListFilters` value is a scalar or a
 * readonly array. `dueRange` and `plannedStartRange` are the remaining two,
 * each narrowing through its own dedicated property with real date-bound
 * operators (`greaterThan`/`lessThan`/`between`). `dueWindow` is the ninth:
 * the named preset the KPI strip's tiles and the Today page's deep link
 * write, which needs a chip of its own or a URL carrying it would narrow the
 * list with nothing on screen to show or undo it (`FEATURE.md`).
 *
 * @since 6.5.0
 */
export type InterventionFilterFieldKey =
  | 'status'
  | 'type'
  | 'priority'
  | 'site'
  | 'responsible'
  | 'label'
  | 'dueRange'
  | 'plannedStartRange'
  | 'dueWindow';
