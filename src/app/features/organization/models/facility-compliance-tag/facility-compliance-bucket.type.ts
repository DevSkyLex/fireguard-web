/**
 * The compliance buckets a facility's coverage rate is sorted into for the
 * organization map's pins, legend and the facilities panel's cards.
 *
 * Thresholds mirror the map prototype (green ≥90 / amber ≥75 / red <75), which
 * is deliberately stricter at the amber boundary than the compliance
 * register's own 90/70 bands (`compliance-facility-table`) — the two surfaces
 * answer different questions and are not required to agree.
 *
 * @since 1.0.0
 */
export type ComplianceBucket = 'good' | 'warning' | 'critical' | 'unmeasured';
