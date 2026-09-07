import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { form, FormField, required, type FieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck } from '@ng-icons/lucide';
import { OnboardingStepFooter } from '@features/onboarding/ui/components';
import type { PlanOutput, PlanPricingOutput, PlanQuotaOutput } from '@features/organization/models';
import { HlmBadge } from '@shared/ui/badge';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmRadioGroupImports } from '@shared/ui/radio-group';
import { HlmSeparator } from '@shared/ui/separator';
import type { OnboardingPlanDraft, OnboardingPlanSelection } from './models';

/** A blank draft. */
const EMPTY_VALUES: OnboardingPlanDraft = { planKey: '' };

/**
 * Interface OnboardingPlanRow
 * @interface OnboardingPlanRow
 *
 * @description
 * A plan joined with its monthly price, ready for the radio list.
 *
 * @since 1.0.0
 */
interface OnboardingPlanRow {
  readonly key: string;
  readonly name: string;
  readonly description: string | null;
  readonly priceLabel: string;
  readonly pricingState: 'free' | 'priced' | 'unavailable';
  readonly isDefault: boolean;
  /**
   * Property quotas
   * @readonly
   * @description Billing-provided allowance summaries for this offer.
   * @access public
   * @since 1.0.0
   * @type {readonly PlanQuotaOutput[]}
   */
  readonly quotas: readonly PlanQuotaOutput[];
}

/**
 * Function priceLabelOf
 * @description Distinguishes the explicit Free offer from commercial monthly pricing, including zero-priced commercial offers.
 * @access private
 * @since 1.1.0
 * @param {PlanOutput} plan - The catalog offer.
 * @param {readonly PlanPricingOutput[]} pricing - The authoritative billing prices.
 * @param {string} localeId - The active locale.
 * @returns {{ label: string; state: 'free' | 'priced' | 'unavailable' }} The display price and eligibility.
 */
function priceLabelOf(
  plan: PlanOutput,
  pricing: readonly PlanPricingOutput[],
  localeId: string,
): { label: string; state: 'free' | 'priced' | 'unavailable' } {
  if (plan.key === 'free') {
    return { label: $localize`:@@onboarding.planForm.free:Free`, state: 'free' };
  }
  const entry = pricing.find((price) => price.planKey === plan.key);
  const amount = entry?.monthlyAmount;
  if (
    entry === undefined ||
    amount === null ||
    amount === undefined ||
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    return {
      label: $localize`:@@onboarding.planForm.unavailable:Monthly price unavailable`,
      state: 'unavailable',
    };
  }
  const formatted = new Intl.NumberFormat(localeId, {
    style: 'currency',
    currency: entry.currency,
  }).format(amount / 100);
  return {
    label: $localize`:@@onboarding.planForm.perMonth:${formatted}:price:/month`,
    state: 'priced',
  };
}

