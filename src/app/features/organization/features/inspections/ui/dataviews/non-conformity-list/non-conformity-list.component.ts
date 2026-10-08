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
import { lucideCircleAlert, lucideClock } from '@ng-icons/lucide';
import type {
  NonConformityOutput,
  NonConformityStatus,
  NonConformityWaivePendingOutput,
} from '@features/organization/features/inspections/models';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { formatRelativeDays } from '@shared/relative-time';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { InspectionStatusTag } from '../../components/inspection-status-tag';

/**
 * Constant STATUS_VALUES
 *
 * @description
 * Every status the row's status select offers, in workflow order.
 */
const STATUS_VALUES: ReadonlyArray<NonConformityStatus> = ['open', 'in_progress', 'done', 'waived'];

/**
 * Constant TERMINAL_STATUSES
 *
 * @description
 * A non-conformity's terminal statuses — immutable server-side, so the row select is replaced by a
 * static tag.
 */
const TERMINAL_STATUSES: ReadonlySet<NonConformityStatus> = new Set<NonConformityStatus>([
  'done',
  'waived',
]);

/**
 * Constant OPEN_STATUSES
 *
 * @description
 * A non-conformity's open statuses — the only ones a passed `dueAt` reads as overdue.
 */
const OPEN_STATUSES: ReadonlySet<NonConformityStatus> = new Set<NonConformityStatus>([
  'open',
  'in_progress',
]);

/**
 * Constant LABEL_DESCRIPTION_MAX_LENGTH
 *
 * @description
 * How much of a row's description folds into its per-row accessible names, before an ellipsis.
 */
const LABEL_DESCRIPTION_MAX_LENGTH: number = 40;

/**
 * Function truncateDescription
 *
 * @description
 * Truncates a row's description for reuse inside a per-row accessible name — every row otherwise
 * shares the same generic label (WCAG 2.4.6, 4.1.2).
 *
 * @param {string} description - Non-conformity description to shorten for the table cell.
 *
 * @returns {string}
 */
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
 * The inspection detail page's non-conformities section: a flat
 * `hlmItemGroup` of records (never one bordered box per row), each naming
 * its severity and status through {@link InspectionStatusTag}'s
 * `nonConformitySeverity`/`nonConformityStatus` kinds (never colour alone),
 * its description, its optional due/resolved dates and notes, and — while
 * `canWrite` and the status is not yet terminal — a status-change select.
 * `done`/`waived` render the tag alone: both are immutable server-side, so
 * offering a select that always 409s would only teach the operator to
 * distrust it. A due date is a deadline (`DESIGN.md` "Dates"): the absolute
 * date stays visible, with a muted relative-day suffix alongside it — never
 * hidden behind a hover. Past today on an `open`/`in_progress` row it also
 * carries an "Overdue" flag (icon plus label, never colour alone).
 *
 * A pending four-eyes waiver ({@link pendingApprovals}) renders as an inline
 * notice on that row instead of changing its status tag — the backend
 * leaves the record itself untouched until the request is decided, and this
 * view never implies otherwise.
 *
 * A load failure renders its own `hlmEmpty role="alert"` ahead of the plain
 * empty state, with {@link retryRequested} for the page's retry.
 *
 * Presentational (`ARCHITECTURE.md` §10.3): inputs and outputs only, no
 * store or service.
 *
 * @version 2.1.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @example
 * ```html
 * <app-non-conformity-list
 *   [nonConformities]="store.nonConformities()"
 *   [pendingApprovals]="store.nonConformityWaivePending()"
 *   [loading]="store.isLoadingNonConformities()"
 *   [error]="store.nonConformitiesListCallState().error?.message ?? null"
 *   [canWrite]="canWrite()"
 *   [organizationId]="organizationId()"
 *   [regionalFormatting]="regionalFormatting()"
 *   [updatingId]="updatingNonConformityId()"
 *   (statusPicked)="onNonConformityStatusPicked($event)"
 *   (retryRequested)="loadNonConformities()"
 * />
 * ```
 */
