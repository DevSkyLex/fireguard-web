/**
 * MapMarkerStatusKind
 * @description
 * The generic severity vocabulary a {@link MapMarker} carries. The primitive
 * knows nothing about what "warning" or "critical" mean for a caller's
 * domain — it only guarantees a distinct shape per kind, so status is never
 * conveyed by colour alone (`PRODUCT.md`). The consumer maps its own domain
 * status onto this closed set.
 */
export type MapMarkerStatusKind = 'neutral' | 'positive' | 'warning' | 'critical' | 'muted';
