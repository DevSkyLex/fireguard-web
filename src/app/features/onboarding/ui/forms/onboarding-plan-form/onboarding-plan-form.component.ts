import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { toServerFieldErrors, toUnmatchedViolations, type Violation } from '@core/api';
import { storeErrorMessage } from '@features/onboarding/utils';
import type { PlanOutput, PlanPricingOutput } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmFieldImports } from '@shared/ui/field';
import { HlmLabel } from '@shared/ui/label';
import { HlmRadioGroupImports } from '@shared/ui/radio-group';
import type { OnboardingPlanDraft, OnboardingPlanSelection } from './models';

/** A blank draft. */
const EMPTY_VALUES: OnboardingPlanDraft = { planKey: '' };

/**
 * Interface OnboardingPlanRow
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
  readonly requiresPayment: boolean;
}

/**
 * Function priceLabelOf
 *
 * @description
 * Formats a plan's monthly price from the pricing catalog, or the localized
 * "Free" label when the plan carries no priced entry or a zero amount.
 * Formats against the app's own `LOCALE_ID` rather than `Intl`'s runtime
 * default — the latter reads the host OS/ICU locale, which drifts between a
 * developer machine, CI, and production and made this format
 * environment-dependent.
 *
 * @param {PlanOutput} plan - The catalog plan.
 * @param {readonly PlanPricingOutput[]} pricing - The pricing catalog.
 * @param {string} localeId - The active Angular locale.
 *
 * @returns {{ readonly label: string; readonly requiresPayment: boolean }} The formatted price and whether it is payable.
 */
function priceLabelOf(
  plan: PlanOutput,
  pricing: readonly PlanPricingOutput[],
  localeId: string,
): { readonly label: string; readonly requiresPayment: boolean } {
  const entry: PlanPricingOutput | undefined = pricing.find((p) => p.planKey === plan.key);
  const amount: number | null | undefined = entry?.monthlyAmount;

  if (entry === undefined || amount === null || amount === undefined || amount === 0) {
    return { label: $localize`:@@onboarding.planForm.free:Free`, requiresPayment: false };
  }

  const formatted: string = new Intl.NumberFormat(localeId, {
    style: 'currency',
    currency: entry.currency,
  }).format(amount / 100);

  return {
    label: $localize`:@@onboarding.planForm.perMonth:${formatted}:price:/month`,
    requiresPayment: true,
  };
}

/**
 * Component OnboardingPlanForm
 * @class OnboardingPlanForm
 *
 * @description
 * The `select_plan` wizard step: a radio list of the plan catalog, each row
 * priced from the billing pricing catalog. The wizard proposes monthly
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
  imports: [FormField, HlmButton, HlmLabel, ...HlmFieldImports, ...HlmRadioGroupImports],
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
   * Property serverError
   * @readonly
   * @description Whatever confirming the choice failed with.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<unknown>}
   */
  public readonly serverError: InputSignal<unknown> = input<unknown>(null);
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
        requiresPayment: price.requiresPayment,
      };
    }),
  );

  /**
   * Property serverMessages
   * @readonly
   * @description Everything the API said about the rejected confirmation, as flat lines above the form.
   * @access protected
   * @since 1.0.0
   * @type {Signal<readonly string[]>}
   */
  protected readonly serverMessages: Signal<readonly string[]> = computed<readonly string[]>(() => {
    const error: unknown = this.serverError();

    if (error === null || error === undefined) return [];

    const combined: readonly string[] = [
      ...new Set([
        ...Object.values(toServerFieldErrors(error)),
        ...toUnmatchedViolations(error, []).map((v: Violation): string => v.message),
      ]),
    ];

    if (combined.length > 0) return combined;

    const storeMessage: string | null = storeErrorMessage(error);

    return storeMessage !== null
      ? [storeMessage]
      : [$localize`:@@onboarding.planForm.confirmFailed:The plan could not be confirmed.`];
  });
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
    if (row === undefined) return;

    this.submitted.emit({
      planKey: row.key,
      interval: 'month',
      requiresPayment: row.requiresPayment,
    });
  }
  //#endregion
}
