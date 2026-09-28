import { NgTemplateOutlet } from '@angular/common';
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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCircleAlert, lucideX } from '@ng-icons/lucide';
import type { ApprovalRequestOutput } from '@features/organization/features/approvals/models';
import { approvalDecisionReason } from '@features/organization/features/approvals/utils';
import { getOrganizationInitials } from '@features/organization/utils';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { formatRelativeTime } from '@shared/relative-time';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmButton } from '@shared/ui/button';
import { HlmItemImports } from '@shared/ui/item';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { ApprovalStatusTag } from '../../components/approval-status-tag';

/** One literal Tailwind width per always-rendered column, for the shared surface's first-load skeleton. */
const SKELETON_COLUMN_WIDTHS: ReadonlyArray<string> = [
  'w-32',
  'w-24',
  'w-24',
  'w-20',
  'w-20',
  'w-16',
];

/** Action types that link their subject to a known detail route; every other type renders the bare reference. */
const SUBJECT_ROUTE_BUILDERS: Readonly<
  Record<string, (organizationId: string, subjectId: string) => readonly string[]>
> = {
  equipment_decommission: (organizationId, subjectId) => [
    '/organizations',
    organizationId,
    'equipments',
    subjectId,
  ],
};

/** Reader-facing subject labels keyed by the approval action that owns the reference. */
const SUBJECT_LABELS: Readonly<Record<string, string>> = {
  equipment_decommission: $localize`:@@approvals.subject.equipment:Equipment record`,
  nc_waiver: $localize`:@@approvals.subject.nonConformity:Non-conformity record`,
};

