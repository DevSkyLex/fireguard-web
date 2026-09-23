import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { toStoreError, type StoreError } from '@core/request-state';
import type { PlanOutput, PlanPricingOutput } from '@features/organization/models';
import { OrganizationPlanStore } from '@features/organization/state/organization-plan';
import { OrganizationPlanSelector } from '../organization-plan-selector.component';

function plan(
  id: string,
  key: string,
  name: string,
  description: string | null = null,
): PlanOutput {
  return {
    '@id': `/api/plans/${id}`,
    '@type': 'Plan',
    id,
    key,
    name,
    description,
    limits: {},
    quotas: [],
    isActive: true,
    isDefault: key === 'free',
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
  };
}

function price(
  planKey: string,
  monthlyAmount: number | null,
  yearlyAmount: number | null,
): PlanPricingOutput {
  return {
    '@id': `/api/plan-pricing/${planKey}`,
    '@type': 'PlanPricing',
    planKey,
    currency: 'EUR',
    monthlyAmount,
    yearlyAmount,
  };
}

describe('OrganizationPlanSelector', () => {
  let fixture: ComponentFixture<OrganizationPlanSelector>;
  let plans: WritableSignal<ReadonlyArray<PlanOutput>>;
  let isLoadingPlans: WritableSignal<boolean>;
  let plansError: WritableSignal<StoreError | null>;
  let isChangingPlan: WritableSignal<boolean>;
  let changePlanError: WritableSignal<StoreError | null>;
  let changePlanSucceeded: WritableSignal<boolean>;
  let loadPlans: ReturnType<typeof vi.fn>;
  let changePlan: ReturnType<typeof vi.fn>;

  async function createSelector(): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    TestBed.overrideComponent(OrganizationPlanSelector, {
      remove: { providers: [OrganizationPlanStore] },
      add: {
        providers: [
          {
            provide: OrganizationPlanStore,
            useValue: {
              plans,
              isLoadingPlans,
              plansError,
              isChangingPlan,
              changePlanError,
              changePlanSucceeded,
              loadPlans,
              changePlan,
            },
          },
        ],
      },
    });
    fixture = TestBed.createComponent(OrganizationPlanSelector);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('currentPlanId', 'plan-free');
    fixture.componentRef.setInput('pricing', [price('pro', 2500, 25000)]);
    await fixture.whenStable();
  }

  beforeEach(() => {
    plans = signal<ReadonlyArray<PlanOutput>>([]);
    isLoadingPlans = signal(false);
    plansError = signal<StoreError | null>(null);
    isChangingPlan = signal(false);
    changePlanError = signal<StoreError | null>(null);
    changePlanSucceeded = signal(false);
    loadPlans = vi.fn();
    changePlan = vi.fn();
  });

  it('loads the catalog and reports the current plan key as it resolves', async () => {
    await createSelector();
    const keys: Array<string | null> = [];
    fixture.componentInstance.currentPlanKeyChange.subscribe((key) => keys.push(key));

    plans.set([plan('plan-free', 'free', 'Free'), plan('plan-pro', 'pro', 'Pro')]);
    await fixture.whenStable();

    expect(loadPlans).toHaveBeenCalledOnce();
    expect(keys).toContain('free');
    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-plan-card-free"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-plan-popular"]'),
    ).not.toBeNull();
    expect(fixture.componentInstance['rows']()[1].inheritedPlanName).toBe('Free');
    expect(fixture.componentInstance['rows']()[1].priceCadence).toBe('per month');
  });

  it('shows a loading skeleton and then a catalog error without actionable cards', async () => {
    isLoadingPlans.set(true);
    await createSelector();
    expect(fixture.nativeElement.querySelector('hlm-skeleton')).not.toBeNull();

    isLoadingPlans.set(false);
    plansError.set(toStoreError(new Error('Catalog unavailable')));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Catalog unavailable',
    );
    expect(
      fixture.nativeElement.querySelector('[data-testid^="organization-plan-card-"]'),
    ).toBeNull();
  });

  it('formats free, paid and unavailable prices for monthly and annual comparison', async () => {
    await createSelector();
    plans.set([
      plan('plan-free', 'free', 'Free'),
      plan('plan-pro', 'pro', 'Pro', 'Advanced tools'),
      plan('plan-team', 'team', 'Team'),
    ]);
    await fixture.whenStable();
    const selector = fixture.componentInstance;

    expect(selector['rows']()[0].priceAmount).toBe('Free');
    expect(selector['rows']()[1].priceAmount).toContain('25');
    expect(selector['rows']()[2].priceAmount).toBe('Not available monthly');
    selector['selectBillingInterval']('year');
    await fixture.whenStable();
    expect(selector['rows']()[1].priceAmount).toContain('250');
    expect(selector['rows']()[1].priceCadence).toBe('per year');
    expect(selector['rows']()[2].priceAmount).toBe('Not available annually');
    selector['selectBillingInterval'](['month']);
    expect(selector['billingInterval']()).toBe('year');
  });

  it('requires confirmation for another plan and ignores the current plan', async () => {
    await createSelector();
    plans.set([plan('plan-free', 'free', 'Free'), plan('plan-pro', 'pro', 'Pro')]);
    await fixture.whenStable();
    const selector = fixture.componentInstance;
    const [current, target] = selector['rows']();

    selector['requestChange'](current);
    expect(selector['pendingPlan']()).toBeNull();
    selector['requestChange'](target);
    await fixture.whenStable();
    expect(selector['pendingPlan']()?.id).toBe('plan-pro');
    selector['onDialogVisibleChange'](true);
    expect(selector['pendingPlan']()?.id).toBe('plan-pro');
    selector['confirmChange']();

    expect(changePlan).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      planId: 'plan-pro',
    });
    expect(selector['pendingPlan']()).toBeNull();
  });

  it('clears a dismissed confirmation and surfaces change feedback', async () => {
    await createSelector();
    plans.set([plan('plan-free', 'free', 'Free'), plan('plan-pro', 'pro', 'Pro')]);
    await fixture.whenStable();
    const selector = fixture.componentInstance;
    selector['requestChange'](selector['rows']()[1]);
    selector['onDialogVisibleChange'](false);
    selector['confirmChange']();
    expect(changePlan).not.toHaveBeenCalled();

    changePlanError.set(toStoreError(new Error('Plan change refused')));
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[data-testid="organization-plan-error"]')?.textContent,
    ).toContain('Plan change refused');
    changePlanError.set(null);
    changePlanSucceeded.set(true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      "The organization's plan has been updated.",
    );
  });
});
