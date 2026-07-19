/**
 * Which surface the facility list page renders.
 *
 * `'list'` is the flat, paginated roots table (needs `facilities.read`);
 * `'tree'` is the whole hierarchy in one response (needs `compliance.read`).
 *
 * @since 1.0.0
 */
export type FacilityListView = 'list' | 'tree';
