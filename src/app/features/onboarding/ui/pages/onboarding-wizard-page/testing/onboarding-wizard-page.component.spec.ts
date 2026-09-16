import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import {
  INTERACTION_CAPABILITIES_PORT,
  type InteractionCapabilitiesPort,
} from '@core/interaction-capabilities';
import { idleCallState, type CallState } from '@core/request-state';
import type {
  OnboardingSetupOperation,
  OnboardingStepKey,
  OnboardingStepOutput,
  OnboardingStepStatus,
} from '@features/onboarding/models';
import {
  OnboardingStore,
  OnboardingSetupStore,
  onboardingSetupEvents,
} from '@features/onboarding/state';
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
  let setupMock: {
    operations: WritableSignal<readonly OnboardingSetupOperation[]>;
    failedItemKeys: WritableSignal<readonly string[]>;
    ready: WritableSignal<boolean>;
    pending: WritableSignal<boolean>;
    loadCallState: WritableSignal<CallState<void>>;
    batchCallState: WritableSignal<CallState<void>>;
    load: ReturnType<typeof vi.fn>;
    run: ReturnType<typeof vi.fn>;
  };
  let planServiceMock: { listAvailable: ReturnType<typeof vi.fn> };
  let billingServiceMock: {
    getPricing: ReturnType<typeof vi.fn>;
    createCheckoutSession: ReturnType<typeof vi.fn>;
  };
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };
  let feedbackMock: { success: ReturnType<typeof vi.fn>; show: ReturnType<typeof vi.fn> };

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
    setupMock = {
      operations: signal([]),
      failedItemKeys: signal([]),
      ready: signal(true),
      pending: signal(false),
      loadCallState: signal(idleCallState()),
      batchCallState: signal(idleCallState()),
      load: vi.fn(),
      run: vi.fn(),
    };
    planServiceMock = { listAvailable: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })) };
    billingServiceMock = {
      getPricing: vi.fn().mockReturnValue(of({ member: [], totalItems: 0 })),
      createCheckoutSession: vi.fn(),
    };
    routerMock = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    feedbackMock = { success: vi.fn(), show: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            interactionMode: signal<'desktop'>('desktop'),
            isMobileInteractionMode: signal(false),
            shortcutModifier: signal<'Ctrl'>('Ctrl'),
          } satisfies InteractionCapabilitiesPort,
        },
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

    TestBed.overrideComponent(OnboardingWizardPage, {
      remove: { providers: [OnboardingSetupStore] },
      add: { providers: [{ provide: OnboardingSetupStore, useValue: setupMock }] },
    });
    fixture = TestBed.createComponent(OnboardingWizardPage);
    await fixture.whenStable();
  });

  it('should bootstrap the onboarding record on construction', () => {
    expect(storeMock.initialize).toHaveBeenCalled();
  });

  it('opens workspace discovery without rolling back an existing creation', () => {
    fixture.componentInstance['chooseWorkspace']();

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/onboarding/workspace?returnUrl=%2F');
    expect(storeMock.rollback).not.toHaveBeenCalled();
  });

  it('preserves only a local return destination when switching to discovery', () => {
    const route = TestBed.inject(ActivatedRoute) as unknown as {
      snapshot: { queryParamMap: ReturnType<typeof convertToParamMap> };
    };
    route.snapshot.queryParamMap = convertToParamMap({
      returnUrl: '/account/security?tab=methods',
    });
    fixture.componentInstance['chooseWorkspace']();
    expect(routerMock.navigateByUrl).toHaveBeenLastCalledWith(
      '/onboarding/workspace?returnUrl=%2Faccount%2Fsecurity%3Ftab%3Dmethods',
    );

    route.snapshot.queryParamMap = convertToParamMap({ returnUrl: 'https://external.example' });
    fixture.componentInstance['chooseWorkspace']();
    expect(routerMock.navigateByUrl).toHaveBeenLastCalledWith(
      '/onboarding/workspace?returnUrl=%2F',
    );
  });

  it('keeps the creation page while a step command is pending', () => {
    storeMock.isExecutingStep.set(true);
    fixture.componentInstance['chooseWorkspace']();

    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should render the organization form as the first step', () => {
    const element: HTMLElement = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-onboarding-organization-form')).not.toBeNull();
  });

  it('delegates organization creation to the durable setup store before confirming the step', () => {
    fixture.componentInstance['submitOrganization']({ name: 'Acme' });
    expect(setupMock.run).toHaveBeenCalledExactlyOnceWith({
      stepKey: 'create_organization',
      payloads: [{ name: 'Acme' }],
    });
    expect(organizationSetupServiceMock.createOrganization).not.toHaveBeenCalled();
    expect(storeMock.executeStep).not.toHaveBeenCalled();
    TestBed.inject(Dispatcher).dispatch(
      onboardingSetupEvents.completed({ stepKey: 'create_organization' }),
    );
    expect(storeMock.executeStep).toHaveBeenCalledExactlyOnceWith({
      stepKey: 'create_organization',
    });
  });

  it('does not confirm a failed batch or duplicate its store-owned feedback', () => {
    fixture.componentInstance['submitOrganization']({ name: 'Acme' });
    TestBed.inject(Dispatcher).dispatch(
      onboardingSetupEvents.failed({
        feedback: true,
        severity: 'error',
        message: 'Creation failed.',
        code: null,
        retryable: true,
        timestamp: 1,
      }),
    );
    expect(storeMock.executeStep).not.toHaveBeenCalled();
    expect(feedbackMock.show).not.toHaveBeenCalled();
  });

  it('should confirm select_plan directly for a free plan, without starting checkout', () => {
    fixture.componentInstance['submitPlan']({
      planKey: 'free',
      interval: 'month',
      pricingState: 'free',
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
      pricingState: 'priced',
    });

    expect(billingServiceMock.createCheckoutSession).toHaveBeenCalledWith('org-1', {
      planKey: 'pro',
      interval: 'month',
    });
    expect(storeMock.executeStep).not.toHaveBeenCalled();
  });

  it('delegates the whole facility batch to durable setup without keeping page-local receipts', () => {
    const payloads: readonly SetupCreateFacilityInput[] = [
      { type: 'site', name: 'HQ' },
      { type: 'building', name: 'Annex' },
    ];
    fixture.componentInstance['submitFacilities'](payloads);
    expect(setupMock.run).toHaveBeenCalledExactlyOnceWith({
      stepKey: 'create_first_facility',
      payloads,
    });
    expect(organizationSetupServiceMock.createFacilities).not.toHaveBeenCalled();
    expect(storeMock.executeStep).not.toHaveBeenCalled();
  });

  it('restores prepared and completed facility summaries from durable operations after reload', async () => {
    setupMock.operations.set([
      {
        stepKey: 'create_first_facility',
        itemKey: 'hq',
        payload: { name: 'HQ', type: 'site' },
        status: 'completed',
        resourceId: 'facility-hq',
      },
      {
        stepKey: 'create_first_facility',
        itemKey: 'annex',
        payload: { name: 'Annex', type: 'building' },
        status: 'prepared',
        resourceId: null,
      },
    ]);
    setupMock.failedItemKeys.set(['annex']);
    storeMock.nextStep.set('create_first_facility');
    storeMock.steps.set([stepOf('create_first_facility', 'pending')]);
    await fixture.whenStable();
    expect(fixture.componentInstance['restoredFacilities']()).toEqual([
      { name: 'HQ', type: 'site' },
      { name: 'Annex', type: 'building' },
    ]);
    expect(fixture.componentInstance['completedFacilityDrafts']()).toEqual([
      { name: 'HQ', type: 'site' },
    ]);
    expect(fixture.componentInstance['failedFacilities']()).toEqual(['Annex']);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('HQ');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Annex');
  });

  it('converts equipment attachment into the canonical prepared payload without confirming early', () => {
    fixture.componentInstance['submitEquipment']({
      type: 'fire_extinguisher',
      facilityId: 'facility-1',
    });
    expect(setupMock.run).toHaveBeenCalledExactlyOnceWith({
      stepKey: 'create_first_equipment',
      payloads: [{ type: 'fire_extinguisher', facility: '/api/facilities/facility-1' }],
    });
    expect(storeMock.executeStep).not.toHaveBeenCalled();
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

  it('restores invitation roles and completed rows from persisted operations', () => {
    setupMock.operations.set([
      {
        stepKey: 'invite_members',
        itemKey: 'member',
        payload: { email: 'member@example.com', roleIds: ['member-role'] },
        status: 'completed',
        resourceId: 'invitation-1',
      },
      {
        stepKey: 'invite_members',
        itemKey: 'pending',
        payload: { email: 'pending@example.com' },
        status: 'prepared',
        resourceId: null,
      },
    ]);
    expect(fixture.componentInstance['restoredInvitations']()).toHaveLength(2);
    expect(fixture.componentInstance['completedInvitations']()).toEqual([
      { email: 'member@example.com', roleIds: ['member-role'] },
    ]);
    fixture.componentInstance['submitMembers'](fixture.componentInstance['restoredInvitations']());
    expect(setupMock.run).toHaveBeenCalledWith({
      stepKey: 'invite_members',
      payloads: fixture.componentInstance['restoredInvitations'](),
    });
  });

  it('confirms a server-recorded organization after reload without recreating it', async () => {
    setupMock.operations.set([
      {
        stepKey: 'create_organization',
        itemKey: 'org',
        payload: { name: 'Acme' },
        status: 'completed',
        resourceId: 'org-1',
      },
    ]);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="onboarding-setup-saved"]')).not.toBeNull();
    expect(root.querySelector('app-onboarding-organization-form')).toBeNull();
    fixture.componentInstance['confirmSavedStep']();
    expect(storeMock.executeStep).toHaveBeenCalledExactlyOnceWith({
      stepKey: 'create_organization',
    });
    expect(setupMock.run).not.toHaveBeenCalled();
    storeMock.isExecutingStep.set(true);
    fixture.componentInstance['confirmSavedStep']();
    expect(storeMock.executeStep).toHaveBeenCalledTimes(1);
  });

  it('cannot confirm a prepared resource before the server records its creation', () => {
    setupMock.operations.set([
      {
        stepKey: 'create_organization',
        itemKey: 'org',
        payload: { name: 'Acme' },
        status: 'prepared',
        resourceId: null,
      },
    ]);
    fixture.componentInstance['confirmSavedStep']();
    expect(storeMock.executeStep).not.toHaveBeenCalled();
  });

  it('restores an equipment attachment from its persisted facility IRI', () => {
    storeMock.nextStep.set('create_first_equipment');
    setupMock.operations.set([
      {
        stepKey: 'create_first_equipment',
        itemKey: 'equipment',
        payload: { type: 'fire_extinguisher', facility: '/api/facilities/site-1' },
        status: 'prepared',
        resourceId: null,
      },
    ]);
    expect(fixture.componentInstance['restoredEquipment']()).toEqual({
      type: 'fire_extinguisher',
      facilityId: 'site-1',
    });
  });

  it('keeps resource forms hidden until the persisted setup is available', async () => {
    setupMock.ready.set(false);
    await fixture.whenStable();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="onboarding-setup-loading"]',
      ),
    ).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-onboarding-organization-form'),
    ).toBeNull();
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
  it('continues through Billing for a zero-priced commercial offer', () => {
    storeMock.targetOrganizationId.set('org-1');
    billingServiceMock.createCheckoutSession.mockReturnValue(
      of({ organizationId: 'org-1', url: 'https://checkout.stripe.com/session' }),
    );
    fixture.componentInstance['submitPlan']({
      planKey: 'commercial-zero',
      interval: 'month',
      pricingState: 'priced',
    });
    expect(billingServiceMock.createCheckoutSession).toHaveBeenCalledWith('org-1', {
      planKey: 'commercial-zero',
      interval: 'month',
    });
    expect(storeMock.executeStep).not.toHaveBeenCalled();
  });

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
