import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  LOCALE_ID,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleAlert } from '@ng-icons/lucide';
import type { StoreError } from '@core/request-state';
import type {
  CreateMaintenanceRateInput,
  MaintenanceCurrencyOutput,
  MaintenanceRateOutput,
} from '@features/organization/features/maintenance-costs/models';
import { MaintenanceCurrencyForm } from '@features/organization/features/maintenance-costs/ui/forms/maintenance-currency-form';
import { MaintenanceRateForm } from '@features/organization/features/maintenance-costs/ui/forms/maintenance-rate-form';
import { formatMaintenanceAmount } from '@features/organization/features/maintenance-costs/utils';
import type { MemberSelectOption } from '@features/organization/models';
import { CollectionPagination } from '@shared/collection-pagination';
import { OrgDatePipe } from '@shared/regional-format';
import { StateIllustration } from '@shared/state-illustration';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSpinner } from '@shared/ui/spinner';
import { HlmTableImports } from '@shared/ui/table';

/**
 * Class MaintenanceCostSettings
 * @class MaintenanceCostSettings
 *
 * @description
 * Presents the currency lock and immutable dated rates; the parent owns permissions and writes.
 */
@Component({
  selector: 'app-maintenance-cost-settings',
  templateUrl: './maintenance-cost-settings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MaintenanceCurrencyForm,
    MaintenanceRateForm,
    NgIcon,
    CollectionPagination,
    OrgDatePipe,
    StateIllustration,
    HlmBadge,
    HlmButton,
    HlmSpinner,
    ...HlmAlertImports,
    ...HlmCardImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
  ],
  providers: [provideIcons({ lucideCircleAlert })],
})
export class MaintenanceCostSettings {
  //#region Properties
  /**
   * Property locale
   * @readonly
   *
   * @description
   * Interface locale used to group exact financial strings without numeric conversion.
   *
   * @access private
   * @since 2026-10-06
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property currency
   * @readonly
   *
   * @description
   * Last confirmed organization currency and lock.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<MaintenanceCurrencyOutput | null>}
   */
  public readonly currency: InputSignal<MaintenanceCurrencyOutput | null> =
    input<MaintenanceCurrencyOutput | null>(null);

  /**
   * Property currencyPending
   * @readonly
   *
   * @description
   * Independent currency read is in flight.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly currencyPending: InputSignal<boolean> = input(false);

  /**
   * Property currencyError
   * @readonly
   *
   * @description
   * Currency read failure remains locally retryable.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly currencyError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property currencySaving
   * @readonly
   *
   * @description
   * Currency write locks the edit form independently of rate writes.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly currencySaving: InputSignal<boolean> = input(false);

  /**
   * Property currencyWriteError
   * @readonly
   *
   * @description
   * Rejected currency save is shown beside its retained draft.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly currencyWriteError: InputSignal<StoreError | null> = input<StoreError | null>(
    null,
  );

  /**
   * Property rates
   * @readonly
   *
   * @description
   * Confirmed immutable rows in the current server page.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<readonly MaintenanceRateOutput[]>}
   */
  public readonly rates: InputSignal<readonly MaintenanceRateOutput[]> = input<
    readonly MaintenanceRateOutput[]
  >([]);

  /**
   * Property ratesPending
   * @readonly
   *
   * @description
   * Rate history read retains existing rows during refresh.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly ratesPending: InputSignal<boolean> = input(false);

  /**
   * Property ratesError
   * @readonly
   *
   * @description
   * Rate history read failure has its own retry action.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly ratesError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property ratesSaving
   * @readonly
   *
   * @description
   * Rate submission freezes the currently submitted draft.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly ratesSaving: InputSignal<boolean> = input(false);

  /**
   * Property ratesWriteError
   * @readonly
   *
   * @description
   * Rate write failure retains the original form fields and declaration.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<StoreError | null>}
   */
  public readonly ratesWriteError: InputSignal<StoreError | null> = input<StoreError | null>(null);

  /**
   * Property canManage
   * @readonly
   *
   * @description
   * Effective financial management permission; never derived from organization profile.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly canManage: InputSignal<boolean> = input(false);

  /**
   * Property members
   * @readonly
   *
   * @description
   * Authorized human member options supplied by the page.
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
   * Directory loading prevents creating a rate with stale options.
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
   * Directory permission gates names and rate member selection.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly membersAllowed: InputSignal<boolean> = input(false);

  /**
   * Property ratePage
   * @readonly
   *
   * @description
   * Current one-based server rate page.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<number>}
   */
  public readonly ratePage: InputSignal<number> = input(1);

  /**
   * Property rateTotal
   * @readonly
   *
   * @description
   * Exact server total rather than current page length.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<number>}
   */
  public readonly rateTotal: InputSignal<number> = input(0);

