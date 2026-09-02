import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import type { CreateChecklistInput } from '@features/organization/features/checklists/models';
import { sheetSide } from '@shared/sheet-side';
import { HlmSheet, HlmSheetImports } from '@shared/ui/sheet';
import { UnsavedChangesDialog } from '@shared/unsaved-changes';
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
 * flight. An Escape or outside-click on a dirty draft is undone and turned
 * into the shared unsaved-changes confirmation, the same gate every
 * converted create sheet now carries (`facility-create-sheet`).
 *
 * @version 1.1.0
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
  imports: [ChecklistCreateForm, UnsavedChangesDialog, ...HlmSheetImports],
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

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Clears {@link dirty} whenever the panel closes, so an abandoned draft cannot make the next opening confirm over nothing.
   * @access public
   * @since 1.1.0
   */
  public constructor() {
    effect((): void => {
      const isVisible: boolean = this.visible();

      untracked((): void => {
        if (!isVisible) this.dirty.set(false);
      });
    });
  }
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

  /**
   * Property dirty
   * @readonly
   * @description Whether closing right now would lose something — set from the form's `dirtyChanged`. Gates {@link requestClose}.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly dirty: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property unsavedChangesDialogState
   * @readonly
   * @description Open state of the shared {@link UnsavedChangesDialog}, raised by {@link requestClose} when {@link dirty} is true.
   * @access protected
   * @since 1.1.0
   * @type {WritableSignal<BrnDialogState>}
   */
  protected readonly unsavedChangesDialogState: WritableSignal<BrnDialogState> =
    signal<BrnDialogState>('closed');

  /**
   * Property sheetRef
   * @readonly
   * @description The panel directive, queried so {@link onStateChanged} can reopen it to undo an Escape/outside-click made while {@link dirty}.
   * @access protected
   * @since 1.1.0
   * @type {Signal<HlmSheet | undefined>}
   */
  protected readonly sheetRef: Signal<HlmSheet | undefined> = viewChild(HlmSheet);
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   * @description Reports a dismissal back to the page, ignored while a request is in flight (matching the bound `disableClose`); a dismissal reaching here while {@link dirty} is undone and redirected to the confirmation.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    if (this.pending()) return;

    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    if (!isOpen && this.dirty()) {
      this.sheetRef()?.open();
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method requestClose
   * @description The panel's own close action, reached from the form's Cancel. Closes right away when nothing would be lost; otherwise asks first.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected requestClose(): void {
    if (this.dirty()) {
      this.unsavedChangesDialogState.set('open');

      return;
    }

    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesConfirmed
   * @description The operator chose to discard the draft — closes both the confirmation and the panel.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onUnsavedChangesConfirmed(): void {
    this.unsavedChangesDialogState.set('closed');
    this.visibleChange.emit(false);
  }

  /**
   * Method onUnsavedChangesDismissed
   * @description The operator chose to keep editing — closes the confirmation only.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onUnsavedChangesDismissed(): void {
    this.unsavedChangesDialogState.set('closed');
  }
  //#endregion
}
