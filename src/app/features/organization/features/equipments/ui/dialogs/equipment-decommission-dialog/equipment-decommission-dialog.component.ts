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
 * Component EquipmentDecommissionDialog
 * @class EquipmentDecommissionDialog
 *
 * @description
 * The equipment detail page's Decommission confirmation. Unlike the other
 * lifecycle moves, this one is **terminal**: `primaryAction()` resolves to
 * `null` on a decommissioned record, so nothing puts the equipment back in
 * service afterwards. That is what earns it a confirmation
 * (`DESIGN.md` §Action Surfaces rule 5) — the action used to fire on a single
 * click from the shell header. Purely presentational: it emits
 * {@link confirmed} and never calls the store itself (`ARCHITECTURE.md` §10.3).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-equipment-decommission-dialog
 *   [visible]="decommissionDialogVisible()"
 *   [pending]="store.isChangingLifecycle()"
 *   [equipmentName]="title()"
 *   (visibleChange)="decommissionDialogVisible.set($event)"
 *   (confirmed)="confirmDecommission()"
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-decommission-dialog',
  imports: [...HlmAlertDialogImports],
  templateUrl: './equipment-decommission-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDecommissionDialog {
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
   * @description Whether a lifecycle write is in flight, which locks both actions.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property equipmentName
   * @readonly
   * @description The record's display title, named in the confirmation copy.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly equipmentName: InputSignal<string> = input<string>('');
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
   * @description Emits once the reader confirms the decommission.
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
   * @description Emits the confirmed decommission.
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
