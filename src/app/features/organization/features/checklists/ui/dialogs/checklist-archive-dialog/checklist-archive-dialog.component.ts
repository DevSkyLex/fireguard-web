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
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';

/**
 * Component ChecklistArchiveDialog
 * @class ChecklistArchiveDialog
 *
 * @description
 * The checklist row's Archive confirmation, the same non-destructive,
 * busy-locked shape `FacilityDeleteDialog` uses: archiving is reversible in
 * principle (the record stays readable), so this is a plain confirm rather
 * than a type-to-confirm dialog. Purely presentational: it emits
 * {@link confirmed} and never calls the store itself
 * (`ARCHITECTURE.md` §10.3). There is no restore action — the backend
 * exposes only `POST .../archive`.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-checklist-archive-dialog
 *   [visible]="archivingChecklist() !== null"
 *   [pending]="store.isArchiving()"
 *   [checklistName]="archivingChecklist()?.name ?? ''"
 *   (visibleChange)="onArchiveDialogVisibleChanged($event)"
 *   (confirmed)="confirmArchive()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-checklist-archive-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './checklist-archive-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChecklistArchiveDialog {
  //#region Inputs
  /**
   * Property visible
   * @readonly
   * @description Whether the dialog is open.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property pending
   * @readonly
   * @description Whether the archive write is in flight, which locks the confirm and cancel actions.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property checklistName
   * @readonly
   * @description The checklist's name, named in the confirmation copy.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly checklistName: InputSignal<string> = input<string>('');
  //#endregion

  //#region Outputs
  /**
   * Property visibleChange
   * @readonly
   * @description Reports the dialog opening or closing, including a dismissal.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly visibleChange: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property confirmed
   * @readonly
   * @description Emits once the reader confirms the archive action.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property dialogState
   * @readonly
   * @description The overlay's own open/closed state, derived from {@link visible}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly dialogState: Signal<BrnDialogState> = computed((): BrnDialogState =>
    this.visible() ? 'open' : 'closed',
  );
  //#endregion

  //#region Methods
  /**
   * Method onStateChanged
   * @method onStateChanged
   * @description Reports a dismissal — Cancel, the backdrop or Escape — back to the host.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onStateChanged(state: BrnDialogState): void {
    const isOpen: boolean = state === 'open';

    if (isOpen === this.visible()) return;

    this.visibleChange.emit(isOpen);
  }

  /**
   * Method confirm
   * @method confirm
   * @description Emits the confirmed archive action.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirm(): void {
    if (this.pending()) return;

    this.confirmed.emit();
  }
  //#endregion
}
