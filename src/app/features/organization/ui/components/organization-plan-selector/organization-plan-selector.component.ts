import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type OnInit,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule, type SelectButtonChangeEvent } from 'primeng/selectbutton';
import { TagModule } from 'primeng/tag';
import {
  type BillingInterval,
  type OrganizationOutput,
  type PlanOutput,
  type PlanPricingOutput,
  resolveSubscriptionStatusTag,
} from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationBillingStore } from '@features/organization/state/organization-billing';
import { OrganizationPlanStore } from '@features/organization/state/organization-plan';
import { BillingInvoiceTable } from '@features/organization/ui/tables';
import { Tag, type TagDescriptor } from '@shared/components/tag';
import { BillingCancelCard } from './components/billing-cancel-card/billing-cancel-card.component';

/**
 * Type IntervalOption
 *
 * @description
 * One entry of the monthly/yearly billing-cadence toggle.
 *
 * @since 1.0.0
 */
interface IntervalOption {
  readonly label: string;
  readonly value: BillingInterval;
}

/**
 * Component OrganizationPlanSelector
 * @class OrganizationPlanSelector
 *
 * @description
 * Organization subscription selector rendered in the settings "Subscription"
 * tab. Lists the plans with their quota sentences and price for the selected
 * cadence, shows the current subscription status, and drives the Stripe flow:
 * paid plans open hosted Checkout, an active subscription is managed through the
 * hosted Billing Portal, and the free plan uses the direct self-service change.
 * On return from Stripe (`?checkout=success|cancel`) it surfaces a toast and
 * refreshes the subscription and quota meters.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-plan-selector',
  imports: [
    ButtonModule,
    MessageModule,
    TagModule,
    SelectButtonModule,
    FormsModule,
    Tag,
    BillingInvoiceTable,
    BillingCancelCard,
  ],
  providers: [OrganizationPlanStore, OrganizationBillingStore],
  templateUrl: './organization-plan-selector.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationPlanSelector implements OnInit {
  //#region Properties
  /** Active organization context store. */
  protected readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);
  /** Section-scoped plan catalog + free-plan change store. */
  protected readonly store: OrganizationPlanStore =
    inject<OrganizationPlanStore>(OrganizationPlanStore);
  /** Section-scoped Stripe billing store (pricing, subscription, checkout, portal). */
  protected readonly billingStore: OrganizationBillingStore =
    inject<OrganizationBillingStore>(OrganizationBillingStore);
  /** Root quota store, refreshed after a plan change. */
  private readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);
  /** PrimeNG message service used for change feedback. */
  private readonly messageService: MessageService = inject<MessageService>(MessageService);
  /** PrimeNG confirmation service used before canceling the subscription. */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);
  /** Active route used to read the checkout-return marker. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);
  /** Router used to strip the checkout-return marker from the URL. */
  private readonly router: Router = inject<Router>(Router);

  /** Selected billing cadence for paid plans. */
  protected readonly interval: WritableSignal<BillingInterval> = signal<BillingInterval>('month');

  /** Options of the cadence toggle (mutable array required by p-selectButton). */
  protected readonly intervalOptions: IntervalOption[] = [
    { label: $localize`:@@org.plan.monthly:Monthly`, value: 'month' },
    { label: $localize`:@@org.plan.yearly:Yearly`, value: 'year' },
  ];

  /**
   * Builds the localized "Switch to <plan>" button label.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} name - Plan name.
   * @returns {string} Localized button label.
   */
  protected switchToLabel(name: string): string {
    return $localize`:@@org.plan.switchTo:Switch to ${name}:name:`;
  }

  /** Identifier of the plan currently being switched to, for per-card feedback. */
  protected readonly pendingPlanId: WritableSignal<string | null> = signal<string | null>(null);

  /** Identifier of the organization's current plan. */
  protected readonly currentPlanId: Signal<string | null> = computed<string | null>(
    () => this.activeOrganizationStore.selectedOrganization()?.planId ?? null,
  );

  /** Display pricing indexed by plan key. */
  protected readonly pricingByKey: Signal<ReadonlyMap<string, PlanPricingOutput>> = computed<
    ReadonlyMap<string, PlanPricingOutput>
  >(() => new Map(this.billingStore.pricing().map((pricing) => [pricing.planKey, pricing])));

  /** Whether the organization has an access-granting subscription. */
  protected readonly hasActiveSubscription: Signal<boolean> = computed<boolean>(
    () => this.billingStore.subscription()?.active === true,
  );

  /** Resolved badge descriptor for the current subscription status. */
  protected readonly statusDescriptor: Signal<TagDescriptor | null> =
    computed<TagDescriptor | null>(() => {
      const status = this.billingStore.subscription()?.status;
      return status != null ? resolveSubscriptionStatusTag(status) : null;
    });

  /** Localized renewal date of the current billing period, when known. */
  protected readonly periodEndLabel: Signal<string | null> = computed<string | null>(() => {
    const iso = this.billingStore.subscription()?.currentPeriodEnd;
    return iso ? new Date(iso).toLocaleDateString() : null;
  });

  /** Whether the subscription is set to cancel at the end of the period. */
  protected readonly cancelScheduled: Signal<boolean> = computed<boolean>(
    () => this.billingStore.subscription()?.cancelAtPeriodEnd === true,
  );

  /** Whether any plan-change/billing action is in flight. */
  protected readonly isBusy: Signal<boolean> = computed<boolean>(
    () =>
      this.store.isChangingPlan() ||
      this.billingStore.isStartingCheckout() ||
      this.billingStore.isStartingPortal() ||
      this.billingStore.isCanceling() ||
      this.billingStore.isResuming(),
  );
  //#endregion

  //#region Methods
  /** Surfaces plan-change outcomes as toasts and clears the pending plan marker. */
  public constructor() {
    effect(() => {
      if (this.store.changePlanSucceeded()) {
        this.pendingPlanId.set(null);
        this.messageService.add({
          severity: 'success',
          summary: $localize`:@@org.plan.updatedSummary:Plan updated`,
          detail: $localize`:@@org.plan.updatedDetail:The organization subscription plan has been updated.`,
        });
      }
    });

    effect(() => {
      if (this.store.changePlanError() !== null || this.billingStore.billingError() !== null) {
        this.pendingPlanId.set(null);
      }
    });

    effect(() => {
      if (this.billingStore.cancelSucceeded()) {
        this.messageService.add({
          severity: 'success',
          summary: $localize`:@@org.plan.cancelScheduledSummary:Cancellation scheduled`,
          detail: $localize`:@@org.plan.cancelScheduledDetail:Your subscription will end at the close of the current billing period.`,
        });
      }
    });

    effect(() => {
      if (this.billingStore.resumeSucceeded()) {
        this.messageService.add({
          severity: 'success',
          summary: $localize`:@@org.plan.resumedSummary:Subscription resumed`,
          detail: $localize`:@@org.plan.resumedDetail:Your subscription will renew normally.`,
        });
      }
    });
  }

  /**
   * Method ngOnInit
   *
   * @description
   * Loads the plan catalog, pricing and current subscription, then handles a
   * return from Stripe Checkout signalled by the `checkout` query parameter.
   *
   * @returns {void}
   */
  public ngOnInit(): void {
    this.store.loadPlans();
    this.billingStore.loadPricing();

    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId !== undefined) {
      this.billingStore.loadSubscription(organizationId);
      this.billingStore.loadInvoices(organizationId);
    }

    this.handleCheckoutReturn();
  }

  /**
   * Method onIntervalChange
   *
   * @description
   * Updates the selected billing cadence.
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
   * Method isCurrentPlan
   *
   * @description
   * Returns whether the provided plan is the organization's current plan.
   *
   * @param {PlanOutput} plan - Plan to evaluate.
   * @returns {boolean} `true` when the plan is the current plan.
   */
  protected isCurrentPlan(plan: PlanOutput): boolean {
    return plan.id === this.currentPlanId();
  }

  /**
   * Method isPaidPlan
   *
   * @description
   * Returns whether the plan has configured Stripe pricing (i.e. requires a
   * subscription through Checkout).
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
   * Returns the formatted price of a plan for the selected cadence, or null for
   * free plans / unconfigured amounts.
   *
   * @param {PlanOutput} plan - Plan to price.
   * @returns {(string | null)} The formatted price, or null.
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
   * Method selectPlan
   *
   * @description
   * Routes a plan selection to the right flow while enforcing the single
   * subscription per organization rule. When a subscription is already active,
   * every change — upgrade, downgrade or switch to free — goes through the hosted
   * Billing Portal, which updates the existing subscription instead of opening a
   * second Checkout. Hosted Checkout is reached only when no subscription exists
   * yet (first paid subscription); the free plan with no subscription uses the
   * direct self-service change.
   *
   * @param {PlanOutput} plan - Plan to switch to.
   * @returns {void}
   */
  protected selectPlan(plan: PlanOutput): void {
    if (this.isCurrentPlan(plan) || this.isBusy()) {
      return;
    }

    const organization: OrganizationOutput | null =
      this.activeOrganizationStore.selectedOrganization();
    if (organization === null) {
      return;
    }

    // An organization holds a single subscription: once one is active, any plan
    // change is performed in the Billing Portal so Stripe updates that
    // subscription rather than creating a second one.
    if (this.hasActiveSubscription()) {
      this.billingStore.startPortal(organization.id);
      return;
    }

    // No subscription yet: paid plans open hosted Checkout to create the first.
    if (this.isPaidPlan(plan)) {
      this.pendingPlanId.set(plan.id);
      this.billingStore.startCheckout({
        organizationId: organization.id,
        planKey: plan.key,
        interval: this.interval(),
      });
      return;
    }

    // No subscription and a free plan: direct self-service change.
    this.pendingPlanId.set(plan.id);
    this.store.changePlan({ organizationId: organization.id, planId: plan.id });
  }

  /**
   * Method manageBilling
   *
   * @description
   * Opens the hosted Billing Portal to manage, change or cancel the subscription.
   *
   * @returns {void}
   */
  protected manageBilling(): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId !== undefined && !this.isBusy()) {
      this.billingStore.startPortal(organizationId);
    }
  }

  /**
   * Method retryLoad
   *
   * @description
   * Retries loading the plan catalog and pricing after a failure.
   *
   * @returns {void}
   */
  protected retryLoad(): void {
    this.store.loadPlans();
    this.billingStore.loadPricing();
  }

  /**
   * Method retryInvoices
   *
   * @description
   * Retries loading the organization's invoices after a failure.
   *
   * @returns {void}
   */
  protected retryInvoices(): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId !== undefined) {
      this.billingStore.loadInvoices(organizationId);
    }
  }

  /**
   * Method requestCancel
   *
   * @description
   * Asks the user to confirm, then schedules cancellation of the subscription at
   * the end of the current billing period.
   *
   * @returns {void}
   */
  protected requestCancel(): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId === undefined || this.isBusy()) {
      return;
    }

    this.confirmationService.confirm({
      header: $localize`:@@org.plan.cancelConfirmHeader:Cancel subscription`,
      message: $localize`:@@org.plan.cancelConfirm:Cancel your subscription at the end of the current period? You keep access until then and no data is deleted.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@org.plan.cancelConfirmAccept:Cancel subscription`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@org.plan.keepSubscription:Keep subscription`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.billingStore.cancelSubscription(organizationId),
    });
  }

  /**
   * Method requestResume
   *
   * @description
   * Clears a scheduled cancellation so the subscription renews normally.
   *
   * @returns {void}
   */
  protected requestResume(): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId !== undefined && !this.isBusy()) {
      this.billingStore.resumeSubscription(organizationId);
    }
  }

  /**
   * Method handleCheckoutReturn
   *
   * @description
   * Reads the `checkout` query parameter set on the Stripe return URL, surfaces
   * the outcome as a toast, refreshes subscription + quota state, and strips the
   * marker from the URL.
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
        summary: $localize`:@@org.plan.checkoutSuccessSummary:Subscription updated`,
        detail: $localize`:@@org.plan.checkoutSuccessDetail:Your subscription is being activated — it may take a few seconds to appear.`,
      });
      this.quotaStore.reload();
    } else if (outcome === 'cancel') {
      this.messageService.add({
        severity: 'info',
        summary: $localize`:@@org.plan.checkoutCancelSummary:Checkout canceled`,
        detail: $localize`:@@org.plan.checkoutCancelDetail:No changes were made to your subscription.`,
      });
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
