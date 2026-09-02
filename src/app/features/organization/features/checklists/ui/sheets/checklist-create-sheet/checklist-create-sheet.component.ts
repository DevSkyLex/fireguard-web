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
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { CreateChecklistInput } from '@features/organization/features/checklists/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheetImports } from '@shared/ui/sheet';
import { ChecklistCreateForm } from '../../forms/checklist-create-form';

/**
 * Component ChecklistCreateSheet
 * @class ChecklistCreateSheet
 *
 * @description
 * The spartan sheet hosting {@link ChecklistCreateForm}, the same shape
 * `ChannelCreateDialog` wraps `ChannelCreateForm` in.
 *
 * Purely presentational: it owns the overlay chrome, forwards
 * `visible`/`visibleChange` and `pending` to the form, and re-emits
 * {@link submitted}, closing itself once the form validates — the page
 * decides whether the create request itself succeeds and, on success,
 * closes the panel and clears its own visibility flag
 * (`ARCHITECTURE.md` §10.5). Dismissal is blocked while a request is in
 * flight.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-checklist-create-sheet
 *   [visible]="createDialogVisible()"
 *   [pending]="store.isCreating()"
 *   (visibleChange)="createDialogVisible.set($event)"
 *   (submitted)="create($event)"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-create-sheet',
  imports: [ChecklistCreateForm, ...HlmSheetImports],
  templateUrl: './checklist-create-sheet.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistCreateSheet {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the panel is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the creation write is in flight, forwarded to the form and blocking dismissal.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the panel opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property submitted
   * @readonly
   * @description The form's validated creation payload, forwarded untouched.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<CreateChecklistInput>}
   */
  public readonly submitted: OutputEmitterRef<CreateChecklistInput> =
    output<CreateChecklistInput>();
  //#endregion

  //#region Properties
  /**
   * Property sheetState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly sheetState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );

  /**
   * Property side
   * @readonly
   * @description The panel's side — `'bottom'` below `sm`, `'right'` at and above it (`DESIGN.md` "Action Surfaces" rule 2).
   * @access protected
   * @since 2.0.0
   * @type {Signal<'right' | 'bottom'>}
   */
  protected readonly side: Signal<'right' | 'bottom'> = sheetSide();
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   * @description Reports a dismissal back to the page. Ignored while a request is in flight, matching the bound `disableClose`.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }
  //#endregion
}
