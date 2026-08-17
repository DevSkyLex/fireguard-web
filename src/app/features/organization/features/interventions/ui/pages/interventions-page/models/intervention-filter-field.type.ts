/**
 * Type InterventionFilterFieldKey
 *
 * @description
 * The eight single-valued fields the toolbar's filter bar edits — one
 * segmented chip per active key, in this fixed display order. `mine` is
 * deliberately excluded: it keeps its own toggle chip and is never counted
 * or offered through the "+ Filter" menu (`FEATURE.md`).
 *
 * `dueRange` and `plannedStartRange` are the two multi-operator fields: each
 * narrows through its own `InterventionListFilters` property, independent of
 * the legacy `dueWindow` preset the segmented views and the Today page's
 * deep link still drive (`FEATURE.md`).
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
  | 'plannedStartRange';
