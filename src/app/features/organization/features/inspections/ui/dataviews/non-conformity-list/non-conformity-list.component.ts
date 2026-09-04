import type { BooleanInput } from '@angular/cdk/coercion';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type InputSignalWithTransform,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck } from '@ng-icons/lucide';
import type {
  NonConformityOutput,
  NonConformityStatus,
  NonConformityWaivePendingOutput,
} from '@features/organization/features/inspections/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { InspectionStatusTag } from '../../components/inspection-status-tag';

/** Every status the row's status select offers, in workflow order. */
const STATUS_VALUES: ReadonlyArray<NonConformityStatus> = ['open', 'in_progress', 'done', 'waived'];

/** A non-conformity's terminal statuses — immutable server-side, so the row select is replaced by a static tag. */
const TERMINAL_STATUSES: ReadonlySet<NonConformityStatus> = new Set<NonConformityStatus>([
  'done',
  'waived',
]);

/** Converts an ISO timestamp to the locale's short date, or `null` for an absent one. */
function formatDate(iso: string | null, locale: string): string | null {
  if (iso === null) return null;

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(iso));
}

/** How much of a row's description folds into its per-row accessible names, before an ellipsis. */
const LABEL_DESCRIPTION_MAX_LENGTH: number = 40;

/** Truncates a row's description for reuse inside a per-row accessible name — every row otherwise shares the same generic label (WCAG 2.4.6, 4.1.2). */
function truncateDescription(description: string): string {
  return description.length > LABEL_DESCRIPTION_MAX_LENGTH
    ? `${description.slice(0, LABEL_DESCRIPTION_MAX_LENGTH).trimEnd()}…`
    : description;
}

