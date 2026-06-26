import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule, type SelectButtonChangeEvent } from 'primeng/selectbutton';
import { forkJoin } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { OnboardingStore } from '@features/onboarding/state';
import { BillingService, PlanService } from '@features/organization/data-access';
import type {
  BillingInterval,
  CheckoutSessionOutput,
  PlanOutput,
  PlanPricingOutput,
} from '@features/organization/models';
import { OnboardingStepBase } from '../onboarding-step.base';

/**
 * Interface IntervalOption
 *
 * @description
 * One entry of the monthly/yearly billing-cadence toggle.
 */
interface IntervalOption {
  readonly label: string;
  readonly value: BillingInterval;
}

/**
 * Component SelectPlanStep
 * @class SelectPlanStep
 *
 * @description
 * Onboarding step proposing a subscription plan for the freshly created
 * organization. Lists the available plans with their quotas and price; choosing a
 * paid plan opens hosted Stripe Checkout (the webhook applies it), while the free
 * plan simply confirms the step. The step is optional — the wizard footer offers
 * "Skip for now". On return from Checkout (`?checkout=success`) the step confirms
 * itself so the flow advances.
 *
 * Reuses the organization-owned, root-provided {@link PlanService} and
 * {@link BillingService} directly (the org feature stores are route-scoped to the
 * dashboard and are not available on the focused onboarding route).
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-select-plan-step',
  imports: [ButtonModule, SelectButtonModule, FormsModule],
  templateUrl: './select-plan-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectPlanStep extends OnboardingStepBase {
  //#region Dependencies
  protected readonly onboardingStore: OnboardingStore = inject<OnboardingStore>(OnboardingStore);
  private readonly planService: PlanService = inject<PlanService>(PlanService);
  private readonly billingService: BillingService = inject<BillingService>(BillingService);
  private readonly messageService: MessageService = inject<MessageService>(MessageService);
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  private readonly router: Router = inject<Router>(Router);
  private readonly documentRef: Document = inject<Document>(DOCUMENT);
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);
  //#endregion

  //#region State
  /** Available subscription plans. */
  protected readonly plans: WritableSignal<readonly PlanOutput[]> = signal<readonly PlanOutput[]>(
    [],
  );

  /** Display pricing of every payable plan. */
  protected readonly pricing: WritableSignal<readonly PlanPricingOutput[]> = signal<
    readonly PlanPricingOutput[]
  >([]);

  /** Whether the plan catalog is loading. */
  protected readonly isLoadingCatalog: WritableSignal<boolean> = signal<boolean>(true);

  /** Whether the plan catalog failed to load. */
  protected readonly catalogError: WritableSignal<boolean> = signal<boolean>(false);

  /** Key of the plan whose checkout is being started, for per-card feedback. */
  protected readonly pendingPlanKey: WritableSignal<string | null> = signal<string | null>(null);

  /** Selected billing cadence for paid plans. */
  protected readonly interval: WritableSignal<BillingInterval> = signal<BillingInterval>('month');

  /** Options of the cadence toggle (mutable array required by p-selectButton). */
  protected readonly intervalOptions: IntervalOption[] = [
    { label: $localize`:@@org.plan.monthly:Monthly`, value: 'month' },
    { label: $localize`:@@org.plan.yearly:Yearly`, value: 'year' },
  ];

  /** Whether confirming the onboarding step is in flight. */
  protected readonly isExecuting: Signal<boolean> = this.onboardingStore.isExecutingStep;

  /** Display pricing indexed by plan key. */
  protected readonly pricingByKey: Signal<ReadonlyMap<string, PlanPricingOutput>> = computed<
    ReadonlyMap<string, PlanPricingOutput>
  >(() => new Map(this.pricing().map((pricing) => [pricing.planKey, pricing])));

  //#endregion

  //#region Constructor
  /**
   * @constructor
   *
   * @description
   * Loads the plan catalog and pricing, then handles a return from Stripe Checkout.
   */
  public constructor() {
    super();
    this.loadCatalog();
    this.handleCheckoutReturn();
  }
  //#endregion

  //#region Methods
  /**
   * Method isPaidPlan
   *
   * @description
   * Returns whether the plan has configured Stripe pricing.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {PlanOutput} plan - Plan to evaluate.
   * @returns {boolean} `true` when the plan is payable.
   */
  protected isPaidPlan(plan: PlanOutput): boolean {
    return this.pricingByKey().has(plan.key);
  }

  /**
   * Method priceLabel
   *
   * @description
   * Returns the formatted price of a plan for the selected cadence, or null.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {PlanOutput} plan - Plan to price.
   * @returns {string | null} The formatted price, or null for free/unconfigured plans.
   */
  protected priceLabel(plan: PlanOutput): string | null {
    const pricing: PlanPricingOutput | undefined = this.pricingByKey().get(plan.key);
    if (pricing === undefined) {
      return null;
    }

    const amount: number | null | undefined =
      this.interval() === 'month' ? pricing.monthlyAmount : pricing.yearlyAmount;
    if (amount === null || amount === undefined) {
      return null;
    }

    const formatted: string = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: pricing.currency,
      maximumFractionDigits: 2,
    }).format(amount / 100);

    return `${formatted}${this.interval() === 'month' ? '/mo' : '/yr'}`;
  }

  /**
   * Method onIntervalChange
   *
   * @description
   * Updates the selected billing cadence.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {SelectButtonChangeEvent} event - The toggle change event.
   * @returns {void}
   */
  protected onIntervalChange(event: SelectButtonChangeEvent): void {
    if (event.value === 'month' || event.value === 'year') {
      this.interval.set(event.value);
    }
  }

  /**
   * Method choosePlan
   *
   * @description
   * Subscribes to a paid plan via hosted Checkout, or confirms the step for the
   * free plan (a new organization already defaults to it).
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {PlanOutput} plan - The selected plan.
   * @returns {void}
   */
  protected choosePlan(plan: PlanOutput): void {
    if (this.onboardingStore.isBusy() || this.pendingPlanKey() !== null) {
      return;
    }

    if (!this.isPaidPlan(plan)) {
      this.confirmStep();
      return;
    }

    const organizationId: string | null = this.onboardingStore.targetOrganizationId();
    if (organizationId === null) {
      return;
    }

    this.pendingPlanKey.set(plan.key);
    this.billingService
      .createCheckoutSession(organizationId, { planKey: plan.key, interval: this.interval() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (session: CheckoutSessionOutput) => {
          this.documentRef.defaultView?.location.assign(session.url);
        },
        error: () => {
          this.pendingPlanKey.set(null);
          this.messageService.add({
            severity: 'error',
            summary: $localize`:@@common.error:Error`,
            detail: $localize`:@@onboarding.plan.checkoutError:We couldn't start the checkout. Please try again.`,
            life: 5000,
          });
        },
      });
  }

  /**
   * Method retryLoad
   *
   * @description
   * Retries loading the plan catalog after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryLoad(): void {
    this.loadCatalog();
  }

  /**
   * Method confirmStep
   *
   * @description
   * Executes the `select_plan` onboarding step when it is still the active step.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private confirmStep(): void {
    if (this.onboardingStore.activeStepIndex() === this.stepIndex()) {
      this.onboardingStore.executeStep({ stepKey: 'select_plan' });
    }
  }

  /**
   * Method loadCatalog
   *
   * @description
   * Loads the plan catalog and pricing in parallel.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private loadCatalog(): void {
    this.isLoadingCatalog.set(true);
    this.catalogError.set(false);

    forkJoin({
      plans: this.planService.listAvailable(),
      pricing: this.billingService.getPricing(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({
          plans,
          pricing,
        }: {
          plans: HydraCollection<PlanOutput>;
          pricing: HydraCollection<PlanPricingOutput>;
        }) => {
          this.plans.set(plans.member);
          this.pricing.set(pricing.member);
          this.isLoadingCatalog.set(false);
        },
        error: () => {
          this.isLoadingCatalog.set(false);
          this.catalogError.set(true);
        },
      });
  }

  /**
   * Method handleCheckoutReturn
   *
   * @description
   * Confirms the step when the user returns from a successful Stripe Checkout
   * (`?checkout=success`) and clears the marker from the URL.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private handleCheckoutReturn(): void {
    const outcome: string | null = this.route.snapshot.queryParamMap.get('checkout');
    if (outcome === null) {
      return;
    }

    if (outcome === 'success') {
      this.messageService.add({
        severity: 'success',
        summary: $localize`:@@onboarding.plan.subscribedSummary:Subscription started`,
        detail: $localize`:@@onboarding.plan.subscribedDetail:Your subscription is being activated — it may take a few seconds.`,
        life: 5000,
      });
      this.confirmStep();
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { checkout: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  //#endregion
}
