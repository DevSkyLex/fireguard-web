import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
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
import { sheetSide } from '@shared/sheet-side';
import { HlmSheetImports } from '@shared/ui/sheet';

/** The severity-to-icon-colour pairing for a row's code badge, matching `IMPORT_STATUS_TAG_ICON_CLASS`. */
const ROW_TAG_ICON_CLASS: Readonly<Record<string, string>> = {
  neutral: 'text-neutral-500 dark:text-neutral-400',
  info: 'text-blue-500 dark:text-blue-400',
  success: 'text-success',
  warning: 'text-amber-500 dark:text-amber-400',
  danger: 'text-red-500 dark:text-red-400',
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
  imports: [DatePipe, NgIcon, ImportStatusTag, ...HlmSheetImports],
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
