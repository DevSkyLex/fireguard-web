/**
 * Type CollectionSurfaceBreakpoint
 *
 * @description
 * The container-width name at which `CollectionSurface` switches from its
 * card layout to its table layout. Measured against the surface's own
 * `@container/surface` box, never the viewport — a collapsed sidebar must
 * not force a table that would otherwise still fit as cards.
 *
 * @access public
 * @since 1.0.0
 */
export type CollectionSurfaceBreakpoint = 'xl' | '2xl' | '3xl';
