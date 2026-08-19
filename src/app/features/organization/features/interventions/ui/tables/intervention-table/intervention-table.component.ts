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
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowDown,
  lucideArrowUp,
  lucideChevronsUpDown,
  lucideCircleAlert,
  lucideCopy,
  lucideEllipsis,
  lucideSquareArrowOutUpRight,
  lucideTrash2,
  lucideUserCog,
} from '@ng-icons/lucide';
import {
  resolveInterventionTag,
  type InterventionListSort,
  type InterventionOutput,
  type InterventionSortField,
  type InterventionStatus,
} from '@features/organization/features/interventions/models';
import { HlmButton } from '@shared/ui/button';
import { HlmCheckbox } from '@shared/ui/checkbox';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { InterventionTag } from '../../components/intervention-tag';
import type { InterventionListItemViewModel } from '../../pages/interventions-page/models';
import {
  INTERVENTION_TABLE_COLUMN,
  type InterventionTableColumn,
  type InterventionTransitionRequest,
} from './models';

/** Placeholder rows drawn while the first page loads. */
const SKELETON_ROWS: ReadonlyArray<number> = [1, 2, 3, 4, 5];

/**
 * Component InterventionTable
 * @class InterventionTable
 *
 * @description
 * The interventions grid, built the way spartan's own dashboard builds one:
 * `hlmTable` inside a bordered, scrollable shell, sortable heads that are
 * ghost buttons carrying the direction glyph, and a trailing `…` menu per row.
 *
 * Presentational (`ARCHITECTURE.md` §10.3) — it injects no store and calls no
 * service. Sorting, column visibility and the row commands are all described
 * through `output()`; the page decides what they mean. The status transitions
 * a row offers come from that intervention's own `allowedTransitions`, so the
 * menu can never propose a move the backend would refuse. A row's Delete
 * entry follows the same rule: it gates on the row's own server-computed
 * `allowedActions.canDelete` — which already folds the caller's permission
 * and the deletable-status window — the same flag the page filters a bulk
 * selection through, so the table never offers a delete the API would refuse.
 *
 * Submitting and withdrawing a submission are reserved to the intervention's
 * own responsible (mirroring `InterventionDetailPage`'s `canSubmit` gate): the
 * `submitted` target on any row and the `in_progress` target on a `submitted`
 * row stay visible but disabled, with a title explaining why, when
 * {@link currentMemberIri} does not match the row's `responsible` — hidden
 * would leave the state unperceivable.
 *
 * "Duplicate" is offered from any status — {@link canDuplicate} is the only
 * gate — since duplicating an abandoned intervention is legitimate.
 *
 * The host is `min-h-0 flex-1`: the page's frame is a fixed-height flex
 * column and this table is its only scrolling region — the host stretches to
 * fill what the header, toolbar and pager leave, and the template's own
 * `overflow-auto` shell scrolls inside that (`DESIGN.md`'s independent-
 * columns rule).
 *
 * @version 6.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-table',
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    HlmButton,
    HlmCheckbox,
    HlmSkeleton,
    InterventionTag,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
  ],
  providers: [
    provideIcons({
      lucideArrowDown,
      lucideArrowUp,
      lucideChevronsUpDown,
      lucideCircleAlert,
      lucideCopy,
      lucideEllipsis,
      lucideSquareArrowOutUpRight,
      lucideTrash2,
      lucideUserCog,
    }),
  ],
  templateUrl: './intervention-table.component.html',
  host: { class: 'block min-h-0 w-full flex-1' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionTable {
  //#region Inputs
  /**
   * Property items
   * @readonly
   *
   * @description
   * The rows to render — already filtered, ordered and paged by the page.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<readonly InterventionListItemViewModel[]>}
   */
  public readonly items: InputSignal<readonly InterventionListItemViewModel[]> =
    input.required<readonly InterventionListItemViewModel[]>();

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Whether to draw placeholder rows instead of the data.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property sortOrder
   * @readonly
   *
   * @description
   * The active ordering, deciding what each sortable head announces and which
   * direction glyph it shows.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {InputSignal<InterventionListSort>}
   */
  public readonly sortOrder: InputSignal<InterventionListSort> =
    input.required<InterventionListSort>();

  /**
   * Property hiddenColumns
   * @readonly
   *
   * @description
   * Which optional columns the operator has hidden.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {InputSignal<ReadonlySet<InterventionTableColumn>>}
   */
  public readonly hiddenColumns: InputSignal<ReadonlySet<InterventionTableColumn>> = input<
    ReadonlySet<InterventionTableColumn>
  >(new Set<InterventionTableColumn>());

  /**
   * Property canTransition
   * @readonly
   *
   * @description
   * Whether the row menu may offer status changes. False hides them rather
   * than showing controls that would be refused.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canTransition: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property transitioningIds
   * @readonly
   *
   * @description
   * Ids of the rows whose status transition is currently in flight. Such a
   * row's cached `allowedTransitions` still describe its pre-transition
   * state, so its "Move to" entries are withheld until the server confirms.
   *
   * @access public
   * @since 6.3.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly transitioningIds: InputSignal<readonly string[]> = input<readonly string[]>([]);

  /**
   * Property canAssign
   * @readonly
   *
   * @description
   * Whether the row menu may offer "Assign responsible…". False hides the
   * entry rather than showing a control that would be refused; the
   * intervention's own status narrows it further per row (draft or planned
   * only).
   *
   * @access public
   * @since 6.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canAssign: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property canDuplicate
   * @readonly
   *
   * @description
   * Whether the row menu may offer "Duplicate". False hides the entry rather
   * than showing a control that would be refused; unlike delete or assign,
   * duplicating is offered from any status — duplicating an abandoned
   * intervention is legitimate.
   *
   * @access public
   * @since 6.1.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canDuplicate: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property currentMemberIri
   * @readonly
   *
   * @description
   * The signed-in member's own IRI, gating the identity-restricted
   * transitions — submitting and withdrawing a submission are reserved to
   * the intervention's own responsible.
   *
   * @access public
   * @since 6.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currentMemberIri: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property selectedIds
   * @readonly
   *
   * @description
   * Ids of the currently selected rows, owned by the page. Drives the header
   * checkbox's checked/indeterminate state and each row's own checkbox.
   *
   * @access public
   * @since 5.0.0
   *
   * @type {InputSignal<ReadonlySet<string>>}
   */
  public readonly selectedIds: InputSignal<ReadonlySet<string>> = input<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property detailRouteBase
   * @readonly
   *
   * @description
   * Path segments the row link appends the intervention id to. Passed in
   * rather than resolved relatively, so the table navigates the same way
   * wherever it is rendered.
   *
   * @access public
   * @since 3.0.0
   *
   * @type {InputSignal<readonly string[]>}
   */
  public readonly detailRouteBase: InputSignal<readonly string[]> =
    input.required<readonly string[]>();
  //#endregion

  //#region Outputs
  /**
   * Property sortChanged
   * @readonly
   *
   * @description
   * A sortable head was activated; carries the field. Re-emitting the active
   * field means "reverse it" — the page owns the direction.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {OutputEmitterRef<InterventionSortField>}
   */
  public readonly sortChanged: OutputEmitterRef<InterventionSortField> =
    output<InterventionSortField>();

  /**
   * Property transitionRequested
   * @readonly
   *
   * @description
   * A row menu asked for a status change.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {OutputEmitterRef<InterventionTransitionRequest>}
   */
  public readonly transitionRequested: OutputEmitterRef<InterventionTransitionRequest> =
    output<InterventionTransitionRequest>();

  /**
   * Property referenceCopied
   * @readonly
   *
   * @description
   * A row menu asked for its reference to be copied.
   *
   * @access public
   * @since 4.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly referenceCopied: OutputEmitterRef<InterventionOutput> =
    output<InterventionOutput>();

  /**
   * Property deleteRequested
   * @readonly
   *
   * @description
   * A row menu asked for the intervention to be deleted. The table never
   * deletes: the page confirms and calls the store.
   *
   * @access public
   * @since 5.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly deleteRequested: OutputEmitterRef<InterventionOutput> =
    output<InterventionOutput>();

  /**
   * Property assignRequested
   * @readonly
   *
   * @description
   * A row menu asked to assign a responsible. The table never assigns: the
   * page opens `InterventionAssignDialog` and calls the store.
   *
   * @access public
   * @since 6.0.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly assignRequested: OutputEmitterRef<InterventionOutput> =
    output<InterventionOutput>();

  /**
   * Property duplicateRequested
   * @readonly
   *
   * @description
   * A row menu asked to duplicate the intervention. The table never opens
   * the creation sheet: the page builds the prefill and does.
   *
   * @access public
   * @since 6.1.0
   *
   * @type {OutputEmitterRef<InterventionOutput>}
   */
  public readonly duplicateRequested: OutputEmitterRef<InterventionOutput> =
    output<InterventionOutput>();

  /**
   * Property selectionChanged
   * @readonly
   *
   * @description
   * The selected row ids changed, through the header "select all" or a row's
   * own checkbox. Carries the full next selection, not a delta.
   *
   * @access public
   * @since 5.0.0
   *
   * @type {OutputEmitterRef<ReadonlySet<string>>}
   */
  public readonly selectionChanged: OutputEmitterRef<ReadonlySet<string>> =
    output<ReadonlySet<string>>();
  //#endregion

  //#region Properties
  /** Column ids, for the template's visibility checks. */
  protected readonly column: typeof INTERVENTION_TABLE_COLUMN = INTERVENTION_TABLE_COLUMN;

  /** Placeholder rows for the loading render. */
  protected readonly skeletonRows: ReadonlyArray<number> = SKELETON_ROWS;
  //#endregion

  //#region Methods
  /**
   * Method isVisible
   * @method isVisible
   *
   * @description
   * Whether an optional column is shown.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionTableColumn} id - The column id.
   *
   * @returns {boolean} True when it renders.
   */
  protected isVisible(id: InterventionTableColumn): boolean {
    return !this.hiddenColumns().has(id);
  }

  /**
   * Method columnCount
   * @method columnCount
   *
   * @description
   * How many cells a row currently has, so a full-width message can span
   * them. The fixed columns are the leading checkbox, Ref., Intervention and
   * the trailing Actions menu.
   *
   * @access protected
   * @since 5.0.0
   *
   * @returns {number} The rendered column count.
   */
  protected columnCount(): number {
    const optional: number = [
      this.column.STATUS,
      this.column.PRIORITY,
      this.column.TYPE,
      this.column.SITE,
      this.column.DUE,
    ].filter((id: InterventionTableColumn): boolean => this.isVisible(id)).length;

    return optional + 4;
  }

  /**
   * Method ariaSort
   * @method ariaSort
   *
   * @description
   * What a sortable head announces for the active ordering.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionSortField} field - The head's field.
   *
   * @returns {'ascending' | 'descending' | 'none'} The `aria-sort` value.
   */
  protected ariaSort(field: InterventionSortField): 'ascending' | 'descending' | 'none' {
    const active: InterventionListSort = this.sortOrder();

    if (active.field !== field) return 'none';

    return active.direction === 'asc' ? 'ascending' : 'descending';
  }

  /**
   * Method sortIcon
   * @method sortIcon
   *
   * @description
   * The glyph a sortable head shows: a direction when it is the active one, a
   * neutral pair otherwise.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionSortField} field - The head's field.
   *
   * @returns {string} A registered lucide name.
   */
  protected sortIcon(field: InterventionSortField): string {
    const active: InterventionListSort = this.sortOrder();

    if (active.field !== field) return 'lucideChevronsUpDown';

    return active.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }

  /**
   * Method transitionsFor
   * @method transitionsFor
   *
   * @description
   * The status moves a row may offer — the backend's own list, or none when
   * the member cannot transition or the row's own transition is still in
   * flight (its cached `allowedTransitions` describe the pre-transition
   * state until the server entity lands).
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {readonly InterventionStatus[]} The offered targets.
   */
  protected transitionsFor(intervention: InterventionOutput): readonly InterventionStatus[] {
    if (!this.canTransition() || this.transitioningIds().includes(intervention.id)) return [];

    return intervention.allowedTransitions;
  }

  /**
   * Method statusLabelOf
   * @method statusLabelOf
   *
   * @description
   * Names a status for a menu entry.
   *
   * @access protected
   * @since 4.0.0
   *
   * @param {InterventionStatus} status - The status.
   *
   * @returns {string} Its localized label.
   */
  protected statusLabelOf(status: InterventionStatus): string {
    return resolveInterventionTag('status', status).label;
  }

  /**
   * Method isRowDeletable
   * @method isRowDeletable
   *
   * @description
   * Whether a row's menu may offer Delete — the row's own server-computed
   * `allowedActions.canDelete`, which already folds the caller's permission
   * and the deletable-status window the API enforces.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {boolean} True when Delete should render.
   */
  protected isRowDeletable(intervention: InterventionOutput): boolean {
    return intervention.allowedActions?.canDelete === true;
  }

  /**
   * Method isRowAssignable
   * @method isRowAssignable
   *
   * @description
   * Whether a row's menu may offer "Assign responsible…": the caller must
   * have the permission ({@link canAssign}) and the intervention's own status
   * must still be one planning may touch (draft or planned).
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   *
   * @returns {boolean} True when "Assign responsible…" should render.
   */
  protected isRowAssignable(intervention: InterventionOutput): boolean {
    return (
      this.canAssign() && (intervention.status === 'draft' || intervention.status === 'planned')
    );
  }

  /**
   * Method isTransitionGated
   * @method isTransitionGated
   *
   * @description
   * Whether a status target is reserved to the intervention's own
   * responsible — submitting (`submitted` as a target, from any status) and
   * withdrawing a submission (`in_progress` as a target on a `submitted`
   * row). The backend answers 403 for anyone else, so the entry stays
   * visible but disabled rather than silently missing.
   *
   * @access protected
   * @since 6.0.0
   *
   * @param {InterventionOutput} intervention - The row's intervention.
   * @param {InterventionStatus} target - The offered status target.
   *
   * @returns {boolean} True when the entry must be disabled.
   */
  protected isTransitionGated(
    intervention: InterventionOutput,
    target: InterventionStatus,
  ): boolean {
    const requiresIdentity: boolean =
      target === 'submitted' || (intervention.status === 'submitted' && target === 'in_progress');

    return requiresIdentity && this.currentMemberIri() !== intervention.responsible;
  }

  /**
   * Property responsibleOnlyReason
   * @readonly
   *
   * @description
   * The disabled-entry title shown on an identity-gated transition.
   *
   * @access protected
   * @since 6.0.0
   *
   * @type {string}
   */
  protected readonly responsibleOnlyReason: string = $localize`:@@intervention.list.responsibleOnly:Only the responsible can do this.`;

  /**
   * Method isSelected
   * @method isSelected
   *
   * @description
   * Whether a row's checkbox is currently checked.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {string} id - The row's intervention id.
   *
   * @returns {boolean} True when selected.
   */
  protected isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  /**
   * Property allSelected
   * @readonly
   *
   * @description
   * Whether every currently rendered row is selected, driving the header
   * checkbox's checked state. Selection is scoped to the rendered rows (the
   * current page), not the whole filtered set. A `computed` rather than a
   * method: bound in the header, it would otherwise scan the page on every
   * change-detection pass.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly allSelected: Signal<boolean> = computed<boolean>(() => {
    const rows: readonly InterventionListItemViewModel[] = this.items();
    const selected: ReadonlySet<string> = this.selectedIds();

    return (
      rows.length > 0 &&
      rows.every((item: InterventionListItemViewModel): boolean =>
        selected.has(item.intervention.id),
      )
    );
  });

  /**
   * Property someSelected
   * @readonly
   *
   * @description
   * Whether some but not all rendered rows are selected, driving the header
   * checkbox's indeterminate state.
   *
   * @access protected
   * @since 5.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly someSelected: Signal<boolean> = computed<boolean>(() => {
    const selected: ReadonlySet<string> = this.selectedIds();

    return (
      !this.allSelected() &&
      this.items().some((item: InterventionListItemViewModel): boolean =>
        selected.has(item.intervention.id),
      )
    );
  });

  /**
   * Method toggleAll
   * @method toggleAll
   *
   * @description
   * Selects or deselects every currently rendered row, preserving any
   * selection made on another page.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {boolean} checked - The header checkbox's new state.
   *
   * @returns {void}
   */
  protected toggleAll(checked: boolean): void {
    const next: Set<string> = new Set(this.selectedIds());

    for (const item of this.items()) {
      if (checked) next.add(item.intervention.id);
      else next.delete(item.intervention.id);
    }

    this.selectionChanged.emit(next);
  }

  /**
   * Method toggleRow
   * @method toggleRow
   *
   * @description
   * Selects or deselects a single row.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {string} id - The row's intervention id.
   * @param {boolean} checked - The row checkbox's new state.
   *
   * @returns {void}
   */
  protected toggleRow(id: string, checked: boolean): void {
    const next: Set<string> = new Set(this.selectedIds());

    if (checked) next.add(id);
    else next.delete(id);

    this.selectionChanged.emit(next);
  }

  /**
   * Method selectRowLabel
   * @method selectRowLabel
   *
   * @description
   * The accessible name for a row's checkbox, naming the intervention rather
   * than leaving every checkbox on the page announced identically.
   *
   * @access protected
   * @since 5.0.0
   *
   * @param {string} name - The intervention's name.
   *
   * @returns {string} The localized label.
   */
  protected selectRowLabel(name: string): string {
    return $localize`:@@intervention.list.rowSelectLabel:Select ${name}:name:`;
  }
  //#endregion
}
