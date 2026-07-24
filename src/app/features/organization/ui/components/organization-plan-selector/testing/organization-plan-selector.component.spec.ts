import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import type { StoreError } from '@core/request-state';
import type {
  OrganizationOutput,
  OrganizationSubscriptionOutput,
  PlanOutput,
  PlanPricingOutput,
} from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { OrganizationBillingStore } from '@features/organization/state/organization-billing';
import { OrganizationPlanStore } from '@features/organization/state/organization-plan';
import { OrganizationQuotaStore } from '@features/organization/state/organization-quota';
import { OrganizationPlanSelector } from '../organization-plan-selector.component';

type PlanSelectorTestApi = OrganizationPlanSelector & {
  pendingPlanId: WritableSignal<string | null>;
  isCurrentPlan(plan: PlanOutput): boolean;
  priceLabel(plan: PlanOutput): string | null;
  selectPlan(plan: PlanOutput): void;
  manageBilling(): void;
};

interface PlanStoreMock {
  plans: WritableSignal<readonly PlanOutput[]>;
  isLoadingPlans: WritableSignal<boolean>;
  plansError: WritableSignal<StoreError | null>;
  isChangingPlan: WritableSignal<boolean>;
  changePlanError: WritableSignal<StoreError | null>;
  changePlanSucceeded: WritableSignal<boolean>;
  loadPlans: ReturnType<typeof vi.fn>;
  changePlan: ReturnType<typeof vi.fn>;
}

interface BillingStoreMock {
  subscription: WritableSignal<OrganizationSubscriptionOutput | null>;
  isLoadingSubscription: WritableSignal<boolean>;
  pricing: WritableSignal<readonly PlanPricingOutput[]>;
  isLoadingPricing: WritableSignal<boolean>;
  invoices: WritableSignal<readonly unknown[]>;
  isLoadingInvoices: WritableSignal<boolean>;
  invoicesError: WritableSignal<StoreError | null>;
  isStartingCheckout: WritableSignal<boolean>;
  isStartingPortal: WritableSignal<boolean>;
  isCanceling: WritableSignal<boolean>;
  isResuming: WritableSignal<boolean>;
  cancelSucceeded: WritableSignal<boolean>;
  resumeSucceeded: WritableSignal<boolean>;
  billingError: WritableSignal<StoreError | null>;
  loadSubscription: ReturnType<typeof vi.fn>;
  loadPricing: ReturnType<typeof vi.fn>;
  loadInvoices: ReturnType<typeof vi.fn>;
  cancelSubscription: ReturnType<typeof vi.fn>;
  resumeSubscription: ReturnType<typeof vi.fn>;
  startCheckout: ReturnType<typeof vi.fn>;
  startPortal: ReturnType<typeof vi.fn>;
}

const FREE_PLAN: PlanOutput = {
  '@id': '/plans/free',
  '@type': 'Plan',
  id: 'plan-free',
  key: 'free',
  name: 'Free',
  description: 'Get started at no cost.',
  limits: {},
  quotas: [
    { resource: 'facilities', label: 'Facilities', limit: 5, summary: 'Up to 5 facilities' },
  ],
  isActive: true,
  isDefault: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as PlanOutput;

const PRO_PLAN: PlanOutput = {
  '@id': '/plans/pro',
  '@type': 'Plan',
  id: 'plan-pro',
  key: 'pro',
  name: 'Pro',
  description: 'For growing teams.',
  limits: {},
  quotas: [{ resource: 'facilities', label: 'Facilities', limit: null, summary: 'Unlimited' }],
  isActive: true,
  isDefault: false,
  sortOrder: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as PlanOutput;

const PRO_PRICING: PlanPricingOutput = {
  '@id': '/plan-pricing/pro',
  '@type': 'PlanPricing',
  planKey: 'pro',
  currency: 'usd',
  monthlyAmount: 2900,
  yearlyAmount: 29000,
} as unknown as PlanPricingOutput;

const ORGANIZATION: OrganizationOutput = {
  id: 'org-1',
  planId: 'plan-free',
} as unknown as OrganizationOutput;

/** Locale-formatted USD amount, matching the component's `Intl.NumberFormat` usage. */
function formatUsd(amountInCents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'usd',
    maximumFractionDigits: 2,
  }).format(amountInCents / 100);
}

