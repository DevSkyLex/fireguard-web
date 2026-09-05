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
 * The intervention's activity timeline, oldest first: a system-recorded
 * event (created, status change) renders as a spartan `hlmMarker` row — a
 * coloured, event-specific icon plus its text — a comment renders as a
 * spartan `hlmMessage`/`hlmBubble` pair, the composition spartan's own docs
 * use for a marker-and-message timeline. The two weights are deliberate — a
 * thirty-entry timeline that gave every kind of entry the same visual weight
 * would bury the handful of comments an operator actually reads inside a
 * wall of status noise.
 *
 * `hlmMessageHeader` also drops its default `px-3` — that padding assumes a
 * chat bubble sitting flush beside it, but here it only pushed the comment's
 * author name out of alignment with a system row's flush-left text. It
 * carries `min-h-6` instead: the 24px avatar and the header's own centred
 * text share the same top edge, but at 16px the text is shorter than the
 * avatar, so top-aligning both still leaves their *centres* 4px apart.
 * Flooring the header to the avatar's own 24px makes the two boxes the same
 * height, and centring text inside an equal-height box lands its centre on
 * the avatar's without any manual offset. `hlmMessageContent` also drops its
 * default `gap-2.5` (10px) between the header and the bubble down to
 * `gap-1.5` (6px) — spartan's spacing there assumes a chat's denser message
 * groups, tighter than this timeline's own rhythm.
 *
 * Every entry's icon or avatar sits in a shared `w-6` rail column. A system
 * icon and its content share a 20px alignment band so text, arrows and status
 * badges have the same vertical centre while the row itself stays top-aligned.
 * The comment row overrides
 * `hlmMessageAvatar`'s `min-w-8` down to `min-w-0` so its 24px `hlm-avatar`
 * sizes the column exactly like the system row's 16px marker icon — both
 * share one x-axis, `left-3` (half of `w-6`) past the row's own left edge.
 *
 * The connecting rail is one `w-px bg-muted-foreground/50` element per
 * `<li>` — not per row kind — positioned against the `<li>` itself rather
 * than the small rail span, and entirely inside its own row's box: `top-6`
 * or `top-8` past the glyph (16px icon vs. 24px avatar, same 8px gap either
 * way), `bottom-2` before the row's own bottom edge, a single constant for
 * both row kinds. `border-border` measures near-invisible in dark mode, so
 * the tint comes from the opaque `muted-foreground` token instead, faded to
 * half opacity so it reads as a quiet rail rather than a heavy rule — the
 * fraction lightens automatically in both themes because it mixes the same
 * per-theme token toward the surface behind it.
 *
 * That constant `bottom-2` matters because the rail sits in a **different
 * column** from a comment's own content (`left-3`, inside the `w-6` rail,
 * versus the bubble two `gap-3` steps to its right): the two never overlap
 * on screen, so varying the rail's own offset changes nothing a reader can
 * see there. A prior revision made it vary per `activity.kind` anyway,
 * believing a taller offset would show more blank space above a comment —
 * it only made the (invisible, off to the side) line longer. Do not
 * reintroduce that split; if the rail ever needs a different trailing
 * offset, verify first whether it is actually visible against anything.
 *
 * `<li>`'s own trailing padding is the **only** source of space between
 * rows — never a second, element-specific margin stacked on top of it, and
 * the only lever that actually controls the gap a reader sees below a
 * comment's bubble. Margin and padding do not collapse into each other: an
 * earlier revision added `mb-1.5` to the bubble on top of `<li>`'s own
 * `pb-1.5`, which silently doubled to 12px instead of matching the 6px
 * every other row gets. A comment needs noticeably more trailing room than
 * a plain system line — a filled, rounded surface reads as touching its
 * neighbour at a gap that looks like ample air next to bare text — so it
 * takes a **larger value of the same property** (`pb-6`, quadruple the
 * system row's `pb-1.5`, chosen per `activity.kind`), not a second
 * property and not a change to anything else on the page.
 *
 * `<li>`'s conditional padding is set through a full `[class]` expression,
 * not Angular's `[class.pb-1.5]` sugar — that shorthand mis-parses a class
 * name containing a second `.` and silently produced `pb-1` instead.
 *
 * A system row also carries `min-h-11`: a badge-less line (`created`, the
 * generic fallback) is shorter than one with two status badges, and without
 * a floor its rail column could shrink past the line's own offsets and
 * render nothing visible at all — this happened, for the `created` row
 * specifically. The content's `min-h-5 items-center` keeps every inline datum
 * centred against the icon without centring the whole line inside that floor.
 *
 * A known system event's marker icon carries its own tint — green for
 * `created`, a genuine grey for the far more frequent `status_changed` —
 * bundled with an explicit
 * `text-[length:--spacing(4)]` so it survives `hlmMarkerIcon`'s own sizing
 * rule, which only applies when the icon carries no `text-` class of its own
 * (`INTERVENTION_ACTIVITY_EVENT_ICON_CLASS`).
 *
 * Purely presentational: it takes the loaded activities and the member
 * options that resolve an actor IRI to a face, and renders. The page owns
 * loading (`InterventionWorkspaceStore.loadActivities`) and posting
 * (`InterventionCommentForm` + `store.addComment`).
 *
 * A comment's `@{uuid}` mention tokens are resolved to the mentioned
 * member's display name and rendered as a plain `font-medium text-foreground`
 * span — no link, no `innerHTML` — with the role as its hover title. An
 * unresolved token (the member left, or the id is malformed) falls back to
 * the same neutral label an unattributable activity actor already gets.
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
