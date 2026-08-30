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
import { lucideArchive, lucideEllipsis, lucidePencil } from '@ng-icons/lucide';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { CollectionSurface } from '@shared/collection-surface';
import {
  DEFAULT_REGIONAL_FORMAT_SETTINGS,
  OrgDatePipe,
  type RegionalFormatSettings,
} from '@shared/regional-format';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmTableImports } from '@shared/ui/table';
import { ChecklistStatusTag } from '../../components/checklist-status-tag';

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
 * Built on the shared `CollectionSurface`, which owns the bordered scroll
 * shell, the first-load skeleton and the table/card switch. Below the
 * surface's container breakpoint each checklist reads as a card: the name,
 * then its status and item count — the count being what tells two
 * similarly named templates apart. The `…` menu is the card's only
 * affordance, and without {@link canWrite} the card carries none, since
 * there is no record to open.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls
 * no service. The page decides what to load and paginate; a menu choice only
 * asks for the action through an `output()`. Archive is offered only for an
 * `active` row — an archived checklist has no further row action, since the
 * backend exposes no restore endpoint.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-table',
  imports: [
    NgTemplateOutlet,
    OrgDatePipe,
    CollectionSurface,
    NgIcon,
    ChecklistStatusTag,
    HlmButton,
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
    () => ['w-40 max-w-full', 'w-20', 'ms-auto w-8', 'w-24', 'ms-auto w-6'],
  );
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
