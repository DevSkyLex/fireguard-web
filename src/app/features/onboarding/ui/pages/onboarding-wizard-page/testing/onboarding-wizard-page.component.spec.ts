import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { idleCallState, type CallState } from '@core/request-state';
import type {
  OnboardingStepKey,
  OnboardingStepOutput,
  OnboardingStepStatus,
} from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { BillingService, PlanService } from '@features/organization/data-access';
import {
  OrganizationSetupService,
  type SetupCreateFacilityInput,
} from '@features/organization/setup';
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
    startCallState: WritableSignal<CallState<never>>;
    skipStepCallState: WritableSignal<CallState<never>>;
    rollbackCallState: WritableSignal<CallState<never>>;
    loadError: WritableSignal<null>;
    isBusy: WritableSignal<boolean>;
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
    listFacilities: ReturnType<typeof vi.fn>;
  };
  let planServiceMock: { listAvailable: ReturnType<typeof vi.fn> };
  let billingServiceMock: {
    getPricing: ReturnType<typeof vi.fn>;
    createCheckoutSession: ReturnType<typeof vi.fn>;
  };
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };
  let feedbackMock: { success: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    storeMock = {
      startCallState: signal(idleCallState()),
      skipStepCallState: signal(idleCallState()),
      rollbackCallState: signal(idleCallState()),
      loadError: signal(null),
      isBusy: signal(false),
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
      listFacilities: vi.fn().mockReturnValue(of([])),
    };
    planServiceMock = { listAvailable: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    billingServiceMock = {
      getPricing: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      createCheckoutSession: vi.fn(),
    };
    routerMock = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    feedbackMock = { success: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: OnboardingStore, useValue: storeMock },
        { provide: OrganizationSetupService, useValue: organizationSetupServiceMock },
        { provide: PlanService, useValue: planServiceMock },
        { provide: BillingService, useValue: billingServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: FeedbackService, useValue: feedbackMock },
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
    storeMock.steps.set([
      { ...stepOf('create_organization', 'pending'), skippable: true, skipAvailable: true },
    ]);
    fixture.componentInstance['skipCurrentStep']();

    expect(storeMock.skipStep).toHaveBeenCalledWith('create_organization');
  });

  it('should redirect to the dashboard once onboarding is completed, announcing it', async () => {
    storeMock.isCompleted.set(true);
    await fixture.whenStable();

    expect(feedbackMock.success).toHaveBeenCalledWith('Your organization is ready.');
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('should name the step that comes next under the heading', async () => {
    storeMock.steps.set([
      stepOf('create_organization', 'pending'),
      stepOf('select_plan', 'pending'),
    ]);
    await fixture.whenStable();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="onboarding-wizard-next-step"]',
      )?.textContent,
    ).toContain('Next: Choose a plan');
  });

  it('should say when the active step is the last one', () => {
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="onboarding-wizard-next-step"]',
      )?.textContent,
    ).toContain('Last step');
  });
  it('should load an empty plan catalog once and allow an explicit refresh', async () => {
    storeMock.nextStep.set('select_plan');
    storeMock.steps.set([stepOf('select_plan', 'pending')]);
    await fixture.whenStable();
    expect(planServiceMock.listAvailable).toHaveBeenCalledTimes(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="onboarding-catalog-empty"]',
      ),
    ).not.toBeNull();
    fixture.componentInstance['retryCatalog']();
    await fixture.whenStable();
    expect(planServiceMock.listAvailable).toHaveBeenCalledTimes(2);
  });

  it('should keep catalog failures visible without automatically retrying', async () => {
    planServiceMock.listAvailable.mockReturnValue(throwError(() => ({ status: 503 })));
    storeMock.nextStep.set('select_plan');
    storeMock.steps.set([stepOf('select_plan', 'pending')]);
    await fixture.whenStable();
    expect(planServiceMock.listAvailable).toHaveBeenCalledTimes(1);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="onboarding-catalog-error"]',
      ),
    ).not.toBeNull();
    expect(fixture.componentInstance['catalogPending']()).toBe(false);
  });

  it('should reload persisted facilities when resuming at equipment', async () => {
    const facilities = [{ id: 'saved-site', name: 'HQ', type: 'site' }];
    organizationSetupServiceMock.listFacilities.mockReturnValue(of(facilities));
    storeMock.targetOrganizationId.set('org-1');
    storeMock.nextStep.set('create_first_equipment');
    storeMock.steps.set([stepOf('create_first_equipment', 'pending')]);
    await fixture.whenStable();
    expect(organizationSetupServiceMock.listFacilities).toHaveBeenCalledWith('org-1');
    expect(fixture.componentInstance['createdFacilities']()).toEqual(facilities);
  });

  it('should retry only failed facility rows and retain the successful summaries', () => {
    storeMock.targetOrganizationId.set('org-1');
    const drafts: readonly SetupCreateFacilityInput[] = [
      { name: 'HQ', type: 'site' },
      { name: 'Annex', type: 'building' },
    ];
    organizationSetupServiceMock.createFacilities.mockImplementation(
      (_organizationId: string, rows: readonly SetupCreateFacilityInput[]) =>
        rows[0].name === 'HQ'
          ? of([{ id: 'hq', name: 'HQ', type: 'site' }])
          : throwError(() => ({ status: 503 })),
    );
    fixture.componentInstance['submitFacilities'](drafts);
    expect(storeMock.executeStep).not.toHaveBeenCalled();
    expect(fixture.componentInstance['completedFacilityDrafts']()).toEqual([drafts[0]]);
    expect(fixture.componentInstance['failedFacilities']()).toEqual(['Annex']);
    organizationSetupServiceMock.createFacilities
      .mockClear()
      .mockReturnValue(of([{ id: 'annex', name: 'Annex', type: 'building' }]));
    fixture.componentInstance['submitFacilities'](drafts);
    expect(organizationSetupServiceMock.createFacilities).toHaveBeenCalledExactlyOnceWith('org-1', [
      drafts[1],
    ]);
    expect(fixture.componentInstance['createdFacilities']().map((facility) => facility.id)).toEqual(
      ['hq', 'annex'],
    );
    expect(storeMock.executeStep).toHaveBeenCalledWith({ stepKey: 'create_first_facility' });
  });

  it('should not recreate a resource when only confirmation needs retrying', () => {
    fixture.componentInstance['submitOrganization']({ name: 'Acme' });
    fixture.componentInstance['submitOrganization']({ name: 'Acme' });
    expect(organizationSetupServiceMock.createOrganization).toHaveBeenCalledTimes(1);
    expect(storeMock.executeStep).toHaveBeenCalledTimes(2);
  });

  it('should open the organization just activated even when an earlier destination exists', async () => {
    vi.spyOn(TestBed.inject(ActivatedRoute).snapshot.queryParamMap, 'get').mockReturnValue(
      '/organizations/previous-org',
    );
    storeMock.targetOrganizationId.set('new-org');
    storeMock.isCompleted.set(true);
    await fixture.whenStable();
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/organizations/new-org');
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
