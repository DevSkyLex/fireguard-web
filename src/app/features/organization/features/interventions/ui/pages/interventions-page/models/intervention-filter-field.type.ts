/**
 * Type InterventionFilterFieldKey
 *
 * @description
 * The seven single-valued fields the toolbar's filter bar edits — one
 * segmented chip per active key, in this fixed display order. `mine` is
 * deliberately excluded: it keeps its own toggle chip and is never counted
 * or offered through the "+ Filter" menu (`FEATURE.md`).
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
  | 'dueWindow';
