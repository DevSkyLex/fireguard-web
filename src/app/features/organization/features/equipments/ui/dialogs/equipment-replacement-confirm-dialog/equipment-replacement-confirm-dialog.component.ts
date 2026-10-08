import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';

/**
 * Class EquipmentReplacementConfirmDialog
 * @class EquipmentReplacementConfirmDialog
 *
 * @description
 * Final explicit confirmation before the historical equipment is irreversibly retired.
 */
@Component({
  selector: 'app-equipment-replacement-confirm-dialog',
  imports: [HlmButton, ...HlmAlertDialogImports],
  templateUrl: './equipment-replacement-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentReplacementConfirmDialog {
  //#region Properties
  /**
   * Property visible
   * @readonly
   *
   * @description
   * Whether the replacement decision needs confirmation.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input(false);

  /**
   * Property equipmentName
   * @readonly
   *
   * @description
   * Historical identity that will be retired.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string>}
   */
  public readonly equipmentName: InputSignal<string> = input('');

  /**
   * Property confirmed
   * @readonly
   *
   * @description
   * Operator accepted the terminal replacement.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly confirmed: OutputEmitterRef<void> = output<void>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Operator returned to the preserved replacement draft.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion
}
