import { DOCUMENT } from '@angular/common';
import { inputBinding, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of, Subject, throwError, type Observable } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import { OnboardingStore } from '@features/onboarding/state';
import { BillingService, PlanService } from '@features/organization/data-access';
import type {
  CheckoutSessionOutput,
  PlanOutput,
  PlanPricingOutput,
} from '@features/organization/models';
import { SelectPlanStep } from '../select-plan-step.component';

interface MockStore {
  isExecutingStep: WritableSignal<boolean>;
  isBusy: WritableSignal<boolean>;
  activeStepIndex: WritableSignal<number>;
  targetOrganizationId: WritableSignal<string | null>;
  executeStep: ReturnType<typeof vi.fn>;
}

const emptyCollection = <T extends HydraItem>(): HydraCollection<T> => ({
  '@id': '/api/collection',
  '@type': 'Collection',
  totalItems: 0,
  member: [],
});

const collectionOf = <T extends HydraItem>(member: readonly T[]): HydraCollection<T> => ({
  '@id': '/api/collection',
  '@type': 'Collection',
  totalItems: member.length,
  member,
});

const freePlan: PlanOutput = {
  '@id': '/api/plans/free',
  '@type': 'Plan',
  id: 'plan-free',
  key: 'free',
  name: 'Free',
  description: 'Get started',
  limits: {},
  quotas: [
    { resource: 'facilities', label: 'Facilities', limit: 5, summary: 'Up to 5 facilities' },
  ],
  isActive: true,
  isDefault: true,
  sortOrder: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const proPlan: PlanOutput = {
  '@id': '/api/plans/pro',
  '@type': 'Plan',
  id: 'plan-pro',
  key: 'pro',
  name: 'Pro',
  description: null,
  limits: {},
  quotas: [],
  isActive: true,
  isDefault: false,
  sortOrder: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const proPricing: PlanPricingOutput = {
  '@id': '/api/plan-pricing/pro',
  '@type': 'PlanPricing',
  planKey: 'pro',
  currency: 'USD',
  monthlyAmount: 4900,
  yearlyAmount: 49000,
};

const stepInput = {
  key: 'select_plan',
  label: 'Select plan',
  status: 'pending',
  required: false,
  available: true,
  reason: null,
  actionMethod: null,
  actionPath: null,
  rollbackAvailable: false,
  rollbackMethod: null,
  rollbackPath: null,
  skippable: true,
  skipAvailable: true,
  skipMethod: null,
  skipPath: null,
  completedAt: null,
};

describe('SelectPlanStep', () => {
  let store: MockStore;
  let mockPlanService: { listAvailable: ReturnType<typeof vi.fn> };
  let mockBillingService: {
    getPricing: ReturnType<typeof vi.fn>;
    createCheckoutSession: ReturnType<typeof vi.fn>;
  };
  let mockMessageService: { add: ReturnType<typeof vi.fn> };

  const configure = (
    queryParams: Record<string, string> = {},
    overridePlanService: { listAvailable: ReturnType<typeof vi.fn> } = mockPlanService,
    overrideBillingService: {
      getPricing: ReturnType<typeof vi.fn>;
      createCheckoutSession?: ReturnType<typeof vi.fn>;
    } = mockBillingService,
  ): void => {
    TestBed.configureTestingModule({
      imports: [SelectPlanStep],
      providers: [
        provideRouter([]),
        { provide: OnboardingStore, useValue: store },
        { provide: PlanService, useValue: overridePlanService },
        { provide: BillingService, useValue: overrideBillingService },
        { provide: MessageService, useValue: mockMessageService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: (key: string) => queryParams[key] ?? null } },
          },
        },
      ],
    });
  };

  const createFixture = (): ComponentFixture<SelectPlanStep> => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    // The constructor synchronously calls `handleCheckoutReturn()`, which may
    // read `stepIndex()` before a post-creation `setInput` would run, so the
    // required inputs must be bound at creation time via `bindings`.
    const fixture = TestBed.createComponent(SelectPlanStep, {
      bindings: [
        inputBinding('step', () => stepInput),
        inputBinding('stepIndex', () => 0),
        inputBinding('totalSteps', () => 3),
      ],
    });
    return fixture;
  };

  const setup = (queryParams: Record<string, string> = {}): ComponentFixture<SelectPlanStep> => {
    store = {
      isExecutingStep: signal(false),
      isBusy: signal(false),
      activeStepIndex: signal(0),
      targetOrganizationId: signal<string | null>('org-1'),
      executeStep: vi.fn(),
    };
    mockPlanService = { listAvailable: vi.fn(() => of(collectionOf([freePlan, proPlan]))) };
    mockBillingService = {
      getPricing: vi.fn(() => of(collectionOf([proPricing]))),
      createCheckoutSession: vi.fn(() =>
        of({
          organizationId: 'org-1',
          url: 'https://checkout.stripe.com/session',
        } as CheckoutSessionOutput),
      ),
    };
    mockMessageService = { add: vi.fn() };

    configure(queryParams);
    return createFixture();
  };

  it('shows the loading skeleton while the catalog request is pending', () => {
    store = {
      isExecutingStep: signal(false),
      isBusy: signal(false),
      activeStepIndex: signal(0),
      targetOrganizationId: signal<string | null>('org-1'),
      executeStep: vi.fn(),
    };
    mockMessageService = { add: vi.fn() };
    // Never-completing sources keep the catalog request pending so the
    // loading skeleton stays rendered for the assertion.
    configure(
      {},
      { listAvailable: vi.fn(() => new Subject<HydraCollection<PlanOutput>>()) },
      { getPricing: vi.fn(() => new Subject<HydraCollection<PlanPricingOutput>>()) },
    );
    const fixture = createFixture();

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('p-skeleton')).toBeTruthy();
  });

  it('renders the plan cards once the catalog loads', () => {
    const fixture = setup();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Free');
    expect(host.textContent).toContain('Pro');
    expect(host.querySelectorAll('article').length).toBe(2);
  });

  it('shows the formatted price for a paid plan and Free for the free plan', () => {
    const fixture = setup();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Free');
    expect(host.textContent).toMatch(/49[.,]00.*\/mo/);
  });

  it('shows an error state and retries loading the catalog', () => {
    store = {
      isExecutingStep: signal(false),
      isBusy: signal(false),
      activeStepIndex: signal(0),
      targetOrganizationId: signal<string | null>('org-1'),
      executeStep: vi.fn(),
    };
    mockMessageService = { add: vi.fn() };
    const listAvailable = vi.fn(
      (): Observable<HydraCollection<PlanOutput>> => throwError(() => new Error('boom')),
    );
    configure(
      {},
      { listAvailable },
      { getPricing: vi.fn(() => of(emptyCollection<PlanPricingOutput>())) },
    );
    const fixture = createFixture();

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain("We couldn't load the plans.");

    listAvailable.mockReturnValueOnce(of(collectionOf([freePlan])));
    const retryButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Retry'),
    );
    retryButton?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(listAvailable).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state when no plans are returned', () => {
    store = {
      isExecutingStep: signal(false),
      isBusy: signal(false),
      activeStepIndex: signal(0),
      targetOrganizationId: signal<string | null>('org-1'),
      executeStep: vi.fn(),
    };
    mockMessageService = { add: vi.fn() };
    configure(
      {},
      { listAvailable: vi.fn(() => of(emptyCollection<PlanOutput>())) },
      { getPricing: vi.fn(() => of(emptyCollection<PlanPricingOutput>())) },
    );
    const fixture = createFixture();

    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('No plans are available.');
  });

  it('confirms the step when choosing the free plan', () => {
    const fixture = setup();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const startFreeButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Start on Free'),
    );
    startFreeButton?.querySelector('button')?.click();

    expect(store.executeStep).toHaveBeenCalledWith({ stepKey: 'select_plan' });
  });

  it('starts checkout when choosing a paid plan', () => {
    const fixture = setup();
    fixture.detectChanges();
    const document = TestBed.inject(DOCUMENT);
    const assignSpy = vi.fn();
    const originalLocation = document.defaultView?.location;
    Object.defineProperty(document.defaultView, 'location', {
      value: { ...originalLocation, assign: assignSpy },
      configurable: true,
      writable: true,
    });

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const subscribeButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Subscribe'),
    );
    subscribeButton?.querySelector('button')?.click();

    expect(mockBillingService.createCheckoutSession).toHaveBeenCalledWith('org-1', {
      planKey: 'pro',
      interval: 'month',
    });
    expect(assignSpy).toHaveBeenCalledWith('https://checkout.stripe.com/session');

    Object.defineProperty(document.defaultView, 'location', {
      value: originalLocation,
      configurable: true,
      writable: true,
    });
  });

  it('shows an error message and clears the pending state when checkout fails', () => {
    store = {
      isExecutingStep: signal(false),
      isBusy: signal(false),
      activeStepIndex: signal(0),
      targetOrganizationId: signal<string | null>('org-1'),
      executeStep: vi.fn(),
    };
    mockMessageService = { add: vi.fn() };
    configure(
      {},
      { listAvailable: vi.fn(() => of(collectionOf([freePlan, proPlan]))) },
      {
        getPricing: vi.fn(() => of(collectionOf([proPricing]))),
        createCheckoutSession: vi.fn(() => throwError(() => new Error('checkout failed'))),
      },
    );
    const fixture = createFixture();
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    const subscribeButton = Array.from(host.querySelectorAll<HTMLElement>('p-button')).find((el) =>
      el.textContent?.includes('Subscribe'),
    );
    subscribeButton?.querySelector('button')?.click();
    fixture.detectChanges();

    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error' }),
    );
    expect(fixture.componentInstance['pendingPlanKey']()).toBeNull();
  });

  it('does not choose a plan again while a checkout is already pending', () => {
    const fixture = setup();
    fixture.detectChanges();
    fixture.componentInstance['pendingPlanKey'].set('pro');

    fixture.componentInstance['choosePlan'](proPlan);

    expect(mockBillingService.createCheckoutSession).not.toHaveBeenCalled();
  });

  it('switches the billing cadence via the interval toggle', () => {
    const fixture = setup();
    fixture.detectChanges();

    fixture.componentInstance['onIntervalChange']({ value: 'year' } as never);
    fixture.detectChanges();

    const host: HTMLElement = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toMatch(/490[.,]00.*\/yr/);
  });

  it('ignores an invalid interval change event', () => {
    const fixture = setup();
    fixture.detectChanges();

    fixture.componentInstance['onIntervalChange']({ value: 'invalid' } as never);

    expect(fixture.componentInstance['interval']()).toBe('month');
  });

  it('shows the success message and clears the checkout query param on a successful return', () => {
    // `activeStepIndex` defaults to 0 and the bound `stepIndex` is also 0, so
    // `confirmStep()` executes the step as part of the constructor-driven
    // checkout-return handling.
    const fixture = setup({ checkout: 'success' });
    fixture.detectChanges();

    expect(mockMessageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' }),
    );
    expect(TestBed.inject(Router).navigate).toHaveBeenCalled();
  });

  it('does not show a success message when the checkout query param is not success', () => {
    const fixture = setup({ checkout: 'cancelled' });
    fixture.detectChanges();

    expect(mockMessageService.add).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalled();
  });
});