/**
 * Component NonConformityList
 * @class NonConformityList
 *
 * @description
 * The inspection detail page's non-conformities section: one card per
 * record, each naming its severity and status through
 * {@link InspectionStatusTag}'s `nonConformitySeverity`/`nonConformityStatus`
 * kinds (never colour alone), its description, its optional due/resolved
 * dates and notes, and — while `canWrite` and the status is not yet
 * terminal — a status-change select. `done`/`waived` render the tag alone:
 * both are immutable server-side, so offering a select that always 409s
 * would only teach the operator to distrust it.
 *
 * A pending four-eyes waiver ({@link pendingApprovals}) renders as an inline
 * notice on that row instead of changing its status tag — the backend
 * leaves the record itself untouched until the request is decided, and this
 * view never implies otherwise.
 *
 * Presentational (`ARCHITECTURE.md` §10.3): inputs and {@link statusPicked}
 * only, no store or service.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-non-conformity-list
 *   [nonConformities]="store.nonConformities()"
 *   [pendingApprovals]="store.nonConformityWaivePending()"
 *   [loading]="store.isLoadingNonConformities()"
 *   [canWrite]="canWrite()"
 *   [organizationId]="organizationId()"
 *   [updatingId]="updatingNonConformityId()"
 *   (statusPicked)="onNonConformityStatusPicked($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-non-conformity-list',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    RouterLink,
    InspectionStatusTag,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideCircleCheck })],
  host: { class: 'block' },
  templateUrl: './non-conformity-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformityList {
  //#region Inputs
  /**
   * Property nonConformities
   * @readonly
   * @description The inspection's cached non-conformities, in server order.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ReadonlyArray<NonConformityOutput>>}
   */
  public readonly nonConformities: InputSignal<ReadonlyArray<NonConformityOutput>> =
    input.required<ReadonlyArray<NonConformityOutput>>();

  /**
   * Property pendingApprovals
   * @readonly
   * @description Pending waiver requests, keyed by non-conformity id (`InspectionStore.nonConformityWaivePending`).
   * @access public
   * @since 1.0.0
   * @type {InputSignal<Readonly<Record<string, NonConformityWaivePendingOutput>>>}
   */
  public readonly pendingApprovals: InputSignal<
    Readonly<Record<string, NonConformityWaivePendingOutput>>
  > = input<Readonly<Record<string, NonConformityWaivePendingOutput>>>({});

  /**
   * Property loading
   * @readonly
   * @description Whether the list is still loading, rendering a skeleton instead of the empty state.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly loading: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property canWrite
   * @readonly
   * @description Whether the member may change a row's status (`INSPECTION_WRITE`), owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canWrite: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning these records, so a pending-approval notice can link into its approvals inbox.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property updatingId
   * @readonly
   * @description The id of the row whose status write is currently in flight, or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly updatingId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property statusErrorText
   * @readonly
   * @description The last status-write failure's specific copy (`InspectionStore.nonConformityStatusErrorText`), or `null`.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly statusErrorText: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property statusErrorId
   * @readonly
   *
   * @description
   * The id of the row {@link statusErrorText} belongs to
   * (`InspectionStore.nonConformityStatusErrorId`), or `null`. The error
   * renders inline under this specific row only — never as a page-wide
   * banner a reader has to match to a row themselves.
   *
   * @access public
   * @since 1.1.0
   * @type {InputSignal<string | null>}
   */
  public readonly statusErrorId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property statusPicked
   * @readonly
   * @description The operator picked a new status for one row.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<{ nonConformityId: string; status: NonConformityStatus }>}
   */
  public readonly statusPicked: OutputEmitterRef<{
    nonConformityId: string;
    status: NonConformityStatus;
  }> = output<{ nonConformityId: string; status: NonConformityStatus }>();
  //#endregion

  //#region Properties
  /** The application's language, used to format due/resolved dates. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** Every status the row select offers. */
  protected readonly statusValues: ReadonlyArray<NonConformityStatus> = STATUS_VALUES;

  /**
   * Property isEmpty
   * @readonly
   * @description Whether the empty state should render — no records and no load in flight.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed<boolean>(
    () => !this.loading() && this.nonConformities().length === 0,
  );
  //#endregion

  //#region Methods
  /**
   * Method isTerminal
   * @description Whether a row's status is immutable server-side (`done`/`waived`).
   * @access protected
   * @since 1.0.0
   * @param {NonConformityStatus} status - The row's current status.
   * @returns {boolean} True for `done` or `waived`.
   */
  protected isTerminal(status: NonConformityStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  }

  /**
   * Method pendingFor
   * @description The pending waiver for one row, if its last waive attempt answered 202.
   * @access protected
   * @since 1.0.0
   * @param {string} nonConformityId - The row's id.
   * @returns {NonConformityWaivePendingOutput | null} The pending request, or null.
   */
  protected pendingFor(nonConformityId: string): NonConformityWaivePendingOutput | null {
    return this.pendingApprovals()[nonConformityId] ?? null;
  }

  /**
   * Method dueDateOf
   * @description The row's `dueAt`, formatted for display, or null when unset.
   * @access protected
   * @since 1.0.0
   * @param {NonConformityOutput} nonConformity - The row.
   * @returns {string | null} The formatted date, or null.
   */
  protected dueDateOf(nonConformity: NonConformityOutput): string | null {
    return formatDate(nonConformity.dueAt, this.locale);
  }

  /**
   * Method resolvedDateOf
   * @description The row's `resolvedAt`, formatted for display, or null when unset.
   * @access protected
   * @since 1.0.0
   * @param {NonConformityOutput} nonConformity - The row.
   * @returns {string | null} The formatted date, or null.
   */
  protected resolvedDateOf(nonConformity: NonConformityOutput): string | null {
    return formatDate(nonConformity.resolvedAt, this.locale);
  }

  /**
   * Method pickStatus
   * @description Emits {@link statusPicked}, unless it is the status already stored.
   * @access protected
   * @since 1.0.0
   * @param {NonConformityOutput} nonConformity - The row being changed.
   * @param {NonConformityStatus} status - The chosen status.
   * @returns {void}
   */
  protected pickStatus(nonConformity: NonConformityOutput, status: NonConformityStatus): void {
    if (status === nonConformity.status) return;

    this.statusPicked.emit({ nonConformityId: nonConformity.id, status });
  }

  /**
   * Method statusSelectLabelOf
   *
   * @description
   * A distinct accessible name for one row's status select, so a screen
   * reader announces which finding it is changing instead of the bare word
   * "Status" repeated identically on every row.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {NonConformityOutput} nonConformity - The row the select belongs to.
   *
   * @returns {string} The row-specific label.
   */
  protected statusSelectLabelOf(nonConformity: NonConformityOutput): string {
    const description: string = truncateDescription(nonConformity.description);

    return $localize`:@@inspection.nc.statusSelectLabel:Status for ${description}:description:`;
  }

  /**
   * Method statusErrorIdOf
   * @description The inline error paragraph's DOM id for one row, whether or not it currently renders.
   * @access protected
   * @since 1.1.0
   * @param {string} nonConformityId - The row's id.
   * @returns {string} The paragraph's id.
   */
  protected statusErrorIdOf(nonConformityId: string): string {
    return `non-conformity-status-error-${nonConformityId}`;
  }

  /**
   * Method pendingApprovalLinkLabelOf
   *
   * @description
   * A distinct accessible name for one row's "View in approvals" link, so a
   * screen reader distinguishes several pending rows instead of announcing
   * the same generic link text repeatedly (WCAG 2.4.4).
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {NonConformityOutput} nonConformity - The row the link belongs to.
   *
   * @returns {string} The row-specific label.
   */
  protected pendingApprovalLinkLabelOf(nonConformity: NonConformityOutput): string {
    const description: string = truncateDescription(nonConformity.description);

    return $localize`:@@inspection.nc.pendingApproval.linkLabel:View in approvals for ${description}:description:`;
  }
  //#endregion
}
