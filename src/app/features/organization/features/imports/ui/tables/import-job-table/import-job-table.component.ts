import { NgTemplateOutlet } from '@angular/common';
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
import { lucideCircleCheck, lucideCircleX, lucideEye } from '@ng-icons/lucide';
import type {
  ImportJobKind,
  ImportJobOutput,
} from '@features/organization/features/imports/models';
import { ImportStatusTag } from '@features/organization/features/imports/ui/components/import-status-tag';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmTableImports } from '@shared/ui/table';

/** Human labels for the job kinds, matching `IMPORT_JOB_KIND_OPTIONS`. */
const KIND_LABEL: Readonly<Record<ImportJobKind, string>> = {
  equipment: $localize`:@@imports.kind.equipment:Equipment`,
  facility: $localize`:@@imports.kind.facility:Facilities`,
  member: $localize`:@@imports.kind.member:Members`,
};

/**
 * Component ImportJobTable
 * @class ImportJobTable
 *
 * @description
 * The import jobs grid: `hlmTable` inside a bordered, scrollable shell, one
 * row per job — filename, kind, status, a dry-run badge when applicable,
 * live `processedRows`/`totalRows` progress while `processing`, the
 * successful/failed counts, and the created/completed dates. Every row
 * carries a "View report" action, always enabled — a `pending`/`processing`
 * row opens the same report view showing progress so far.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service; the page owns loading and polling, this component only
 * renders the rows it is handed and emits {@link selected}.
 *
 * Built on the shared `CollectionSurface`, which owns the bordered scroll
 * shell, the first-load skeleton and the table/card switch. Below the
 * surface's container breakpoint a job reads as a card: the filename (dry-run
 * badge kept), then its status and result counts, then "View report" as an
 * explicitly labelled footer action rather than the row's bare icon.
 *
 * The result counts pair each number with a glyph (`DESIGN.md`'s Glyph Rule):
 * a green `45` and a red `5` carried status by colour alone, which neither a
 * colour-blind operator nor a screen reader could read — hence the
 * check/cross icons and the visually hidden "rows imported"/"rows failed"
 * labels.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-import-job-table',
  imports: [
    NgTemplateOutlet,
    OrgDatePipe,
    CollectionSurface,
    NgIcon,
    ImportStatusTag,
    HlmBadge,
    HlmButton,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCircleCheck, lucideCircleX, lucideEye })],
  templateUrl: './import-job-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportJobTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly ImportJobOutput[]>}
   */
  public readonly items: InputSignal<readonly ImportJobOutput[]> =
    input.required<readonly ImportJobOutput[]>();

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
   * Property selected
   * @readonly
   * @description A row's "View report" action was activated; carries that row's job.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ImportJobOutput>}
   */
  public readonly selected: OutputEmitterRef<ImportJobOutput> = output<ImportJobOutput>();
  //#endregion

  //#region Properties
  /**
   * Property skeletonColumnWidths
   * @readonly
   *
   * @description
   * One literal Tailwind width per rendered column, handed to the shared
   * surface's skeleton rows. Literal strings because Tailwind scans source
   * text, and column-aware because a skeleton whose blocks do not line up
   * with the header it replaces reads as a broken table rather than a
   * loading one.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly skeletonColumnWidths: Signal<readonly string[]> = computed<readonly string[]>(
    () => ['w-32', 'w-20', 'w-20', 'w-24', 'w-24', 'w-8'],
  );
  //#endregion

  //#region Methods
  /**
   * Method columnCount
   * @description How many cells a row has, so a full-width message can span them.
   * @access protected
   * @since 2.0.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 6;
  }

  /**
   * Method kindLabelOf
   * @description Names a job's kind for the kind column.
   * @access protected
   * @since 1.0.0
   * @param {ImportJobOutput} item - The rendered job.
   * @returns {string} The localized kind label.
   */
  protected kindLabelOf(item: ImportJobOutput): string {
    return KIND_LABEL[item.kind];
  }

  /**
   * Method progressLabelOf
   * @description The live row-progress text while a job is running, or `null` once it is not.
   * @access protected
   * @since 1.0.0
   * @param {ImportJobOutput} item - The rendered job.
   * @returns {string | null} `"processed / total"`, or `null` outside `processing`.
   */
  protected progressLabelOf(item: ImportJobOutput): string | null {
    if (item.status !== 'processing') return null;

    return item.totalRows === undefined
      ? `${item.processedRows}`
      : `${item.processedRows} / ${item.totalRows}`;
  }

  /**
   * Method viewReportAriaLabelOf
   * @description The row's "View report" button's accessible name, folding in the filename so two rows never announce identically.
   * @access protected
   * @since 1.0.0
   * @param {ImportJobOutput} item - The rendered job.
   * @returns {string} The accessible name.
   */
  protected viewReportAriaLabelOf(item: ImportJobOutput): string {
    return $localize`:@@imports.table.viewReportNamed:View report for ${item.originalFilename}:filename:`;
  }
  //#endregion
}
