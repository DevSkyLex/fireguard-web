import type { InterventionTagSeverity } from '@features/organization/features/interventions/models';
import type { CalendarDisplayEvent } from '@shared/calendar';

/**
 * Constant INTERVENTION_CALENDAR_EVENT_TONE
 * @const INTERVENTION_CALENDAR_EVENT_TONE
 *
 * @description
 * The `hlm-badge` variant each intervention status severity renders with on
 * the shared month grid's chips — the grid chip only carries a tone, never
 * an icon, so this maps the same `resolveInterventionTag('status', …)`
 * severity the status tag registry already resolves onto the generic
 * {@link CalendarDisplayEvent} tone vocabulary, mirroring
 * `organization/features/calendar`'s own `SOURCE_TONE` constant. Five
 * severities land on four tones, so one collision is unavoidable: it is
 * deliberately `neutral`+`info` (both non-alarming) so `warning` keeps a
 * tone of its own — collapsing an alarm into the benign would mislead.
 *
 * @since 1.0.0
 */
export const INTERVENTION_CALENDAR_EVENT_TONE: Readonly<
  Record<InterventionTagSeverity, CalendarDisplayEvent['tone']>
> = {
  neutral: 'outline',
  info: 'outline',
  success: 'default',
  warning: 'secondary',
  danger: 'destructive',
};
