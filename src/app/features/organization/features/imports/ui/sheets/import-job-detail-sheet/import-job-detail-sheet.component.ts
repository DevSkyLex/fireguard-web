import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCirclePlus,
  lucideCircleX,
  lucideTag,
  lucideTriangleAlert,
} from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import {
  resolveImportRowErrorTag,
  type ImportJobOutput,
  type ImportRowErrorOutput,
} from '@features/organization/features/imports/models';
import { ImportStatusTag } from '@features/organization/features/imports/ui/components/import-status-tag';
import { CollectionPagination } from '@shared/collection-pagination';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { sheetSide } from '@shared/sheet-side';
import { HlmButton } from '@shared/ui/button';
import { HlmSheetImports } from '@shared/ui/sheet';

/** The severity-to-icon-colour pairing for a row's code badge, matching `IMPORT_STATUS_TAG_ICON_CLASS`. */
const ROW_TAG_ICON_CLASS: Readonly<Record<string, string>> = {
  neutral: 'text-muted-foreground',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

/**
 * Component ImportJobDetailSheet
 * @class ImportJobDetailSheet
 *
 * @description
 * The report panel for one import job: a plain-language summary line
 * ({@link summary} — the partial-application copy: how many rows were
 * created versus skipped, and why, since the backend applies a quota
 * per row during processing rather than refusing the whole file up
 * front) followed by the full row list — row number, column, a code badge
 * (`would_create` renders as a positive "Would create", never as a
 * failure), and the message. A `pending`/`processing` job renders the same
 * panel with whatever the live poll has observed so far.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store; the page
 * owns which job is open and the live data behind it.
 *
 * Below `sm` the panel presents as a bottom drawer (`@shared/sheet-side`).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-import-job-detail-sheet',
  imports: [
    CollectionPagination,
    HlmButton,
    OrgDatePipe,
    NgIcon,
    ImportStatusTag,
    ...HlmSheetImports,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleCheck,
      lucideCirclePlus,
      lucideCircleX,
      lucideTag,
      lucideTriangleAlert,
    }),
  ],
  templateUrl: './import-job-detail-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportJobDetailSheet {
  /**
   * Property trackingError
   * @readonly
   * @description Observation failure for this job, distinct from a confirmed processing failure.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string | null>}
   */
  public readonly trackingError = input<string | null>(null);
  /**
   * Property refreshRequested
   * @readonly
   * @description Requests a new status read without recreating the job.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly refreshRequested = output<void>();
  /**
   * Property page
   * @readonly
   * @description Current local report page, reset for another job.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<number>}
   */
  protected readonly page = linkedSignal({ source: () => this.job()?.id, computation: () => 1 });
  /**
   * Property pageCount
   * @readonly
   * @description Number of pages in the received report.
   * @access protected
   * @since 1.0.0
   * @type {Signal<number>}
   */
  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.rows().length / 50)));
  /**
   * Property pageRows
   * @readonly
   * @description Report rows on the current local page.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly ImportRowErrorOutput[]>}
   */
  protected readonly pageRows = computed(() =>
    this.rows().slice((this.page() - 1) * 50, this.page() * 50),
  );

  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the panel is open. Owned by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property job
   * @readonly
   * @description The job being viewed, or `null` while nothing is selected.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<ImportJobOutput | null>}
   */
  public readonly job: InputSignal<ImportJobOutput | null> = input<ImportJobOutput | null>(null);

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
   * Property visibleChange
   * @readonly
   * @description The panel wants to open or close.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   * @description The panel state, derived from {@link visible} so there is no second copy of the truth.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 1.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();

  /**
   * Property summary
   * @readonly
   *
   * @description
   * The report's plain-language headline. `null` while the job is still
   * `pending` — nothing to summarize before processing starts. A dry run
   * states plainly that nothing was written; a real run states the
   * partial-application outcome, naming the plan limit when that is why
   * rows were skipped rather than leaving the reader to infer it from the
   * row list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly summary: Signal<string | null> = computed<string | null>(() => {
    const job: ImportJobOutput | null = this.job();
    if (job === null || job.status === 'pending') return null;

    if (job.dryRun) {
      return $localize`:@@imports.report.dryRunSummary:Dry run — no data was written. ${job.successfulRows}:would: row(s) would be created, ${job.failedRows}:issues: with issues.`;
    }

    if (job.failedRows === 0) {
      return $localize`:@@imports.report.allCreated:${job.successfulRows}:count: row(s) created.`;
    }

    const quotaExceeded: boolean = job.errorReport.some((row) => row.code === 'quota_exceeded');
    const reason: string = quotaExceeded
      ? $localize`:@@imports.report.reasonQuota:plan limit reached`
      : $localize`:@@imports.report.reasonIssues:see the list below`;

    return $localize`:@@imports.report.partial:${job.successfulRows}:created: of ${job.processedRows}:processed: created; ${job.failedRows}:skipped: skipped — ${reason}:reason:`;
  });

  /** The report's row list, in the order the backend returned it. */
  protected readonly rows: Signal<ReadonlyArray<ImportRowErrorOutput>> = computed(
    () => this.job()?.errorReport ?? [],
  );
  //#endregion

  //#region Methods
  /**
   * Method rowTagOf
   * @description Resolves one report row's code to its label, icon and colour.
   * @access protected
   * @since 1.0.0
   * @param {ImportRowErrorOutput} row - The report row.
   * @returns {{ label: string; icon: string; iconClass: string }} The resolved presentation.
   */
  protected rowTagOf(row: ImportRowErrorOutput): {
    label: string;
    icon: string;
    iconClass: string;
  } {
    const descriptor = resolveImportRowErrorTag(row.code);
    return {
      label: descriptor.label,
      icon: descriptor.icon,
      iconClass: ROW_TAG_ICON_CLASS[descriptor.severity],
    };
  }

  /**
   * Method onStateChanged
   * @method onStateChanged
   *
   * @description
   * Relays a dismissal, ignoring the echo of a change the page already made.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {BrnDialogState} state - The panel's new state.
   *
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
