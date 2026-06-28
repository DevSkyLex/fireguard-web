import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import { OrganizationService, PlanService } from '@features/organization/data-access';
import type { OrganizationOutput, PlanOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { OrganizationMemberAccessStore } from '../../organization-member-access';
import { OrganizationQuotaStore } from '../../organization-quota';
import { OrganizationPlanStore } from '../organization-plan.store';

const collection = <T extends HydraItem>(member: readonly T[]): HydraCollection<T> =>
  ({
    '@id': '/api/plans',
    '@type': 'Collection',
    member,
    totalItems: member.length,
  }) as HydraCollection<T>;

describe('OrganizationPlanStore', () => {
  let store: OrganizationPlanStore;

  const plan = { id: 'plan-pro', key: 'pro', name: 'Pro' } as unknown as PlanOutput;
  const organization = { id: 'org-1', name: 'Fireguard' } as unknown as OrganizationOutput;

  const organizationService = { changePlan: vi.fn() };
  const planService = { listAvailable: vi.fn() };
  const activeOrganizationStore = { setOrganization: vi.fn() };
  const memberAccessStore = { reload: vi.fn() };
  const quotaStore = { load: vi.fn() };
  const dispatcher = { dispatch: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    planService.listAvailable.mockReturnValue(of(collection([plan])));
    organizationService.changePlan.mockReturnValue(of(organization));

    TestBed.configureTestingModule({
      providers: [
        OrganizationPlanStore,
        { provide: OrganizationService, useValue: organizationService },
        { provide: PlanService, useValue: planService },
        { provide: ActiveOrganizationStore, useValue: activeOrganizationStore },
        { provide: OrganizationMemberAccessStore, useValue: memberAccessStore },
        { provide: OrganizationQuotaStore, useValue: quotaStore },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });
    store = TestBed.inject(OrganizationPlanStore);
  });

  it('should load the selectable plans', () => {
    store.loadPlans();

    expect(planService.listAvailable).toHaveBeenCalledTimes(1);
    expect(store.plans()).toEqual([plan]);
    expect(store.isLoadingPlans()).toBe(false);
    expect(store.plansCallState().status).toBe('success');
  });

  it('should expose an error when loading plans fails', () => {
    planService.listAvailable.mockReturnValue(throwError(() => new Error('boom')));

    store.loadPlans();

    expect(store.plans()).toEqual([]);
    expect(store.plansError()).not.toBeNull();
    expect(store.plansCallState().status).toBe('error');
  });

  it('should change the plan and propagate the new plan across sibling stores', () => {
    store.changePlan({ organizationId: 'org-1', planId: 'plan-pro' });

    expect(organizationService.changePlan).toHaveBeenCalledWith('org-1', { planId: 'plan-pro' });
    expect(activeOrganizationStore.setOrganization).toHaveBeenCalledWith(organization);
    expect(memberAccessStore.reload).toHaveBeenCalledTimes(1);
    expect(quotaStore.load).toHaveBeenCalledWith('org-1');
    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
    expect(store.changePlanSucceeded()).toBe(true);
  });

  it('should not propagate side effects when the plan change fails', () => {
    organizationService.changePlan.mockReturnValue(throwError(() => new Error('denied')));

    store.changePlan({ organizationId: 'org-1', planId: 'plan-pro' });

    expect(activeOrganizationStore.setOrganization).not.toHaveBeenCalled();
    expect(memberAccessStore.reload).not.toHaveBeenCalled();
    expect(quotaStore.load).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
    expect(store.changePlanError()).not.toBeNull();
    expect(store.changePlanCallState().status).toBe('error');
  });
});
