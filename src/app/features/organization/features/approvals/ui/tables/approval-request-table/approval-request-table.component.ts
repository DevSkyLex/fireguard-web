import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import type { ApprovalRequestOutput } from '@features/organization/features/approvals/models';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { ApprovalStatusTag } from '../../components/approval-status-tag';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

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
 * decider, and the execution error when present. Row actions Approve/Reject
 * render only on a `pending` row and only when {@link canDecide}.
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
 * @version 1.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-approval-request-table',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    ApprovalStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCheck, lucideX })],
  templateUrl: './approval-request-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApprovalRequestTable {
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
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
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
   * label and the subject id so two rows never announce as the identical
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

    return $localize`:@@approvals.table.approveActionNamed:Approve ${actionType}:actionType: request for ${item.subjectId}:subjectId:`;
  }

  /**
   * Method rejectAriaLabelOf
   *
   * @description
   * The row's Reject button's accessible name, folding in the action-type
   * label and the subject id, matching {@link approveAriaLabelOf}.
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

    return $localize`:@@approvals.table.rejectActionNamed:Reject ${actionType}:actionType: request for ${item.subjectId}:subjectId:`;
  }

  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.0.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return this.canDecide() ? 7 : 6;
  }
  //#endregion
}
