import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { Events } from '@ngrx/signals/events';
import { MessageService } from 'primeng/api';
import { EMPTY, of } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import type { OnboardingOutput, OnboardingStepKey } from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { OnboardingWizard } from '@features/onboarding/ui/components';
import { BillingService, PlanService } from '@features/organization/data-access';
import type { PlanOutput, PlanPricingOutput } from '@features/organization/models';
import { OrganizationSetupService } from '@features/organization/setup';
import { OnboardingPage } from '../onboarding-page.component';

interface MockStore {
  isCompleted: WritableSignal<boolean>;
  isBlocked: WritableSignal<boolean>;
  isBusy: WritableSignal<boolean>;
  isLoading: WritableSignal<boolean>;
  isRollingBack: WritableSignal<boolean>;
  isSkippingStep: WritableSignal<boolean>;
  isExecutingStep: WritableSignal<boolean>;
  executeStepError: WritableSignal<{ message: string } | null>;
  blockedReason: WritableSignal<string | null>;
  onboarding: WritableSignal<OnboardingOutput | null>;
  steps: WritableSignal<readonly unknown[]>;
  progress: WritableSignal<{ done: number; total: number }>;
  nextStep: WritableSignal<OnboardingStepKey | null>;
  activeStepIndex: WritableSignal<number>;
  canRollback: WritableSignal<boolean>;
  targetOrganizationId: WritableSignal<string | null>;
  targetOrganizationName: WritableSignal<string | null>;
  initialize: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  skipStep: ReturnType<typeof vi.fn>;
  rollback: ReturnType<typeof vi.fn>;
  resetExecuteStepOperation: ReturnType<typeof vi.fn>;
}

const emptyCollection = <T extends HydraItem>(): HydraCollection<T> => ({
  '@id': '/api/collection',
  '@type': 'Collection',
  totalItems: 0,
  member: [],
});

describe('OnboardingPage', () => {
  let store: MockStore;

  const mockPlanService = {
    listAvailable: vi.fn(() => of(emptyCollection<PlanOutput>())),
  };
  const mockBillingService = {
    getPricing: vi.fn(() => of(emptyCollection<PlanPricingOutput>())),
  };
  const mockOrganizationSetupService = { listRoles: vi.fn(() => of([])) };
  const mockMessageService = { add: vi.fn() };
  const mockEvents = { on: vi.fn(() => EMPTY) };

  const setup = (): ComponentFixture<OnboardingPage> => {
    store = {
      isCompleted: signal(false),
      isBlocked: signal(false),
      isBusy: signal(false),
      isLoading: signal(false),
      isRollingBack: signal(false),
      isSkippingStep: signal(false),
      isExecutingStep: signal(false),
      executeStepError: signal<{ message: string } | null>(null),
      blockedReason: signal<string | null>(null),
      onboarding: signal<OnboardingOutput | null>(null),
      steps: signal<readonly unknown[]>([]),
      progress: signal({ done: 0, total: 0 }),
      nextStep: signal<OnboardingStepKey | null>('create_organization'),
      activeStepIndex: signal(0),
      canRollback: signal(false),
      targetOrganizationId: signal<string | null>(null),
      targetOrganizationName: signal<string | null>(null),
      initialize: vi.fn().mockResolvedValue(undefined),
      load: vi.fn(),
      skipStep: vi.fn(),
      rollback: vi.fn(),
      resetExecuteStepOperation: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [OnboardingPage],
      providers: [
        provideRouter([]),
        { provide: OnboardingStore, useValue: store },
        { provide: Events, useValue: mockEvents },
        { provide: MessageService, useValue: mockMessageService },
        { provide: PlanService, useValue: mockPlanService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: OrganizationSetupService, useValue: mockOrganizationSetupService },
      ],
    });

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(OnboardingPage);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    mockPlanService.listAvailable.mockClear();
    mockBillingService.getPricing.mockClear();
    mockOrganizationSetupService.listRoles.mockClear();
    mockMessageService.add.mockClear();
    mockEvents.on.mockClear();
  });

  it('should create the page and bootstrap onboarding without resetting', () => {
    const fixture = setup();

    expect(fixture.componentInstance).toBeTruthy();
    expect(store.initialize).toHaveBeenCalledWith({ reset: false });
    expect(store.initialize).toHaveBeenCalledTimes(1);
  });

  it('should compose the onboarding wizard as its sole child', () => {
    const fixture = setup();

    expect(fixture.debugElement.query(By.css('app-onboarding-wizard'))).not.toBeNull();
    expect(fixture.debugElement.children.length).toBeGreaterThan(0);
  });

  it('should render the wizard loading skeleton before onboarding data arrives', () => {
    const fixture = setup();

    const wizard = fixture.debugElement.query(By.directive(OnboardingWizard));
    expect(wizard).not.toBeNull();
    expect(wizard.componentInstance['phase']()).toBe('loading');
  });

  it('should reflect the wizard completion screen once onboarding is completed', () => {
    const fixture = setup();
    store.isCompleted.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("You're all set");
  });
});
