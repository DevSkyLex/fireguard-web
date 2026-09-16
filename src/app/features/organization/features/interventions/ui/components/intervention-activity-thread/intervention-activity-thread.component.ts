import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCircleAlert, lucideHistory } from '@ng-icons/lucide';
import type {
  InterventionActivityOutput,
  InterventionMentionSegment,
  InterventionStatusChangePayload,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import {
  formatInterventionRelativeTime,
  parseInterventionMentions,
  resolveInterventionActivityActor,
  resolveInterventionMentionMember,
} from '@features/organization/features/interventions/utils';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBubbleImports } from '@shared/ui/bubble';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmMarkerImports } from '@shared/ui/marker';
import { HlmMessageImports } from '@shared/ui/message';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { InterventionTag } from '../intervention-tag';
import {
  INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON,
  INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON_CLASS,
  INTERVENTION_ACTIVITY_EVENT_ICON_CLASS,
  INTERVENTION_ACTIVITY_EVENT_ICON_NAME,
  INTERVENTION_ACTIVITY_EVENT_ICONS,
} from './constants/intervention-activity-event-icons.constants';
import type { InterventionActivityBodySegment, InterventionActivityRowViewModel } from './models';

/** How many skeleton rows the loading state shows. */
const SKELETON_ROW_COUNT: number = 3;