/**
 * Component ApprovalRequestTable
 * @class ApprovalRequestTable
 *
 * @description
 * The approvals inbox grid: `hlmTable` inside a bordered, scrollable shell,
 * one row per request — action type, subject (linking to the gated
 * resource's own record when a route is known, e.g.
 * `equipment_decommission`; a bare reference otherwise, since no
 * non-conformity detail route exists yet), requester, requested/expires
 * dates, status, and — once decided or expired — the decision note, the
 * decider, the execution timestamp, and the execution error when present. A
 * pending row's expiry carries a muted relative suffix next to the absolute
 * date; decided and withdrawn rows show a plain dash instead, since the
 * expiry no longer applies. Row actions Approve/Reject render only on a
 * `pending` row and only when {@link canDecide}.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load, filter and paginate, and
 * whether the reader may decide; this component only renders the page it is
 * handed and emits {@link approveRequested} / {@link rejectRequested} for
 * the page to open the decision dialog. Each row's Approve/Reject buttons
 * carry a per-row accessible name ({@link approveAriaLabelOf} /
 * {@link rejectAriaLabelOf}) rather than a static "Approve request" label
 * repeated on every row.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-approval-request-table',
  imports: [
    NgTemplateOutlet,
    OrgDatePipe,
    RouterLink,
    CollectionSurface,
    NgIcon,
    ApprovalStatusTag,
    HlmButton,
    ...HlmAvatarImports,
    ...HlmItemImports,
    ...HlmTableImports,
    ...HlmTooltipImports,
  ],
  providers: [provideIcons({ lucideCheck, lucideCircleAlert, lucideX })],
  templateUrl: './approval-request-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalRequestTable {
  /**
   * Property decisionReason
   * @readonly
   * @description Localizes the server capability reason beside unavailable actions.
   * @access protected
   * @since 1.0.0
   * @type {typeof approvalDecisionReason}
   */
  protected readonly decisionReason: typeof approvalDecisionReason = approvalDecisionReason;

  /** The application's active locale, for {@link expiresRelativeOf}. */
  private readonly locale: string = inject<string>(LOCALE_ID);
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered, ordered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly ApprovalRequestOutput[]>}
   */
  public readonly items: InputSignal<readonly ApprovalRequestOutput[]> =
    input.required<readonly ApprovalRequestOutput[]>();

  /**
   * Property loading
   * @readonly
   * @description Whether to draw placeholder rows instead of the data.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canDecide
   * @readonly
   * @description Whether the active member may open the decision dialog (`organization.approvals.decide`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canDecide: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property organizationId
   * @readonly
   * @description The workspace the subject links are built against.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property actionTypeLabelOf
   * @readonly
   * @description Resolves a raw action-type key to its catalog label, from the page's own catalog fetch.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<(actionType: string) => string>}
   */
  public readonly actionTypeLabelOf: InputSignal<(actionType: string) => string> = input<
    (actionType: string) => string
  >((actionType) => actionType);

  /**
   * Property memberLabelOf
   * @readonly
   *
   * @description
   * Resolves a member reference to a reader-facing name. The neutral default
   * keeps this presentational component free from directory injection while
   * guaranteeing that a raw identifier is never rendered.
   *
   * @access public
   * @since 1.3.0
   * @type {InputSignal<(memberId: string) => string>}
   */
  public readonly memberLabelOf: InputSignal<(memberId: string) => string> = input<
    (memberId: string) => string
  >(() => $localize`:@@common.unknownMember:Unknown member`);

  /**
   * Property memberAvatarOf
   * @readonly
   *
   * @description
   * Resolves a member reference to their directory avatar URL, or
   * `undefined` when none is set. The neutral default keeps this
   * presentational component renderable with no directory wired.
   *
   * @access public
   * @since 1.3.0
   * @type {InputSignal<(memberId: string) => string | undefined>}
   */
  public readonly memberAvatarOf: InputSignal<(memberId: string) => string | undefined> = input<
    (memberId: string) => string | undefined
  >(() => undefined);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, bound by the page. The default keeps the component renderable with no context wired.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);
  //#endregion

  //#region Outputs
  /**
   * Property approveRequested
   * @readonly
   * @description A row's Approve action was activated; carries that row's request.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ApprovalRequestOutput>}
   */
  public readonly approveRequested: OutputEmitterRef<ApprovalRequestOutput> =
    output<ApprovalRequestOutput>();

  /**
   * Property rejectRequested
   * @readonly
   * @description A row's Reject action was activated; carries that row's request.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ApprovalRequestOutput>}
   */
  public readonly rejectRequested: OutputEmitterRef<ApprovalRequestOutput> =
    output<ApprovalRequestOutput>();
  /**
   * Property withdrawRequested
   * @readonly
   * @description A row's Reject action was activated; carries that row's request.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ApprovalRequestOutput>}
   */
  public readonly withdrawRequested: OutputEmitterRef<ApprovalRequestOutput> =
    output<ApprovalRequestOutput>();
  //#endregion

  //#region Properties
  /**
   * Property showActions
   * @readonly
   * @description Includes requester withdrawal independently of decision permissions.
   * @access protected
   * @since 1.1.0
   * @type {Signal<boolean>}
   */
  protected readonly showActions: Signal<boolean> = computed(
    () =>
      this.canDecide() || this.items().some((item) => item.allowedActions?.includes('withdraw')),
  );

  /**
   * Property skeletonColumnWidths
   * @readonly
   * @description One literal Tailwind width per rendered column, handed to the shared surface's skeleton rows. The trailing decide column only joins when {@link canDecide} renders it.
   * @access protected
   * @since 1.2.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly skeletonColumnWidths: Signal<readonly string[]> = computed<readonly string[]>(
    () =>
      this.showActions() ? [...SKELETON_COLUMN_WIDTHS, 'ms-auto w-16'] : SKELETON_COLUMN_WIDTHS,
  );
  //#endregion

  //#region Methods
  /**
   * Method subjectRouteOf
   * @description The gated resource's own detail route, or `null` when the action type has no known route yet.
   * @access protected
   * @since 1.0.0
   * @param {ApprovalRequestOutput} item - The rendered request.
   * @returns {readonly string[] | null} The route segments, or `null`.
   */
  protected subjectRouteOf(item: ApprovalRequestOutput): readonly string[] | null {
    const builder = SUBJECT_ROUTE_BUILDERS[item.actionType];
    return builder ? builder(this.organizationId(), item.subjectId) : null;
  }

  /**
   * Method subjectLabelOf
   * @method subjectLabelOf
   *
   * @description
   * Names the gated domain record without exposing its transport identifier.
   * Unknown future approval types retain a neutral, usable fallback.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {ApprovalRequestOutput} item - The rendered request.
   *
   * @returns {string} The subject's reader-facing domain label.
   */
  protected subjectLabelOf(item: ApprovalRequestOutput): string {
    return (
      SUBJECT_LABELS[item.actionType] ?? $localize`:@@approvals.subject.related:Related record`
    );
  }

  /**
   * Method isDecided
   * @description Whether a row is past `pending` and so may carry a decision note, a decider and an execution error.
   * @access protected
   * @since 1.0.0
   * @param {ApprovalRequestOutput} item - The rendered request.
   * @returns {boolean}
   */
  protected isDecided(item: ApprovalRequestOutput): boolean {
    return item.status !== 'pending';
  }

  /**
   * Method approveAriaLabelOf
   *
   * @description
   * The row's Approve button's accessible name, folding in the action-type
   * label and request timestamp so two rows never announce as the identical
   * "Approve request" — mirrors `MaintenanceScheduleTable.equipmentLinkAriaLabelOf`.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {ApprovalRequestOutput} item - The rendered request.
   *
   * @returns {string} The accessible name.
   */
  protected approveAriaLabelOf(item: ApprovalRequestOutput): string {
    const actionType: string = this.actionTypeLabelOf()(item.actionType);

    return $localize`:@@approvals.table.approveActionNamed:Approve ${actionType}:actionType: request from ${item.createdAt}:createdAt:`;
  }

  /**
   * Method rejectAriaLabelOf
   *
   * @description
   * The row's Reject button's accessible name, folding in the action-type
   * label and request timestamp, matching {@link approveAriaLabelOf}.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {ApprovalRequestOutput} item - The rendered request.
   *
   * @returns {string} The accessible name.
   */
  protected rejectAriaLabelOf(item: ApprovalRequestOutput): string {
    const actionType: string = this.actionTypeLabelOf()(item.actionType);

    return $localize`:@@approvals.table.rejectActionNamed:Reject ${actionType}:actionType: request from ${item.createdAt}:createdAt:`;
  }

  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.0.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return this.showActions() ? 7 : 6;
  }

  /**
   * Method initialsOf
   * @description The requester's avatar-fallback initials, derived from their resolved display name.
   * @access protected
   * @since 1.3.0
   * @param {string} memberId - The requester's bare member id.
   * @returns {string} A 1–2 letter uppercase initials string.
   */
  protected initialsOf(memberId: string): string {
    return getOrganizationInitials(this.memberLabelOf()(memberId));
  }

  /**
   * Method expiresRelativeOf
   * @description The localized "in 3 days" / "3 days ago" label for a pending row's expiry, muted beside the absolute date.
   * @access protected
   * @since 1.3.0
   * @param {ApprovalRequestOutput} item - The rendered request.
   * @returns {string} The relative expiry label.
   */
  protected expiresRelativeOf(item: ApprovalRequestOutput): string {
    return formatRelativeTime(item.expiresAt, this.locale);
  }

  /**
   * Method expiresVisible
   * @description Whether a row's expiry still means anything to show — `pending` or `expired` — as opposed to a decided or withdrawn row, whose expiry no longer applies.
   * @access protected
   * @since 1.4.0
   * @param {ApprovalRequestOutput} item - The rendered request.
   * @returns {boolean}
   */
  protected expiresVisible(item: ApprovalRequestOutput): boolean {
    return item.status === 'pending' || item.status === 'expired';
  }

  /**
   * Method expiresRelativeVisible
   * @description Whether the muted relative suffix belongs beside the absolute expiry — only while the row is still `pending`.
   * @access protected
   * @since 1.4.0
   * @param {ApprovalRequestOutput} item - The rendered request.
   * @returns {boolean}
   */
  protected expiresRelativeVisible(item: ApprovalRequestOutput): boolean {
    return item.status === 'pending';
  }
  //#endregion
}
