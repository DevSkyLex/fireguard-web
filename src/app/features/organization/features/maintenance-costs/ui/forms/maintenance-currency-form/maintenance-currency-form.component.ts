import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { disabled, form, FormField, validate, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import type { MaintenanceCurrencyOutput } from '@features/organization/features/maintenance-costs/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Class MaintenanceCurrencyForm
 * @class MaintenanceCurrencyForm
 *
 * @description
 * Edits the exact organization currency before the server locks financial facts to it.
 */
@Component({
  selector: 'app-maintenance-currency-form',
  templateUrl: './maintenance-currency-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    NgIcon,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmFieldImports,
    ...HlmAlertImports,
  ],
  providers: [provideIcons({ lucideCircleAlert })],
})
export class MaintenanceCurrencyForm {
  //#region Properties
  /**
   * Property currency
   * @readonly
   *
   * @description
   * Last confirmed currency and server lock, never inferred from local costs.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<MaintenanceCurrencyOutput | null>}
   */
  public readonly currency: InputSignal<MaintenanceCurrencyOutput | null> =
    input<MaintenanceCurrencyOutput | null>(null);

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Effective permission supplied by the owner; false renders no edit form.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input(false);

  /**
   * Property pending
   * @readonly
   *
   * @description
   * Locks the current draft while its write is accepted.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Recoverable write failure, which never discards the draft.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly error: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property resetToken
   * @readonly
   *
   * @description
   * The owner increments this only after an acknowledged successful save or context reset.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<number>}
   */
  public readonly resetToken: InputSignal<number> = input(0);

  /**
   * Property submitted
   * @readonly
   *
   * @description
   * Emits an uppercase three-letter code without allocating operation identities.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly submitted: OutputEmitterRef<string> = output<string>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Local text remains intact after a rejected save or unrelated refresh.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {WritableSignal<{ currency: string }>}
   */
  protected readonly draft: WritableSignal<{ currency: string }> = signal({ currency: '' });

  /**
   * Property currencyErrorFallback
   * @readonly
   *
   * @description
   * Readable localized explanation when a rejected request has no message.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {string}
   */
  protected readonly currencyErrorFallback: string = $localize`:@@maintenanceCost.settings.currencySaveError:Your currency draft is preserved. Try saving again.`;

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Native field state enforces an exact uppercase code and the server lock.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {FieldTree<{ currency: string }>}
   */
  protected readonly fields: FieldTree<{ currency: string }> = form(this.draft, (path) => {
    disabled(path, () => this.pending() || !this.canManage() || !!this.currency()?.locked);
    validate(path.currency, ({ value }) =>
      /^[A-Z]{3}$/.test(value())
        ? null
        : {
            kind: 'currency',
            message: $localize`:@@maintenanceCost.settings.currencyRequired:Enter a three-letter uppercase currency code.`,
          },
    );
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Refreshes pristine fields and honors explicit successful resets without losing rejected edits.
   *
   * @access public
   * @since 2026-10-06
   */
  public constructor() {
    effect(() => {
      const currency: MaintenanceCurrencyOutput | null = this.currency();
      untracked(() => {
        if (!this.fields().dirty() || currency?.locked) {
          this.fields().reset({ currency: currency?.currency ?? '' });
        }
      });
    });
    effect(() => {
      this.resetToken();
      untracked(() => this.fields().reset({ currency: this.currency()?.currency ?? '' }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits only valid, authorized changes before any financial fact locks the currency.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @param {Event} event - Native submission event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();
    if (this.pending() || !this.canManage() || this.currency()?.locked) return;
    this.fields().markAsTouched();
    if (this.fields().invalid()) return;
    this.submitted.emit(this.draft().currency);
  }
  //#endregion
}
