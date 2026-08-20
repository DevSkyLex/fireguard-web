import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArchive, lucideEllipsis, lucidePencil } from '@ng-icons/lucide';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { ChecklistStatusTag } from '../../components/checklist-status-tag';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/**
 * Component ChecklistTable
 * @class ChecklistTable
 *
 * @description
 * The checklist template library's row grid: `hlmTable` inside a bordered,
 * scrollable shell, one row per checklist (name, status through
 * `ChecklistStatusTag`, item count, last update), and a trailing `…` menu
 * offering Edit and Archive — the two row actions this list-scoped feature
 * owns, since there is no detail route (`FEATURE.md`).
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load and paginate; a menu choice only
 * asks for the action through an `output()`. Archive is offered only for an
 * `active` row — an archived checklist has no further row action, since the
 * backend exposes no restore endpoint.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-table',
  imports: [
    DatePipe,
    NgIcon,
    ChecklistStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideArchive, lucideEllipsis, lucidePencil })],
  templateUrl: './checklist-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   * @description The rows to render — already filtered and paged by the page.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly ChecklistOutput[]>}
   */
  public readonly items: InputSignal<readonly ChecklistOutput[]> =
    input.required<readonly ChecklistOutput[]>();

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
   * Property canWrite
   * @readonly
   * @description Whether the row menu may offer Edit/Archive. False hides both rather than showing controls that would be refused.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly canWrite: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property editRequested
   * @readonly
   * @description A row menu asked to edit the checklist. The table never edits: the page opens the edit dialog.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ChecklistOutput>}
   */
  public readonly editRequested: OutputEmitterRef<ChecklistOutput> = output<ChecklistOutput>();

  /**
   * Property archiveRequested
   * @readonly
   * @description A row menu asked for the checklist to be archived. The table never archives: the page confirms and calls the store.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<ChecklistOutput>}
   */
  public readonly archiveRequested: OutputEmitterRef<ChecklistOutput> = output<ChecklistOutput>();
  //#endregion

  //#region Properties
  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method columnCount
   * @description How many cells a row has, so the empty-state message can span the full width.
   * @access protected
   * @since 1.0.0
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    return 5;
  }
  //#endregion
}
