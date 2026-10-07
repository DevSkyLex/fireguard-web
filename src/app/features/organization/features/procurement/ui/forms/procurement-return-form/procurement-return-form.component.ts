import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  disabled,
  form,
  FormField,
  maxLength,
  required,
  validate,
  type FieldTree,
} from '@angular/forms/signals';
import type {
  ProcurementReceiptOutput,
  ReturnProcurementReceiptInput,
} from '@features/organization/features/procurement/models';
import {
  canonicalExactDecimal,
  exactDecimalDifference,
} from '@features/organization/features/procurement/utils';
import { isProcurementQuantity } from '@features/organization/features/procurement/validators';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTextarea } from '@shared/ui/textarea';
import type { ProcurementReturnDraft } from './models/procurement-return-draft.interface';

/**
 * Class ProcurementReturnForm
 * @class ProcurementReturnForm
 *
 * @description
 * Motivated physical return form linked to the original receipt and its exact quantities.
 */
@Component({
  selector: 'app-procurement-return-form',
  templateUrl: './procurement-return-form.component.html',
  imports: [
    FormField,
    HlmInput,
    HlmTextarea,
    HlmButton,
    HlmSpinner,
    ...HlmAlertImports,
    ...HlmFieldImports,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProcurementReturnForm {
  //#region Properties
  /**
   * Property receipt
   * @readonly
   *
   * @description
   * Retained source receipt, never replaced with a newly invented physical record.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<ProcurementReceiptOutput>}
   */
  public readonly receipt: InputSignal<ProcurementReceiptOutput> =
    input.required<ProcurementReceiptOutput>();

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Accepted or transport-uncertain writes lock the exact declaration.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Normalized server rejection.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | null>}
   */
  public readonly error: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Explicit motivated return with stable UUID assigned on its first submission.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<ReturnProcurementReceiptInput>}
   */
  public readonly submitted: OutputEmitterRef<ReturnProcurementReceiptInput> =
    output<ReturnProcurementReceiptInput>();

  /**
   * Property cancelled
   * @readonly
   *
   * @description
   * Controlled dismissal intent.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly cancelled: OutputEmitterRef<void> = output<void>();

  /**
   * Property dirtyChanged
   * @readonly
   *
   * @description
   * Actual native dirtiness for dismissal protection.
   *
   * @access public
   * @since unreleased
   *
   * @type {OutputEmitterRef<boolean>}
   */
  public readonly dirtyChanged: OutputEmitterRef<boolean> = output<boolean>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * No quantity is parsed through a floating-point value.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ProcurementReturnDraft>}
   */
  protected readonly draft: WritableSignal<ProcurementReturnDraft> = signal({
    quantity: '',
    reason: '',
  });

  /**
   * Property limit
   * @readonly
   *
   * @description
   * Local bound only; concurrent and insufficient stock checks remain server-owned.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly limit: Signal<string> = computed(() =>
    exactDecimalDifference(this.receipt().quantity, this.receipt().returnedQuantity),
  );

  /**
   * Property returnForm
   * @readonly
   *
   * @description
   * Native reason and quantity schema.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FieldTree<ProcurementReturnDraft>}
   */
  protected readonly returnForm: FieldTree<ProcurementReturnDraft> = form(this.draft, (path) => {
    disabled(path, () => this.pending());
    validate(path.quantity, ({ value }) =>
      isProcurementQuantity(value(), this.receipt().kind, this.limit())
        ? null
        : {
            kind: 'quantity',
            message: $localize`:@@procurement.return.quantityInvalid:Enter a positive quantity within the received units not already returned.`,
          },
    );
    required(path.reason, {
      message: $localize`:@@procurement.return.reasonRequired:Explain why the goods were returned.`,
    });
    validate(path.reason, ({ value }) =>
      value().trim()
        ? null
        : {
            kind: 'reason',
            message: $localize`:@@procurement.return.reasonRequired:Explain why the goods were returned.`,
          },
    );
    maxLength(path.reason, 2000);
  });

  /**
   * Property seededReceiptId
   *
   * @description
   * Seeding follows receipt identity, preserving drafts during revision refresh.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private seededReceiptId: string | null = null;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Resets only on a new physical source and reports native dirtiness.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      const id = this.receipt().id;
      if (id === this.seededReceiptId) return;
      this.seededReceiptId = id;
      untracked(() => this.returnForm().reset({ quantity: '', reason: '' }));
    });
    effect(() => {
      const dirty = this.returnForm().dirty();
      untracked(() => this.dirtyChanged.emit(dirty));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits one exact physical return without creating an implicit stock correction.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - Native form submission event.
   *
   * @returns {void} No return value; emits or updates the local draft only.
   */
  protected submit(event: Event): void {
    event.preventDefault();
    this.returnForm().markAsTouched();
    if (this.pending() || this.returnForm().invalid()) return;
    const draft: ProcurementReturnDraft = this.draft();
    const quantity: string | null = canonicalExactDecimal(draft.quantity);
    if (!quantity) return;
    this.submitted.emit({
      quantity,
      reason: draft.reason.trim(),
      clientOperationId: globalThis.crypto.randomUUID(),
    });
  }
  //#endregion
}
