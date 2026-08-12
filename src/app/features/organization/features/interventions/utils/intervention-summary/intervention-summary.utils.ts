import type {
  InterventionActivityOutput,
  InterventionOutput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import { resolveInterventionActivityActor } from '../intervention-activity-actor/intervention-activity-actor.utils';
import { formatInterventionRelativeTime } from '../intervention-relative-time/intervention-relative-time.utils';

/**
 * Function resolveInterventionResponsibleLabel
 *
 * @description
 * The responsible agent's display name, resolved from its IRI against the
 * loaded member options, for the detail page's details chip row.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionOutput | null} intervention - The current intervention, or null.
 * @param {readonly MemberSelectOption[]} members - The organization's loaded members.
 *
 * @returns {string | null} The responsible agent's display name, or null.
 */
export function resolveInterventionResponsibleLabel(
  intervention: InterventionOutput | null,
  members: readonly MemberSelectOption[],
): string | null {
  const responsible: string | null = intervention?.responsible ?? null;

  return responsible === null
    ? null
    : (members.find((member) => member.value === responsible)?.displayName ?? null);
}

/**
 * Function formatInterventionScheduleLabel
 *
 * @description
 * The planned window as a short date range, for the detail page's details
 * chip row. Null while either bound is unset.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionOutput | null} intervention - The current intervention, or null.
 * @param {string} locale - The application's active locale.
 *
 * @returns {string | null} The formatted date range, or null.
 */
export function formatInterventionScheduleLabel(
  intervention: InterventionOutput | null,
  locale: string,
): string | null {
  if (!intervention || intervention.plannedStartAt == null || intervention.dueAt == null)
    return null;

  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });

  return `${formatter.format(new Date(intervention.plannedStartAt))} – ${formatter.format(new Date(intervention.dueAt))}`;
}

/**
 * Function summarizeInterventionLabels
 *
 * @description
 * The intervention's labels, joined for the detail page's details chip row.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionOutput | null} intervention - The current intervention, or null.
 *
 * @returns {string | null} The joined label names, or null when there are none.
 */
export function summarizeInterventionLabels(
  intervention: InterventionOutput | null,
): string | null {
  const labels = intervention?.labels ?? [];

  return labels.length === 0 ? null : labels.map((label) => label.name).join(', ');
}

/**
 * Function buildInterventionMetaLine
 *
 * @description
 * Who acted last and when, plus the revision — the last entry of the loaded
 * timeline, falling back to `updatedAt` while it is still loading or empty.
 *
 * Taking the *last* entry is only correct because the store loads the
 * timeline's newest page first (the API sorts ascending). Reading page 1
 * instead, as it once did, made this line report the oldest event on the
 * record as the latest thing that happened.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {InterventionOutput | null} intervention - The current intervention, or null.
 * @param {readonly InterventionActivityOutput[]} activities - The loaded activity timeline.
 * @param {readonly MemberSelectOption[]} members - The organization's loaded members.
 * @param {string} locale - The application's active locale.
 *
 * @returns {string} The meta line, or an empty string while there is no intervention.
 */
export function buildInterventionMetaLine(
  intervention: InterventionOutput | null,
  activities: readonly InterventionActivityOutput[],
  members: readonly MemberSelectOption[],
  locale: string,
): string {
  if (!intervention) return '';

  const revision: string = `v${intervention.revision}`;
  const last = activities.length > 0 ? activities[activities.length - 1] : undefined;

  if (last === undefined) {
    const when: string = formatInterventionRelativeTime(intervention.updatedAt, locale);

    return $localize`:@@intervention.detail.metaUpdated:Updated ${when}:when: · revision ${revision}:revision:`;
  }

  const when: string = formatInterventionRelativeTime(last.createdAt, locale);
  const actorName: string | undefined = resolveInterventionActivityActor(
    last.actor,
    members,
  )?.displayName;

  if (last.kind === 'system' && last.event === 'status_changed')
    return actorName === undefined
      ? $localize`:@@intervention.detail.metaStatusChangedNoActor:Status changed ${when}:when: · revision ${revision}:revision:`
      : $localize`:@@intervention.detail.metaStatusChanged:${actorName}:actor: changed the status ${when}:when: · revision ${revision}:revision:`;

  if (last.kind === 'system' && last.event === 'created')
    return actorName === undefined
      ? $localize`:@@intervention.detail.metaCreatedNoActor:Created ${when}:when: · revision ${revision}:revision:`
      : $localize`:@@intervention.detail.metaCreated:${actorName}:actor: created this intervention ${when}:when: · revision ${revision}:revision:`;

  if (last.kind === 'system' && last.event === 'rescheduled')
    return actorName === undefined
      ? $localize`:@@intervention.detail.metaRescheduledNoActor:Rescheduled ${when}:when: · revision ${revision}:revision:`
      : $localize`:@@intervention.detail.metaRescheduled:${actorName}:actor: moved the planned window ${when}:when: · revision ${revision}:revision:`;

  if (last.kind === 'comment')
    return actorName === undefined
      ? $localize`:@@intervention.detail.metaCommentedNoActor:Commented ${when}:when: · revision ${revision}:revision:`
      : $localize`:@@intervention.detail.metaCommented:${actorName}:actor: commented ${when}:when: · revision ${revision}:revision:`;

  return $localize`:@@intervention.detail.metaUpdated:Updated ${when}:when: · revision ${revision}:revision:`;
}
