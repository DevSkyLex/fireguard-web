import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';

/**
 * Component TrendFilterDrawer
 * @class TrendFilterDrawer
 *
 * @description
 * Reusable PrimeNG drawer shell used by dashboard trend cards to host
 * their filter forms. The component is presentation-only: callers control
 * visibility and handle cancel, reset, and apply actions.
 *
 * @version 1.0.0
 */
@Component({
  selector: 'app-trend-filter-drawer',
  templateUrl: './trend-filter-drawer.component.html',
  imports: [ButtonModule, DrawerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrendFilterDrawer {
  /**
   * Property skipNextCloseCancel
   *
   * @description
   * Prevents PrimeNG close notifications triggered by controlled visibility
   * updates from re-emitting a cancel after the explicit apply action closes the drawer.
   *
   * @type {boolean}
   */
  private skipNextCloseCancel: boolean = false;

  /**
   * Property title
   * @readonly
   *
   * @description
   * Drawer header title shown above the filter form.
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional supporting copy shown below the drawer header.
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly description: InputSignal<string | undefined> = input<string>();

  /**
   * Property visible
   * @readonly
   *
   * @description
   * Controlled visibility state of the drawer.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly visible: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Loading state forwarded to the apply action.
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);

  /**
   * Event cancel
   * @readonly
   *
   * @description
   * Emitted when the user dismisses the drawer without applying changes.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancel: OutputEmitterRef<void> = output<void>();

  /**
   * Event reset
   * @readonly
   *
   * @description
   * Emitted when the user requests a draft reset.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly reset: OutputEmitterRef<void> = output<void>();

  /**
   * Event apply
   * @readonly
   *
   * @description
   * Emitted when the user confirms the current draft filter values.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly apply: OutputEmitterRef<void> = output<void>();

  /**
   * Method onVisibleChange
   *
   * @description
   * Treats any PrimeNG-driven close interaction as a cancel action so the
   * owning store can restore the draft from applied filters.
   *
   * @param {boolean} visible - Next visible state emitted by PrimeNG.
   * @returns {void}
   */
  protected onVisibleChange(visible: boolean): void {
    if (!visible) {
      if (this.skipNextCloseCancel) {
        this.skipNextCloseCancel = false;
        return;
      }

      this.cancel.emit();
    }
  }

  /**
   * Method onReset
   *
   * @description
   * Emits a draft reset request.
   *
   * @returns {void}
   */
  protected onReset(): void {
    this.reset.emit();
  }

  /**
   * Method onApply
   *
   * @description
   * Emits an explicit apply action and suppresses the following controlled
   * drawer-close notification.
   *
   * @returns {void}
   */
  protected onApply(): void {
    this.skipNextCloseCancel = true;
    this.apply.emit();
  }
}