/**
 * Component InterventionActivityThread
 * @class InterventionActivityThread
 *
 * @description
 * Renders the intervention activity timeline in chronological order. System
 * events use marker rows and comments use Spartan message and bubble
 * primitives, with a shared icon/avatar rail for consistent alignment.
 *
 * Each row keeps its icon or avatar in a shared rail, so event text and
 * status badges remain aligned across system entries and comments.
 *
 * The connecting rail is rendered once per row and remains within that
 * row's bounds, while row-specific padding preserves the timeline rhythm.
 *
 * The row class is the single source of truth for vertical spacing; the
 * component does not add a second margin to individual message primitives.
 *
 * System rows retain a minimum content height and event-specific icon
 * classes so the rail and status context remain visible in both themes.
 *
 * This component is presentational: it receives the loaded activity window
 * and member options, derives safe text segments, and emits pagination or
 * retry intents. Loading and comment creation remain owned by the page,
 * store, and form orchestration layers.
 *
 * Mention tokens are rendered as text rather than HTML. Resolved members are
 * displayed by name with their role as supporting context; malformed or
 * unknown tokens use the same neutral fallback as unattributed actors.
 *
 * @version 3.1.0
 *
 * @example
 * ```html
 * <app-intervention-activity-thread
 *   [activities]="store.activities()"
 *   [members]="planningOptions.members()"
 *   [loading]="store.activityCallState().status === 'pending'"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-activity-thread',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    HlmSkeleton,
    InterventionTag,
    ...HlmAvatarImports,
    ...HlmMarkerImports,
    ...HlmMessageImports,
    ...HlmBubbleImports,
    ...HlmAlertImports,
    HlmButton,
  ],
  providers: [
    provideIcons({
      lucideArrowRight,
      lucideCircleAlert,
      lucideHistory,
      ...INTERVENTION_ACTIVITY_EVENT_ICONS,
    }),
  ],
  templateUrl: './intervention-activity-thread.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionActivityThread {
  //#region Inputs
  /**
   * Property activities
   * @readonly
   * @description The loaded window of the timeline, oldest first — the order the API returns it in. Not necessarily the whole history; see {@link hasOlder}.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly InterventionActivityOutput[]>}
   */
  public readonly activities: InputSignal<readonly InterventionActivityOutput[]> = input<
    readonly InterventionActivityOutput[]
  >([]);

  /**
   * Property members
   * @readonly
   * @description The organization's members, resolving a comment or a system entry's actor.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property loading
   * @readonly
   * @description Whether the timeline's first fetch is still in flight.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Why the timeline could not be read, or `null`. Without it a failed fetch is
   * indistinguishable from an intervention nothing has happened to yet.
   *
   * @access public
   * @since 1.1.0
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property hasOlder
   * @readonly
   *
   * @description
   * Whether entries older than the ones shown exist server-side. The timeline
   * loads its newest page first, so anything before that is behind this.
   *
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly hasOlder: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property olderRequested
   * @readonly
   * @description The reader asked for the entries above the ones shown.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly olderRequested: OutputEmitterRef<void> = output<void>();

  /**
   * Property retryRequested
   * @readonly
   * @description The reader asked to read the timeline again after a failure.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /** The application's language, used to phrase the relative timestamps. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** One date formatter for the reschedule labels — the constructor is too costly for per-row calls. */
  private readonly dateFormat: Intl.DateTimeFormat = new Intl.DateTimeFormat(this.locale, {
    dateStyle: 'medium',
  });

  /**
   * Property skeletonRows
   * @readonly
   * @description Placeholder rows shown while the first fetch is in flight.
   * @access protected
   * @since 1.0.0
   * @type {readonly number[]}
   */
  protected readonly skeletonRows: readonly number[] = Array.from(
    { length: SKELETON_ROW_COUNT },
    (_, index) => index,
  );

  /**
   * Property isEmpty
   * @readonly
   * @description Whether there is nothing to show and nothing in flight either.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed<boolean>(
    () => !this.loading() && this.error() === null && this.activities().length === 0,
  );

  /**
   * Property rows
   * @readonly
   *
   * @description
   * The timeline as fully derived row view models, recomputed only when the
   * activities or the member set change. Everything the template binds per
   * row — actor identity, relative label, narrowed payloads, marker icon —
   * is resolved here exactly once per entry instead of once per binding per
   * change-detection pass.
   *
   * @access protected
   * @since 3.1.0
   *
   * @type {Signal<readonly InterventionActivityRowViewModel[]>}
   */
  protected readonly rows: Signal<readonly InterventionActivityRowViewModel[]> = computed<
    readonly InterventionActivityRowViewModel[]
  >(() => {
    const members: readonly MemberSelectOption[] = this.members();

    return this.activities().map((activity: InterventionActivityOutput) => {
      const actor: MemberSelectOption | null = resolveInterventionActivityActor(
        activity.actor,
        members,
      );
      const reschedule = activity.event === 'rescheduled' ? this.rescheduleOf(activity) : null;

      return {
        activity,
        actorName:
          actor?.displayName ?? $localize`:@@intervention.list.unknownMember:Unknown member`,
        actorInitials: actor?.initials ?? '?',
        actorAvatar: actor?.avatarUrl ?? null,
        relativeTime: formatInterventionRelativeTime(activity.createdAt, this.locale),
        statusChange: activity.event === 'status_changed' ? this.statusChangeOf(activity) : null,
        rescheduleLabel: reschedule === null ? null : this.rescheduleWindowLabelOf(reschedule),
        icon:
          INTERVENTION_ACTIVITY_EVENT_ICON_NAME[activity.event] ??
          INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON,
        iconClass:
          INTERVENTION_ACTIVITY_EVENT_ICON_CLASS[activity.event] ??
          INTERVENTION_ACTIVITY_EVENT_FALLBACK_ICON_CLASS,
        bodySegments: activity.kind === 'system' ? [] : this.bodySegmentsOf(activity.body, members),
      };
    });
  });
  //#endregion

  //#region Methods
  /**
   * Method bodySegmentsOf
   *
   * @description
   * Splits a comment's body into text and mention runs, resolving each
   * `@{uuid}` token to the member's display name and role. A token that
   * matches no loaded member — left the organization, or simply malformed —
   * falls back to the same neutral label an unresolved activity actor gets.
   *
   * @access private
   * @since 3.1.0
   *
   * @param {string | null} body - The comment's stored body.
   * @param {readonly MemberSelectOption[]} members - The organization's loaded members.
   *
   * @returns {readonly InterventionActivityBodySegment[]} Text and resolved-mention runs, in order.
   */
  private bodySegmentsOf(
    body: string | null,
    members: readonly MemberSelectOption[],
  ): readonly InterventionActivityBodySegment[] {
    return parseInterventionMentions(body ?? '').map(
      (segment: InterventionMentionSegment): InterventionActivityBodySegment => {
        if (segment.kind === 'text') return { kind: 'text', text: segment.value, title: null };

        const member: MemberSelectOption | null = resolveInterventionMentionMember(
          segment.value,
          members,
        );

        return {
          kind: 'mention',
          text: member?.displayName ?? $localize`:@@intervention.list.unknownMember:Unknown member`,
          title: member?.roleLabel ?? null,
        };
      },
    );
  }

  /**
   * Method statusChangeOf
   *
   * @description
   * Narrows a `status_changed` entry's loose payload to its structured shape.
   * Defensive rather than trusting `event`: the payload type is a union with
   * a generic `Record<string, unknown>` fallback, so a malformed entry must
   * degrade to `null` instead of rendering a broken pair of tags.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {InterventionActivityOutput} activity - The entry in question.
   *
   * @returns {InterventionStatusChangePayload | null} The `{ from; to }` pair, or null.
   */
  private statusChangeOf(
    activity: InterventionActivityOutput,
  ): InterventionStatusChangePayload | null {
    const payload: unknown = activity.payload;

    return payload !== null && typeof payload === 'object' && 'from' in payload && 'to' in payload
      ? (payload as InterventionStatusChangePayload)
      : null;
  }

  /**
   * Method rescheduleOf
   *
   * @description
   * Narrows a `rescheduled` entry's loose payload to the new planning window.
   * Defensive like {@link statusChangeOf}: a malformed payload degrades to
   * `null` and the row falls back to the generic line.
   *
   * @access private
   * @since 4.3.0
   *
   * @param {InterventionActivityOutput} activity - The entry in question.
   *
   * @returns {{ plannedStartAt: string | null; dueAt: string | null } | null} The new window, or null.
   */
  private rescheduleOf(
    activity: InterventionActivityOutput,
  ): { readonly plannedStartAt: string | null; readonly dueAt: string | null } | null {
    const payload: unknown = activity.payload;
    if (payload === null || typeof payload !== 'object' || !('to' in payload)) return null;
    const target: unknown = (payload as { readonly to: unknown }).to;
    if (target === null || typeof target !== 'object') return null;
    const window = target as { readonly plannedStartAt?: unknown; readonly dueAt?: unknown };

    return {
      plannedStartAt: typeof window.plannedStartAt === 'string' ? window.plannedStartAt : null,
      dueAt: typeof window.dueAt === 'string' ? window.dueAt : null,
    };
  }

  /**
   * Method rescheduleWindowLabelOf
   * @description The new planning window as a localized "start → due" label.
   * @access private
   * @since 4.3.0
   * @param {{ plannedStartAt: string | null; dueAt: string | null }} window - The new window.
   * @returns {string} A localized date pair.
   */
  private rescheduleWindowLabelOf(window: {
    readonly plannedStartAt: string | null;
    readonly dueAt: string | null;
  }): string {
    const label = (iso: string | null): string =>
      iso === null ? '—' : this.dateFormat.format(new Date(iso));

    return `${label(window.plannedStartAt)} → ${label(window.dueAt)}`;
  }
  //#endregion
}