function createPlanStoreMock(): PlanStoreMock {
  return {
    plans: signal([FREE_PLAN, PRO_PLAN]),
    isLoadingPlans: signal(false),
    plansError: signal(null),
    isChangingPlan: signal(false),
    changePlanError: signal(null),
    changePlanSucceeded: signal(false),
    loadPlans: vi.fn(),
    changePlan: vi.fn(),
  };
}

function createBillingStoreMock(): BillingStoreMock {
  return {
    subscription: signal(null),
    isLoadingSubscription: signal(false),
    pricing: signal([PRO_PRICING]),
    isLoadingPricing: signal(false),
    invoices: signal([]),
    isLoadingInvoices: signal(false),
    invoicesError: signal(null),
    isStartingCheckout: signal(false),
    isStartingPortal: signal(false),
    isCanceling: signal(false),
    isResuming: signal(false),
    cancelSucceeded: signal(false),
    resumeSucceeded: signal(false),
    billingError: signal(null),
    loadSubscription: vi.fn(),
    loadPricing: vi.fn(),
    loadInvoices: vi.fn(),
    cancelSubscription: vi.fn(),
    resumeSubscription: vi.fn(),
    startCheckout: vi.fn(),
    startPortal: vi.fn(),
  };
}

describe('OrganizationPlanSelector', () => {
  let planStore: PlanStoreMock;
  let billingStore: BillingStoreMock;
  let quotaStore: { reload: ReturnType<typeof vi.fn> };
  let messageService: { add: ReturnType<typeof vi.fn> };
  let confirmationService: { confirm: ReturnType<typeof vi.fn> };
  let mockRouter: { navigate: ReturnType<typeof vi.fn> };
  let queryParamMap: Map<string, string>;

  function setup(): void {
    planStore = createPlanStoreMock();
    billingStore = createBillingStoreMock();
    quotaStore = { reload: vi.fn() };
    messageService = { add: vi.fn() };
    confirmationService = { confirm: vi.fn() };
    mockRouter = { navigate: vi.fn().mockResolvedValue(true) };
    queryParamMap = new Map();

    TestBed.configureTestingModule({
      imports: [OrganizationPlanSelector],
      providers: [
        provideRouter([]),
        { provide: Router, useValue: mockRouter },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (key: string) => queryParamMap.get(key) ?? null } },
          },
        },
        { provide: MessageService, useValue: messageService },
        { provide: ConfirmationService, useValue: confirmationService },
        {
          provide: ActiveOrganizationStore,
          useValue: { selectedOrganization: signal(ORGANIZATION) },
        },
        { provide: OrganizationQuotaStore, useValue: quotaStore },
      ],
    }).overrideComponent(OrganizationPlanSelector, {
      set: {
        providers: [
          { provide: OrganizationPlanStore, useValue: planStore },
          { provide: OrganizationBillingStore, useValue: billingStore },
        ],
      },
    });
  }

  function createComponent(): {
    component: PlanSelectorTestApi;
    fixture: ComponentFixture<OrganizationPlanSelector>;
  } {
    const fixture = TestBed.createComponent(OrganizationPlanSelector);
    fixture.detectChanges();
    return { component: fixture.componentInstance as unknown as PlanSelectorTestApi, fixture };
  }

  beforeEach(() => setup());

  it('should create and load plans, pricing and subscription on init', () => {
    const { component } = createComponent();

    expect(component).toBeTruthy();
    expect(planStore.loadPlans).toHaveBeenCalled();
    expect(billingStore.loadPricing).toHaveBeenCalled();
    expect(billingStore.loadSubscription).toHaveBeenCalledWith('org-1');
    expect(billingStore.loadInvoices).toHaveBeenCalledWith('org-1');
  });

  it('renders the loading skeletons while plans are loading', () => {
    planStore.isLoadingPlans.set(true);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelectorAll('app-skeleton').length).toBe(3);
  });

  it('renders the plans error state and retries on click', () => {
    planStore.isLoadingPlans.set(false);
    planStore.plansError.set({ message: 'Network error' } as unknown as StoreError);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain("couldn't load the plans");

    const retryButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('app-error-state button');
    retryButton?.click();
    fixture.detectChanges();

    expect(planStore.loadPlans).toHaveBeenCalledTimes(2);
    expect(billingStore.loadPricing).toHaveBeenCalledTimes(2);
  });

  it('renders the empty state when the plan catalog has no plans', () => {
    planStore.plans.set([]);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('No plans are available');
  });

  it('renders the plan grid with quotas and prices', () => {
    const { component, fixture } = createComponent();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Free');
    expect(text).toContain('Pro');
    expect(text).toContain('Up to 5 facilities');
    expect(text).toContain(component.priceLabel(PRO_PLAN));
  });

  it('marks the current plan and disables its action button', () => {
    const { component, fixture } = createComponent();

    expect(component.isCurrentPlan(FREE_PLAN)).toBe(true);
    expect(component.isCurrentPlan(PRO_PLAN)).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Current plan');
  });

  it('changes the billing cadence and reprices the paid plan', () => {
    const { component, fixture } = createComponent();

    expect(component.priceLabel(PRO_PLAN)).toBe(`${formatUsd(2900)}/mo`);

    const toggleButtons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button[aria-pressed]'),
    ) as HTMLButtonElement[];
    const yearlyToggle: HTMLButtonElement | undefined = toggleButtons.find((button) =>
      button.textContent?.includes('Yearly'),
    );
    yearlyToggle?.click();
    fixture.detectChanges();

    expect(component.priceLabel(PRO_PLAN)).toBe(`${formatUsd(29000)}/yr`);
  });

  it('starts a direct plan change for a free plan with no active subscription', () => {
    const { component } = createComponent();

    component.selectPlan(PRO_PLAN);

    // Pro is a paid plan with no active subscription: opens hosted Checkout.
    expect(billingStore.startCheckout).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planKey: 'pro',
      interval: 'month',
    });
  });

  it('applies a direct self-service change for the free plan when no subscription exists', () => {
    const { component } = createComponent();

    component.selectPlan(FREE_PLAN);

    // Free is already the current plan, so selecting it again is a no-op.
    expect(planStore.changePlan).not.toHaveBeenCalled();

    const otherFreePlan: PlanOutput = { ...FREE_PLAN, id: 'plan-free-2' } as PlanOutput;
    component.selectPlan(otherFreePlan);

    expect(planStore.changePlan).toHaveBeenCalledWith({
      organizationId: 'org-1',
      planId: 'plan-free-2',
    });
  });

  it('routes every plan change through the Billing Portal once a subscription is active', () => {
    billingStore.subscription.set({
      hasSubscription: true,
      active: true,
      cancelAtPeriodEnd: false,
    } as unknown as OrganizationSubscriptionOutput);
    const { component } = createComponent();

    component.selectPlan(PRO_PLAN);

    expect(billingStore.startPortal).toHaveBeenCalledWith('org-1');
    expect(billingStore.startCheckout).not.toHaveBeenCalled();
  });

  it('does nothing when selecting a plan while another action is busy', () => {
    billingStore.isStartingCheckout.set(true);
    const { component } = createComponent();

    component.selectPlan(PRO_PLAN);

    expect(billingStore.startCheckout).not.toHaveBeenCalled();
  });

  it('renders the current subscription summary with status, price and manage billing action', () => {
    billingStore.subscription.set({
      hasSubscription: true,
      active: true,
      status: 'active',
      planKey: 'pro',
      interval: 'month',
      currentPeriodEnd: '2026-08-24T00:00:00.000Z',
      cancelAtPeriodEnd: false,
    } as unknown as OrganizationSubscriptionOutput);
    const { fixture } = createComponent();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Active');
    expect(text).toContain('Monthly billing');
    expect(text).toContain(formatUsd(2900));
    expect(text).toContain('Manage billing');
  });

  it('opens the Billing Portal from the manage billing action', () => {
    billingStore.subscription.set({
      hasSubscription: true,
      active: true,
      cancelAtPeriodEnd: false,
    } as unknown as OrganizationSubscriptionOutput);
    const { component } = createComponent();

    component.manageBilling();

    expect(billingStore.startPortal).toHaveBeenCalledWith('org-1');
  });

  it('shows the scheduled-cancellation message when the subscription is set to cancel', () => {
    billingStore.subscription.set({
      hasSubscription: true,
      active: true,
      interval: 'year',
      currentPeriodEnd: '2026-12-01T00:00:00.000Z',
      cancelAtPeriodEnd: true,
    } as unknown as OrganizationSubscriptionOutput);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Cancels on');
  });

  it('renders the invoices error state and retries on click', () => {
    billingStore.invoicesError.set({ message: 'Invoices failed' } as unknown as StoreError);
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain("couldn't load your invoices");

    const retryButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('app-error-state button');
    retryButton?.click();
    fixture.detectChanges();

    expect(billingStore.loadInvoices).toHaveBeenCalledWith('org-1');
  });

  it('renders the invoice table when invoices load successfully', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('app-billing-invoice-table')).not.toBeNull();
  });

  it('renders the billing-cancel-card and requests a confirmed cancellation', () => {
    billingStore.subscription.set({
      hasSubscription: true,
      active: true,
      cancelAtPeriodEnd: false,
    } as unknown as OrganizationSubscriptionOutput);
    confirmationService.confirm.mockImplementation((options: { accept?: () => void }): void =>
      options.accept?.(),
    );
    const { fixture } = createComponent();

    expect(fixture.nativeElement.textContent).toContain('Cancel subscription');

    const cancelButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'app-billing-cancel-card button',
    );
    cancelButton?.click();
    fixture.detectChanges();

    expect(confirmationService.confirm).toHaveBeenCalled();
    expect(billingStore.cancelSubscription).toHaveBeenCalledWith('org-1');
  });

  it('resumes a scheduled cancellation from the billing-cancel-card', () => {
    billingStore.subscription.set({
      hasSubscription: true,
      active: true,
      currentPeriodEnd: '2026-09-01T00:00:00.000Z',
      cancelAtPeriodEnd: true,
    } as unknown as OrganizationSubscriptionOutput);
    const { fixture } = createComponent();

    const resumeButton: HTMLButtonElement | null = fixture.nativeElement.querySelector(
      'app-billing-cancel-card button',
    );
    resumeButton?.click();
    fixture.detectChanges();

    expect(billingStore.resumeSubscription).toHaveBeenCalledWith('org-1');
  });

  it('hides the cancel/resume section when there is no active subscription', () => {
    const { fixture } = createComponent();

    expect(fixture.nativeElement.querySelector('app-billing-cancel-card')).toBeNull();
  });

  it('surfaces the plan-change and billing errors as inline messages', () => {
    planStore.changePlanError.set({ message: 'Plan change failed' } as unknown as StoreError);
    billingStore.billingError.set({ message: 'Billing failed' } as unknown as StoreError);
    const { fixture } = createComponent();

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Plan change failed');
    expect(text).toContain('Billing failed');
  });

  it('shows a success toast and clears the pending plan when a plan change succeeds', () => {
    const { component, fixture } = createComponent();

    component.pendingPlanId.set('plan-free-2');
    planStore.changePlanSucceeded.set(true);
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Plan updated' }),
    );
    expect(component.pendingPlanId()).toBeNull();
  });

  it('shows a success toast when a scheduled cancellation succeeds', () => {
    const { fixture } = createComponent();

    billingStore.cancelSucceeded.set(true);
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Cancellation scheduled' }),
    );
  });

  it('shows a success toast when a resume succeeds', () => {
    const { fixture } = createComponent();

    billingStore.resumeSucceeded.set(true);
    fixture.detectChanges();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Subscription resumed' }),
    );
  });

  it('surfaces the checkout-success return as a toast and reloads quotas', () => {
    queryParamMap.set('checkout', 'success');
    createComponent();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Subscription updated' }),
    );
    expect(quotaStore.reload).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { checkout: null } }),
    );
  });

  it('surfaces the checkout-cancel return as an info toast without reloading quotas', () => {
    queryParamMap.set('checkout', 'cancel');
    createComponent();

    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'info', summary: 'Checkout canceled' }),
    );
    expect(quotaStore.reload).not.toHaveBeenCalled();
  });

  it('does nothing for a checkout return outcome that is not present', () => {
    createComponent();

    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});