@Component({
  selector: 'app-non-conformity-list',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    StateIllustration,
    RouterLink,
    InspectionStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmItemImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideCircleAlert, lucideClock })],
  host: { class: 'block' },
  templateUrl: './non-conformity-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NonConformityList {
  //#region Properties
  /**
   * Property showSourceLinks
   * @readonly
   *
   * @description
   * Links an organization-register row to the inspection that owns its workflow.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly showSourceLinks: InputSignal<boolean> = input(false);
  //#endregion

  //#region Methods
  /**
   * Method sourceInspectionLabelOf
   * @method
   *
   * @description
   * Names a source inspection using the finding description, without ambiguous repeated links.
   *
   * @access protected
   * @since unreleased
   *
   * @param {NonConformityOutput} nc - Value supplied by the owning park workflow.
   *
   * @returns {string} Result consumed by the owning park workflow.
   */
  protected sourceInspectionLabelOf(nc: NonConformityOutput): string {
    return $localize`:@@park.anomalies.openInspectionLabel:Open source inspection for ${truncateDescription(nc.description)}:description:`;
  }

  //#endregion

  //#region Inputs
  /**
   * Property nonConformities
   * @readonly
   *
   * @description
   * The inspection's cached non-conformities, in server order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<ReadonlyArray<NonConformityOutput>>}
   */
  public readonly nonConformities: InputSignal<ReadonlyArray<NonConformityOutput>> =
    input.required<ReadonlyArray<NonConformityOutput>>();

  /**
   * Property pendingApprovals
   * @readonly
   *
   * @description
   * Pending waiver requests, keyed by non-conformity id
   * (`InspectionStore.nonConformityWaivePending`).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<Readonly<Record<string, NonConformityWaivePendingOutput>>>}
   */
  public readonly pendingApprovals: InputSignal<
    Readonly<Record<string, NonConformityWaivePendingOutput>>
  > = input<Readonly<Record<string, NonConformityWaivePendingOutput>>>({});

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether the list is still loading, rendering a skeleton instead of the empty state.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly loading: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property error
   * @readonly
   *
   * @description
   * The list's load failure message, or `null` while idle, loading or loaded. Takes precedence over
   * the plain empty state.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, bound by the page. The default keeps the
   * component renderable with no context wired.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<RegionalFormatSettings>}
   */
  public readonly regionalFormatting: InputSignal<RegionalFormatSettings> =
    input<RegionalFormatSettings>(DEFAULT_REGIONAL_FORMAT_SETTINGS);

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the member may change a row's status (`INSPECTION_WRITE`), owned by the page.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<boolean, BooleanInput>}
   */
  public readonly canWrite: InputSignalWithTransform<boolean, BooleanInput> = input<
    boolean,
    BooleanInput
  >(false, { transform: booleanAttribute });

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace owning these records, so a pending-approval notice can link into its approvals
   * inbox.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property updatingId
   * @readonly
   *
   * @description
   * The id of the row whose status write is currently in flight, or `null`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly updatingId: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property statusErrorText
   * @readonly
   *
   * @description
   * The last status-write failure's specific copy (`InspectionStore.nonConformityStatusErrorText`),
   * or `null`.
   *
   * @access public
   * @since 1.0.0
   *
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
   *
   * @type {InputSignal<string | null>}
   */
  public readonly statusErrorId: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property statusPicked
   * @readonly
   *
   * @description
   * The operator picked a new status for one row.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<{ nonConformityId: string; status: NonConformityStatus }>}
   */
  public readonly statusPicked: OutputEmitterRef<{
    nonConformityId: string;
    status: NonConformityStatus;
  }> = output<{ nonConformityId: string; status: NonConformityStatus }>();

  /**
   * Property retryRequested
   * @readonly
   *
   * @description
   * The load-failed state's own "Try again" was activated. The page owns the actual retry call.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRequested: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property locale
   * @readonly
   *
   * @description
   * The application's language, used to format the relative due/overdue phrase.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * Property orgDatePipe
   * @readonly
   *
   * @description
   * A directly instantiated, dependency-free `OrgDatePipe`, reused to format due/resolved dates
   * without injection.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrgDatePipe}
   */
  private readonly orgDatePipe: OrgDatePipe = new OrgDatePipe();

  /**
   * Property statusValues
   * @readonly
   *
   * @description
   * Every status the row select offers.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ReadonlyArray<NonConformityStatus>}
   */
  protected readonly statusValues: ReadonlyArray<NonConformityStatus> = STATUS_VALUES;

  /**
   * Property isEmpty
   * @readonly
   *
   * @description
   * Whether the plain empty state should render — no records, no load in flight, and no load
   * failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed<boolean>(
    () => !this.loading() && this.error() === null && this.nonConformities().length === 0,
  );
  //#endregion

  //#region Methods
  /**
   * Method isTerminal
   * @method isTerminal
   *
   * @description
   * Whether a row's status is immutable server-side (`done`/`waived`).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NonConformityStatus} status - The row's current status.
   *
   * @returns {boolean} True for `done` or `waived`.
   */
  protected isTerminal(status: NonConformityStatus): boolean {
    return TERMINAL_STATUSES.has(status);
  }

  /**
   * Method pendingFor
   * @method pendingFor
   *
   * @description
   * The pending waiver for one row, if its last waive attempt answered 202.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} nonConformityId - The row's id.
   *
   * @returns {NonConformityWaivePendingOutput | null} The pending request, or null.
   */
  protected pendingFor(nonConformityId: string): NonConformityWaivePendingOutput | null {
    return this.pendingApprovals()[nonConformityId] ?? null;
  }

  /**
   * Method dueDateOf
   * @method dueDateOf
   *
   * @description
   * The row's `dueAt`, formatted for display, or null when unset. `dueAt` is a server instant, not
   * a date-only value, so it renders in `'date'` mode against the organization's timezone
   * (`DESIGN.md` "Dates") rather than reading its UTC calendar day.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NonConformityOutput} nonConformity - The row.
   *
   * @returns {string | null} The formatted date, or null.
   */
  protected dueDateOf(nonConformity: NonConformityOutput): string | null {
    if (nonConformity.dueAt === null) return null;

    return this.orgDatePipe.transform(nonConformity.dueAt, 'date', this.regionalFormatting());
  }

  /**
   * Method resolvedDateOf
   * @method resolvedDateOf
   *
   * @description
   * The row's `resolvedAt`, formatted for display, or null when unset. `resolvedAt` is a server
   * instant, rendered the same way as {@link dueDateOf}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NonConformityOutput} nonConformity - The row.
   *
   * @returns {string | null} The formatted date, or null.
   */
  protected resolvedDateOf(nonConformity: NonConformityOutput): string | null {
    if (nonConformity.resolvedAt === null) return null;

    return this.orgDatePipe.transform(nonConformity.resolvedAt, 'date', this.regionalFormatting());
  }

  /**
   * Method isOverdueOf
   * @method isOverdueOf
   *
   * @description
   * Whether a row's `dueAt` has passed while it is still `open`/`in_progress` — `done`/`waived`
   * never read as overdue. Compares calendar days in the organization's timezone, not the raw
   * instant, so a due instant near local midnight is never misread through the runtime's own
   * timezone.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {NonConformityOutput} nonConformity - The row.
   *
   * @returns {boolean} True when the row needs the operator's attention past its deadline.
   */
  protected isOverdueOf(nonConformity: NonConformityOutput): boolean {
    if (nonConformity.dueAt == null) return false;
    if (!OPEN_STATUSES.has(nonConformity.status)) return false;

    return this.calendarDayOf(nonConformity.dueAt) < this.todayIso();
  }

  /**
   * Method dueRelativeOf
   * @method dueRelativeOf
   *
   * @description
   * The row's `dueAt` as a localized relative-day phrase ("in 3 days", "2 days ago"), or `null`
   * when unset.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {NonConformityOutput} nonConformity - The row.
   *
   * @returns {string | null} The relative phrase, or `null`.
   */
  protected dueRelativeOf(nonConformity: NonConformityOutput): string | null {
    if (nonConformity.dueAt == null) return null;

    return formatRelativeDays(
      this.calendarDayOf(nonConformity.dueAt),
      this.todayIso(),
      this.locale,
    );
  }

  /**
   * Method calendarDayOf
   * @method calendarDayOf
   *
   * @description
   * The organization-timezone calendar day of an ISO instant, as `'YYYY-MM-DD'` — the same day
   * {@link todayIso}, {@link isOverdueOf} and {@link dueRelativeOf} compare against, so a due/resolved
   * instant near local midnight is never misread through the runtime's own timezone.
   *
   * @access private
   * @since 2.1.0
   *
   * @param {string} isoInstant - The instant to resolve, e.g. a row's `dueAt`.
   *
   * @returns {string} The instant's calendar day in the active organization's timezone.
   */
  private calendarDayOf(isoInstant: string): string {
    const timezone: string = this.regionalFormatting().timezone;

    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date(isoInstant));
    } catch {
      return isoInstant.slice(0, 10);
    }
  }

  /**
   * Method todayIso
   * @method todayIso
   *
   * @description
   * Today's calendar day in the active organization's timezone, as `'YYYY-MM-DD'` — the reference
   * {@link isOverdueOf} and {@link dueRelativeOf} compare against.
   *
   * @access private
   * @since 2.0.0
   *
   * @returns {string} Today's date in the organization's timezone.
   */
  private todayIso(): string {
    return this.calendarDayOf(new Date().toISOString());
  }

  /**
   * Method pickStatus
   * @method pickStatus
   *
   * @description
   * Emits {@link statusPicked}, unless it is the status already stored.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {NonConformityOutput} nonConformity - The row being changed.
   * @param {NonConformityStatus} status - The chosen status.
   *
   * @returns {void}
   */
  protected pickStatus(nonConformity: NonConformityOutput, status: NonConformityStatus): void {
    if (status === nonConformity.status) return;

    this.statusPicked.emit({ nonConformityId: nonConformity.id, status });
  }

  /**
   * Method statusSelectLabelOf
   * @method statusSelectLabelOf
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
   * @method statusErrorIdOf
   *
   * @description
   * The inline error paragraph's DOM id for one row, whether or not it currently renders.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} nonConformityId - The row's id.
   *
   * @returns {string} The paragraph's id.
   */
  protected statusErrorIdOf(nonConformityId: string): string {
    return `non-conformity-status-error-${nonConformityId}`;
  }

  /**
   * Method pendingApprovalLinkLabelOf
   * @method pendingApprovalLinkLabelOf
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