  /**
   * Property ratePageSize
   * @readonly
   *
   * @description
   * Server page size supplied by the page; the standard request size is thirty rows.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<number>}
   */
  public readonly ratePageSize: InputSignal<number> = input(30);

  /**
   * Property uncertainRate
   * @readonly
   *
   * @description
   * Only the original stored declaration may be replayed until its outcome is confirmed.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<boolean>}
   */
  public readonly uncertainRate: InputSignal<boolean> = input(false);

  /**
   * Property currencyResetToken
   * @readonly
   *
   * @description
   * Explicit confirmed currency-save reset or organization context replacement.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<number>}
   */
  public readonly currencyResetToken: InputSignal<number> = input(0);

  /**
   * Property rateResetToken
   * @readonly
   *
   * @description
   * Explicit confirmed rate-save reset or organization context replacement.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {InputSignal<number>}
   */
  public readonly rateResetToken: InputSignal<number> = input(0);

  /**
   * Property currencySubmitted
   * @readonly
   *
   * @description
   * Forwards an exact uppercase currency code for an authorized write.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly currencySubmitted: OutputEmitterRef<string> = output<string>();

  /**
   * Property rateSubmitted
   * @readonly
   *
   * @description
   * Forwards rate data without generating the store-owned idempotency key.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<Omit<CreateMaintenanceRateInput, 'clientId'>>}
   */
  public readonly rateSubmitted: OutputEmitterRef<Omit<CreateMaintenanceRateInput, 'clientId'>> =
    output<Omit<CreateMaintenanceRateInput, 'clientId'>>();

  /**
   * Property reloadCurrency
   * @readonly
   *
   * @description
   * Requests only a currency read refresh.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly reloadCurrency: OutputEmitterRef<void> = output<void>();

  /**
   * Property reloadRates
   * @readonly
   *
   * @description
   * Requests only a rate history refresh.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly reloadRates: OutputEmitterRef<void> = output<void>();

  /**
   * Property ratePageChanged
   * @readonly
   *
   * @description
   * Requests a bounded server page while preserving its total and query scope.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<number>}
   */
  public readonly ratePageChanged: OutputEmitterRef<number> = output<number>();

  /**
   * Property retryRate
   * @readonly
   *
   * @description
   * Requests replay of the original rate identity and payload.
   *
   * @access public
   * @since 2026-10-06
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly retryRate: OutputEmitterRef<void> = output<void>();

  /**
   * Property ratePageCount
   * @readonly
   *
   * @description
   * Computes page count from the exact server total and explicit page size.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {Signal<number>}
   */
  protected readonly ratePageCount: Signal<number> = computed(() =>
    Math.max(1, Math.ceil(this.rateTotal() / Math.max(1, this.ratePageSize()))),
  );

  /**
   * Property readErrorFallback
   * @readonly
   *
   * @description
   * Localized retry guidance when a read failure contains no readable message.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @type {string}
   */
  protected readonly readErrorFallback: string = $localize`:@@maintenanceCost.settings.readError:Try loading this information again.`;
  //#endregion

  //#region Methods
  /**
   * Method memberName
   * @method memberName
   *
   * @description
   * Resolves permitted human names without rendering raw member UUIDs as fallback.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @param {string} memberId - Historical member identity.
   *
   * @returns {string} Human name or neutral inaccessible-member label.
   */
  protected memberName(memberId: string): string {
    return (
      (this.membersAllowed()
        ? this.members().find((member: MemberSelectOption) => member.value === memberId)
            ?.displayName
        : null) || $localize`:@@maintenanceCost.rate.memberUnavailable:Member details unavailable`
    );
  }

  /**
   * Method changeRatePage
   * @method changeRatePage
   *
   * @description
   * Ignores paging during a pending read and validates the requested server range.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @param {number} page - Requested one-based page.
   *
   * @returns {void}
   */
  protected changeRatePage(page: number): void {
    if (
      !this.ratesPending() &&
      Number.isInteger(page) &&
      page >= 1 &&
      page <= this.ratePageCount() &&
      page !== this.ratePage()
    )
      this.ratePageChanged.emit(page);
  }

  /**
   * Method rateAmount
   * @method rateAmount
   *
   * @description
   * Formats a historical amount without losing any of its six supported decimal places.
   *
   * @access protected
   * @since 2026-10-06
   *
   * @param {MaintenanceRateOutput} rate - Confirmed immutable rate.
   *
   * @returns {string} Exact localized amount and currency.
   */
  protected rateAmount(rate: MaintenanceRateOutput): string {
    return formatMaintenanceAmount(rate.hourlyAmount, rate.currency, this.locale);
  }
  //#endregion
}
