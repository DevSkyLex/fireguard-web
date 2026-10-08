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
import type { CreateMaintenanceRateInput } from '@features/organization/features/maintenance-costs/models';
import { isMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import type { MemberSelectOption } from '@features/organization/models';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmInput } from '@shared/ui/input';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Class MaintenanceRateForm
 * @class MaintenanceRateForm
 *
 * @description
 * Appends a dated member rate, preserving exact amounts and uncertain declarations for owner
 * replay.
 */
@Component({
  selector: 'app-maintenance-rate-form',
  templateUrl: './maintenance-rate-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    NgIcon,
    HlmButton,
    HlmInput,
    HlmSpinner,
    ...HlmFieldImports,
    ...HlmAlertImports,
    ...HlmSelectImports,
  ],
  providers: [provideIcons({ lucideCircleAlert })],
})
export class MaintenanceRateForm {
  //#region Properties
  /**
   * Property members
   * @readonly
   *
   * @description
   * Authorized human choices whose values are organization member ids.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<readonly MemberSelectOption[]>}
   */
  public readonly members: InputSignal<readonly MemberSelectOption[]> = input<
    readonly MemberSelectOption[]
  >([]);

  /**
   * Property membersLoading
   * @readonly
   *
   * @description
   * Locks the picker while the owner refreshes available members.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly membersLoading: InputSignal<boolean> = input(false);

  /**
   * Property membersAllowed
   * @readonly
   *
   * @description
   * Permission to read the directory; false prevents choosing any member.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly membersAllowed: InputSignal<boolean> = input(false);

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Effective rate management permission supplied by the owner.
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
   * Accepted command freezes the complete submitted draft.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input(false);

  /**
   * Property uncertain
   * @readonly
   *
   * @description
   * Freezes editing until the original rate declaration is acknowledged by the owner.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly uncertain: InputSignal<boolean> = input(false);

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Confirmed currency displayed beside the exact hourly amount.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<string | null>}
   */
  public readonly currency: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property error
   * @readonly
   *
   * @description
   * Write failure retains all field values for correction or original replay.
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
   * Incremented only after confirmed success or context replacement, never a rejected write.
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
   * Exact transport values omit the operation identity, which belongs to the store.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<Omit<CreateMaintenanceRateInput, 'clientId'>>}
   */
  public readonly submitted: OutputEmitterRef<Omit<CreateMaintenanceRateInput, 'clientId'>> =
    output<Omit<CreateMaintenanceRateInput, 'clientId'>>();

  /**
   * Property retry
   * @readonly
   *
   * @description
   * Requests replay of the original store-owned identity and payload.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retry: OutputEmitterRef<void> = output<void>();

  /**
   * Property draft
   * @readonly
   *
   * @description
   * Amount and effective date are strings, without numeric or timezone coercion.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {WritableSignal<Omit<CreateMaintenanceRateInput, 'clientId'>>}
   */
  protected readonly draft: WritableSignal<Omit<CreateMaintenanceRateInput, 'clientId'>> = signal({
    memberId: '',
    hourlyAmount: '',
    effectiveFrom: '',
  });

  /**
   * Property errorFallback
   * @readonly
   *
   * @description
   * Localized whole-request failure explanation when the server supplies no message.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {string}
   */
  protected readonly errorFallback: string = $localize`:@@maintenanceCost.rate.saveError:Your rate draft is preserved. Try again when the request has settled.`;

  /**
   * Property memberLabel
   * @readonly
   *
   * @description
   * Resolves only permitted human labels, with no technical identifier fallback.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {(value: string) => string}
   */
  protected readonly memberLabel: (value: string) => string = (value: string): string =>
    this.membersAllowed()
      ? (this.members().find((member: MemberSelectOption) => member.value === value)?.displayName ??
        '')
      : '';

  /**
   * Property fields
   * @readonly
   *
   * @description
   * Validates authorized membership, exact decimals and a real date-only calendar value.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {FieldTree<Omit<CreateMaintenanceRateInput, 'clientId'>>}
   */
  protected readonly fields: FieldTree<Omit<CreateMaintenanceRateInput, 'clientId'>> = form(
    this.draft,
    (path) => {
      disabled(path, {
        when: () =>
          this.pending() ||
          this.uncertain() ||
          !this.canManage() ||
          !this.membersAllowed() ||
          this.membersLoading() ||
          !this.currency(),
      });
      validate(path.memberId, ({ value }) =>
        this.membersAllowed() &&
        this.members().some((member: MemberSelectOption) => member.value === value())
          ? null
          : {
              kind: 'member',
              message: $localize`:@@maintenanceCost.rate.memberRequired:Choose an available organization member.`,
            },
      );
      validate(path.hourlyAmount, ({ value }) =>
        isMaintenanceAmount(value())
          ? null
          : {
              kind: 'amount',
              message: $localize`:@@maintenanceCost.rate.amountInvalid:Enter a nonnegative amount with no more than six decimal places, using a decimal point.`,
            },
      );
      validate(path.effectiveFrom, ({ value }) =>
        this.validDate(value())
          ? null
          : {
              kind: 'date',
              message: $localize`:@@maintenanceCost.rate.dateRequired:Choose a valid effective date.`,
            },
      );
    },
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Clears fields exclusively when the caller acknowledges a successful submission.
   *
   * @access public
   * @since 2026-10-06
   */
  public constructor() {
    effect(() => {
      this.resetToken();
      untracked(() => this.fields().reset({ memberId: '', hourlyAmount: '', effectiveFrom: '' }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method validDate
   * @method validDate
   *
   * @description
   * Validates a calendar date arithmetically without parsing an instant or converting timezones.
   *
   * @access private
   * @since 2026-10-06
   *
   * @param {string} value - Bare calendar date.
   *
   * @returns {boolean} Whether the date is real and uses YYYY-MM-DD.
   */
  private validDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const year: number = Number(value.slice(0, 4));
    const month: number = Number(value.slice(5, 7));
    const day: number = Number(value.slice(8, 10));
    if (year < 1 || month < 1 || month > 12 || day < 1) return false;
    const leap: boolean = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days: readonly number[] = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return day <= days[month - 1];
  }

  /**
   * Method submit
   * @method submit
   *
   * @description
   * Emits the original strings only when the owner permits a fresh rate declaration.
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
    if (
      this.pending() ||
      this.uncertain() ||
      !this.canManage() ||
      !this.membersAllowed() ||
      this.membersLoading() ||
      !this.currency()
    )
      return;
    this.fields().markAsTouched();
    if (this.fields().invalid()) return;
    this.submitted.emit({ ...this.draft(), hourlyAmount: this.draft().hourlyAmount.trim() });
  }

  /**
   * Method retryOriginal
   * @method retryOriginal
   *
   * @description
   * Emits only replay intent; no new identity or changed draft is submitted.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @returns {void}
   */
  protected retryOriginal(): void {
    if (this.canManage() && this.uncertain() && !this.pending()) this.retry.emit();
  }
  //#endregion
}
