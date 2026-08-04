import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { Inplace, InplaceModule } from 'primeng/inplace';

/**
 * Component InplaceField
 * @class InplaceField
 *
 * @description
 * One property that is read and written in the same place.
 *
 * A record should not need a page to read it and another to write it
 * (ARCHITECTURE.md §10.5). This is the shell that makes that practical: it owns
 * the display/edit toggle, the save and cancel affordances, the pending state
 * and the validation line — and projects whatever control the property actually
 * needs, so a text input, a select and a textarea all read the same way.
 *
 * The draft lives in the projected control, which the host seeds on `opened`
 * and reads on `saved`. The shell stays free of any knowledge about the value's
 * type, and the page keeps the orchestration.
 *
 * Escape closes without saving — the cancel path a keyboard user reaches for
 * first.
 *
 * @example
 * ```html
 * <app-inplace-field
 *   label="Address"
 *   [display]="facility.address"
 *   [pending]="store.saving()"
 *   [error]="addressError()"
 *   (opened)="seedAddress()"
 *   (saved)="saveAddress()"
 * >
 *   <input editor pInputText [formControl]="addressControl" class="w-full" />
 * </app-inplace-field>
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inplace-field',
  imports: [ButtonModule, InplaceModule],
  templateUrl: './inplace-field.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InplaceField {
  //#region Inputs
  /**
   * Property label
   * @readonly
   *
   * @description
   * Name of the property, already localized.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly label: InputSignal<string> = input.required<string>();

  /**
   * Property display
   * @readonly
   *
   * @description
   * The value as it reads when the field is closed. An empty value falls back
   * to {@link emptyLabel}, so a blank property still says it is blank rather
   * than leaving a gap.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null | undefined>}
   */
  public readonly display: InputSignal<string | null | undefined> = input<string | null>();

  /**
   * Property emptyLabel
   * @readonly
   *
   * @description
   * What an unset property reads as.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly emptyLabel: InputSignal<string> = input<string>(
    $localize`:@@common.notProvided:Not provided`,
  );

  /**
   * Property editable
   * @readonly
   *
   * @description
   * Whether the property may be changed at all. A read-only field renders its
   * value as plain text with no affordance, rather than a control that refuses.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly editable: InputSignal<boolean> = input<boolean>(true);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Whether a save is in flight. Both affordances lock while it is.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Validation or save failure to show under the control. The field stays open
   * while it is set, so the operator can correct without reopening.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Property opened
   * @readonly
   *
   * @description
   * The field entered edit mode; the host seeds its control here.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly opened: OutputEmitterRef<void> = output<void>();

  /**
   * Property saved
   * @readonly
   *
   * @description
   * The operator confirmed; the host reads its control and calls the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly saved: OutputEmitterRef<void> = output<void>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * The operator backed out, by button or by Escape.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property inplace
   * @readonly
   *
   * @description
   * The PrimeNG toggle, so the shell can close it from its own affordances.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<Inplace>}
   */
  private readonly inplace: Signal<Inplace> = viewChild.required<Inplace>('inplace');

  /**
   * Property displayValue
   * @readonly
   *
   * @description
   * The value to render when closed, or the empty label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly displayValue: Signal<string> = computed<string>(() => {
    const value: string | null | undefined = this.display();

    return value ? value : this.emptyLabel();
  });

  /**
   * Property hasValue
   * @readonly
   *
   * @description
   * Whether the property is set, so an empty one can read as muted.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasValue: Signal<boolean> = computed<boolean>(() => Boolean(this.display()));

  /**
   * Property editHint
   * @readonly
   *
   * @description
   * Accessible name of the closed field, so a screen reader hears what
   * activating it does rather than only the value.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly editHint: Signal<string> = computed<string>(
    () => $localize`:@@common.editField:Edit ${this.label()}:field:`,
  );
  //#endregion

  //#region Methods
  /**
   * Method onActivate
   *
   * @description
   * Lets the host seed its control as the field opens.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onActivate(): void {
    this.opened.emit();
  }

  /**
   * Method onSave
   *
   * @description
   * Asks the host to persist. The field is left open on purpose: only the host
   * knows whether the call succeeded, and it closes the field by clearing its
   * own editing state — a field that closed itself would hide a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onSave(): void {
    this.saved.emit();
  }

  /**
   * Method onCancel
   *
   * @description
   * Closes without saving, discarding the draft.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onCancel(): void {
    this.inplace().deactivate();
    this.cancelled.emit();
  }

  /**
   * Method close
   *
   * @description
   * Closes the field from the host, once a save has actually landed.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public close(): void {
    this.inplace().deactivate();
  }
  //#endregion
}
