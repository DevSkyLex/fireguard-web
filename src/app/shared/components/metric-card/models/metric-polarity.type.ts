/**
 * Type MetricPolarity
 *
 * @description
 * Which direction of change is *good* for a metric — the only thing that
 * lets a delta be coloured honestly.
 *
 * `higher` suits volumes you want to grow (inspections performed); `lower`
 * suits counts you want to shrink (open non-conformities, overdue items) —
 * there, a falling value is an improvement and must not read as a regression;
 * `neutral` leaves the delta uncoloured when neither direction is inherently
 * better.
 *
 * @since 1.0.0
 */
export type MetricPolarity = 'higher' | 'lower' | 'neutral';