/**
 * Component OnboardingPlanForm
 * @class OnboardingPlanForm
 *
 * @description
 * The `select_plan` wizard step: a radio list of plan cards, each priced
 * from the billing pricing catalog, with the catalog's default plan
 * pre-selected and marked "Current plan" — a new organization already sits
 * on it, so confirming without touching anything is a truthful choice. The
 * primary action names where it leads: "Confirm plan" for a free plan,
 * "Continue to payment" for a priced one. The wizard proposes monthly
 * billing only — no yearly toggle — a deliberate scope cut recorded in
 * `FEATURE.md` "Deferred".
 *
 * It owns its model and its one rule, and emits {@link submitted} with
 * enough information for the wizard page to decide whether it must start a
 * Stripe Checkout session (paid plan) or simply confirm the step (free
 * plan) — the form itself never talks to `BillingService`
 * (`ARCHITECTURE.md` §10.4).
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-onboarding-plan-form [plans]="plans()" [pricing]="pricing()" (submitted)="selectPlan($event)" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-onboarding-plan-form',
  imports: [
    FormField,
    NgIcon,
    HlmSeparator,
    HlmBadge,
    OnboardingStepFooter,
    ...HlmFieldImports,
    ...HlmRadioGroupImports,
  ],
  providers: [provideIcons({ lucideCheck })],
  templateUrl: './onboarding-plan-form.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPlanForm {
  //#region Inputs
  /**
   * Property plans
   * @readonly
   * @description The selectable subscription plans. Empty until the page loads them.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly PlanOutput[]>}
   */
  public readonly plans: InputSignal<readonly PlanOutput[]> = input<readonly PlanOutput[]>([]);

  /**
   * Property pricing
   * @readonly
   * @description Display pricing for the payable plans. Empty until the page loads it.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly PlanPricingOutput[]>}
   */
  public readonly pricing: InputSignal<readonly PlanPricingOutput[]> = input<
    readonly PlanPricingOutput[]
  >([]);

  /**
   * Property pending
   * @readonly
   * @description Whether the choice is being confirmed, which locks the controls.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly pending: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property skippable
   * @readonly
   * @description Whether the backend currently lets this step be skipped, which renders the footer's skip control.
   * @access public
   * @since 1.1.0
   * @type {InputSignal<boolean>}
   */
  public readonly skippable: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Property submitted
   * @readonly
   * @description Emits the chosen plan once one is picked.
   * @access public
   * @since 1.0.0
   * @type {OutputEmitterRef<OnboardingPlanSelection>}
   */
  public readonly submitted: OutputEmitterRef<OnboardingPlanSelection> =
    output<OnboardingPlanSelection>();

  /**
   * Property skipped
   * @readonly
   * @description Relays the footer's skip request to the page.
   * @access public
   * @since 1.1.0
   * @type {OutputEmitterRef<void>}
   */
  public readonly skipped: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Properties
  /**
   * Property localeId
   * @readonly
   * @description The active Angular locale, used to format each row's price.
   * @access private
   * @since 1.0.0
   * @type {string}
   */
  private readonly localeId: string = inject<string>(LOCALE_ID);

  /** The edited draft. */
  protected readonly model: WritableSignal<OnboardingPlanDraft> =
    signal<OnboardingPlanDraft>(EMPTY_VALUES);

  /**
   * Property planForm
   * @readonly
   * @description The field tree and its one rule.
   * @access protected
   * @since 1.0.0
   * @type {FieldTree<OnboardingPlanDraft>}
   */
  protected readonly planForm: FieldTree<OnboardingPlanDraft> = form(this.model, (path) => {
    required(path.planKey, {
      message: $localize`:@@onboarding.planForm.required:Choose a plan to continue.`,
    });
  });

  /**
   * Property rows
   * @readonly
   * @description Each plan joined with its formatted monthly price.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly OnboardingPlanRow[]>}
   */
  protected readonly rows: Signal<readonly OnboardingPlanRow[]> = computed<
    readonly OnboardingPlanRow[]
  >(() =>
    this.plans().map((plan: PlanOutput): OnboardingPlanRow => {
      const price = priceLabelOf(plan, this.pricing(), this.localeId);

      return {
        key: plan.key,
        name: plan.name,
        description: plan.description ?? null,
        priceLabel: price.label,
        pricingState: price.state,
        isDefault: plan.isDefault,
        quotas: plan.quotas,
      };
    }),
  );

  /**
   * Property selectedKey
   * @readonly
   * @description The picked plan's key, driving the card's selected ring.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly selectedKey: Signal<string> = computed<string>(() => this.model().planKey);

  /**
   * Property submitLabel
   * @readonly
   * @description Names where the primary action leads: Checkout for a priced plan, a plain confirmation otherwise.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly submitLabel: Signal<string> = computed<string>(() => {
    const row: OnboardingPlanRow | undefined = this.rows().find(
      (r) => r.key === this.selectedKey(),
    );

    return row?.pricingState === 'priced'
      ? $localize`:@@onboarding.planForm.submitPayment:Continue to payment`
      : $localize`:@@onboarding.planForm.submit:Confirm plan`;
  });

  /**
   * Property unavailableReason
   * @readonly
   * @description Blocks an offer whose monthly billing price became unavailable after selection.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string | null>}
   */
  protected readonly unavailableReason: Signal<string | null> = computed(() =>
    this.rows().find((row) => row.key === this.selectedKey())?.pricingState === 'unavailable'
      ? $localize`:@@onboarding.planForm.unavailable:Monthly price unavailable`
      : null,
  );

  /** The footer's label while the choice is being confirmed. */
  protected readonly pendingLabel: string = $localize`:@@onboarding.planForm.submitting:Confirming…`;

  //#endregion

  //#region Lifecycle
  /**
   * Constructor
   * @constructor
   * @description Selects the catalog default once, preserving an explicit user choice.
   * @access public
   * @since 1.0.0
   */
  constructor() {
    effect(() => {
      const defaultPlan: PlanOutput | undefined = this.plans().find((plan) => plan.isDefault);
      if (defaultPlan === undefined || this.model().planKey !== '') return;
      this.model.update((draft) => ({ ...draft, planKey: defaultPlan.key }));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method submit
   *
   * @description
   * Marks the tree touched so the unmet rule shows, then emits when valid.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {Event} event - The submit event.
   *
   * @returns {void}
   */
  protected submit(event: Event): void {
    event.preventDefault();

    this.planForm().markAsTouched();

    if (this.planForm().invalid() || this.pending()) return;

    const draft: OnboardingPlanDraft = this.model();
    const row: OnboardingPlanRow | undefined = this.rows().find((r) => r.key === draft.planKey);
    if (row === undefined || row.pricingState === 'unavailable') return;

    this.submitted.emit({
      planKey: row.key,
      interval: 'month',
      pricingState: row.pricingState,
    });
  }
  //#endregion
}
