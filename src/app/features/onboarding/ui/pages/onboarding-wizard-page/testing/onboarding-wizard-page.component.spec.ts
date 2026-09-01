import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import type {
  OnboardingStepKey,
  OnboardingStepOutput,
  OnboardingStepStatus,
} from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { BillingService, PlanService } from '@features/organization/data-access';
import { OrganizationSetupService } from '@features/organization/setup';
import { OnboardingWizardPage, redirectToStripe } from '../onboarding-wizard-page.component';

const stepOf = (key: OnboardingStepKey, status: OnboardingStepStatus): OnboardingStepOutput =>
  ({
    key,
    label: key,
    status,
    required: true,
    available: true,
    reason: null,
    actionMethod: null,
    actionPath: null,
    rollbackAvailable: false,
    rollbackMethod: null,
    rollbackPath: null,
    skippable: false,
    skipAvailable: false,
    skipMethod: null,
    skipPath: null,
    completedAt: null,
  }) as OnboardingStepOutput;

describe('OnboardingWizardPage', () => {
  let fixture: ComponentFixture<OnboardingWizardPage>;
  let storeMock: {
    onboarding: WritableSignal<unknown>;
    nextStep: WritableSignal<OnboardingStepKey | null>;
    steps: WritableSignal<readonly OnboardingStepOutput[]>;
    progress: WritableSignal<{ readonly done: number; readonly total: number }>;
    isCompleted: WritableSignal<boolean>;
    isBlocked: WritableSignal<boolean>;
    blockedReason: WritableSignal<string | null>;
    canRollback: WritableSignal<boolean>;
    isRollingBack: WritableSignal<boolean>;
    isExecutingStep: WritableSignal<boolean>;
    isSkippingStep: WritableSignal<boolean>;
    executeStepError: WritableSignal<unknown>;
    targetOrganizationId: WritableSignal<string | null>;
    initialize: ReturnType<typeof vi.fn>;
    executeStep: ReturnType<typeof vi.fn>;
    skipStep: ReturnType<typeof vi.fn>;
    rollback: ReturnType<typeof vi.fn>;
  };
  let organizationSetupServiceMock: {
    createOrganization: ReturnType<typeof vi.fn>;
    inviteMembers: ReturnType<typeof vi.fn>;
    createFacilities: ReturnType<typeof vi.fn>;
    createEquipment: ReturnType<typeof vi.fn>;
    listRoles: ReturnType<typeof vi.fn>;
  };
  let planServiceMock: { listAvailable: ReturnType<typeof vi.fn> };
  let billingServiceMock: {
    getPricing: ReturnType<typeof vi.fn>;
    createCheckoutSession: ReturnType<typeof vi.fn>;
  };
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    storeMock = {
      onboarding: signal(null),
      nextStep: signal<OnboardingStepKey | null>('create_organization'),
      steps: signal<readonly OnboardingStepOutput[]>([stepOf('create_organization', 'pending')]),
      progress: signal({ done: 0, total: 5 }),
      isCompleted: signal(false),
      isBlocked: signal(false),
      blockedReason: signal(null),
      canRollback: signal(false),
      isRollingBack: signal(false),
      isExecutingStep: signal(false),
      isSkippingStep: signal(false),
      executeStepError: signal(null),
      targetOrganizationId: signal(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      executeStep: vi.fn(),
      skipStep: vi.fn(),
      rollback: vi.fn(),
    };
    organizationSetupServiceMock = {
      createOrganization: vi.fn().mockReturnValue(of(undefined)),
      inviteMembers: vi.fn().mockReturnValue(of(undefined)),
      createFacilities: vi.fn().mockReturnValue(of(undefined)),
      createEquipment: vi.fn().mockReturnValue(of(undefined)),
      listRoles: vi.fn().mockReturnValue(of([])),
    };
    planServiceMock = { listAvailable: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    billingServiceMock = {
      getPricing: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      createCheckoutSession: vi.fn(),
    };
    routerMock = { navigateByUrl: vi.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: OnboardingStore, useValue: storeMock },
        { provide: OrganizationSetupService, useValue: organizationSetupServiceMock },
        { provide: PlanService, useValue: planServiceMock },
        { provide: BillingService, useValue: billingServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });

    fixture = TestBed.createComponent(OnboardingWizardPage);
    await fixture.whenStable();
  });

  it('should bootstrap the onboarding record on construction', () => {
    expect(storeMock.initialize).toHaveBeenCalled();
  });

  it('should render the organization form as the first step', () => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-onboarding-organization-form')).not.toBeNull();
  });

  it('should create the organization then confirm the step on submit', () => {
    fixture.componentInstance['submitOrganization']({ name: 'Acme', slug: undefined });

    expect(organizationSetupServiceMock.createOrganization).toHaveBeenCalledWith({
      name: 'Acme',
      slug: undefined,
    });
    expect(storeMock.executeStep).toHaveBeenCalledWith({ stepKey: 'create_organization' });
  });

  it('should surface the creation error without confirming the step', () => {
    organizationSetupServiceMock.createOrganization.mockReturnValue(
      throwError(() => ({ status: 500 })),
    );

    fixture.componentInstance['submitOrganization']({ name: 'Acme', slug: undefined });

    expect(storeMock.executeStep).not.toHaveBeenCalled();
  });

  it('should confirm select_plan directly for a free plan, without starting checkout', () => {
    fixture.componentInstance['submitPlan']({
      planKey: 'free',
      interval: 'month',
      requiresPayment: false,
    });

    expect(billingServiceMock.createCheckoutSession).not.toHaveBeenCalled();
    expect(storeMock.executeStep).toHaveBeenCalledWith({ stepKey: 'select_plan' });
  });

  it('should start Checkout for a paid plan, without confirming the step itself', () => {
    storeMock.targetOrganizationId.set('org-1');
    billingServiceMock.createCheckoutSession.mockReturnValue(
      of({ organizationId: 'org-1', url: 'https://checkout.stripe.com/session' }),
    );

    fixture.componentInstance['submitPlan']({
      planKey: 'pro',
      interval: 'month',
      requiresPayment: true,
    });

    expect(billingServiceMock.createCheckoutSession).toHaveBeenCalledWith('org-1', {
      planKey: 'pro',
      interval: 'month',
    });
    expect(storeMock.executeStep).not.toHaveBeenCalled();
  });

  it('should memorize the created facilities and confirm the facility step', () => {
    storeMock.targetOrganizationId.set('org-1');
    organizationSetupServiceMock.createFacilities.mockReturnValue(
      of([{ id: 'facility-1', name: 'HQ' }]),
    );

    fixture.componentInstance['submitFacilities']([{ type: 'site', name: 'HQ' }]);

    expect(organizationSetupServiceMock.createFacilities).toHaveBeenCalledWith('org-1', [
      { type: 'site', name: 'HQ' },
    ]);
    expect(fixture.componentInstance['createdFacilities']()).toEqual([
      { id: 'facility-1', name: 'HQ' },
    ]);
    expect(storeMock.executeStep).toHaveBeenCalledWith({ stepKey: 'create_first_facility' });
  });

  it('should keep no facilities memorized when the facility creation fails', () => {
    storeMock.targetOrganizationId.set('org-1');
    organizationSetupServiceMock.createFacilities.mockReturnValue(
      throwError(() => ({ status: 400 })),
    );

    fixture.componentInstance['submitFacilities']([{ type: 'site', name: 'HQ' }]);

    expect(fixture.componentInstance['createdFacilities']()).toEqual([]);
    expect(storeMock.executeStep).not.toHaveBeenCalled();
  });

  it('should forward the equipment payload, facility attachment included, then confirm the step', () => {
    storeMock.targetOrganizationId.set('org-1');

    fixture.componentInstance['submitEquipment']({
      type: 'fire_extinguisher',
      facilityId: 'facility-1',
    });

    expect(organizationSetupServiceMock.createEquipment).toHaveBeenCalledWith('org-1', {
      type: 'fire_extinguisher',
      facilityId: 'facility-1',
    });
    expect(storeMock.executeStep).toHaveBeenCalledWith({ stepKey: 'create_first_equipment' });
  });

  it('should skip the active step through the store', () => {
    fixture.componentInstance['skipCurrentStep']();

    expect(storeMock.skipStep).toHaveBeenCalledWith('create_organization');
  });

  it('should redirect to the dashboard once onboarding is completed', async () => {
    storeMock.isCompleted.set(true);
    await fixture.whenStable();

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
  });
});

describe('redirectToStripe', () => {
  it('should redirect the browser to the given URL', () => {
    const assign = vi.fn();
    const documentMock = { defaultView: { location: { assign } } } as unknown as Document;

    redirectToStripe(documentMock, 'https://checkout.stripe.com/session');

    expect(assign).toHaveBeenCalledWith('https://checkout.stripe.com/session');
  });

  it('should do nothing when there is no browser window (SSR)', () => {
    const documentMock = { defaultView: null } as unknown as Document;

    expect(() =>
      redirectToStripe(documentMock, 'https://checkout.stripe.com/session'),
    ).not.toThrow();
  });
});
