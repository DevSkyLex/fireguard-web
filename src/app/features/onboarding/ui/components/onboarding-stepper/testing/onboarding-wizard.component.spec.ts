import { signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
import type { HydraCollection, HydraItem } from '@core/api/models';
import type {
  OnboardingOutput,
  OnboardingStepKey,
  OnboardingStepOutput,
} from '@features/onboarding/models';
import { OnboardingStore } from '@features/onboarding/state';
import { BillingService } from '@features/organization/data-access/services/billing/billing.service';
import { PlanService } from '@features/organization/data-access/services/plan/plan.service';
import type { PlanOutput, PlanPricingOutput } from '@features/organization/models';
import { OrganizationSetupService } from '@features/organization/setup';
import { OnboardingWizard } from '../onboarding-wizard.component';

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
  steps: WritableSignal<readonly OnboardingStepOutput[]>;
  progress: WritableSignal<{ done: number; total: number }>;
  nextStep: WritableSignal<OnboardingStepKey | null>;
  activeStepIndex: WritableSignal<number>;
  canRollback: WritableSignal<boolean>;
  targetOrganizationId: WritableSignal<string | null>;
  targetOrganizationName: WritableSignal<string | null>;
  dismiss: ReturnType<typeof vi.fn>;
  load: ReturnType<typeof vi.fn>;
  skipStep: ReturnType<typeof vi.fn>;
  rollback: ReturnType<typeof vi.fn>;
  resetExecuteStepOperation: ReturnType<typeof vi.fn>;
}

const stepWith = (
  key: OnboardingStepKey,
  overrides: Partial<OnboardingStepOutput> = {},
): OnboardingStepOutput =>
  ({
    key,
    label: key,
    status: 'pending',
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
    ...overrides,
  }) as OnboardingStepOutput;

const emptyCollection = <T extends HydraItem>(): HydraCollection<T> => ({
  '@id': '/api/collection',
  '@type': 'Collection',
  totalItems: 0,
  member: [],
});

describe('OnboardingWizard', () => {
  let store: MockStore;

  const mockPlanService = {
    listAvailable: vi.fn(() => of(emptyCollection<PlanOutput>())),
  };
  const mockBillingService = {
    getPricing: vi.fn(() => of(emptyCollection<PlanPricingOutput>())),
  };
  const mockOrganizationSetupService = { listRoles: vi.fn(() => of([])) };
  const mockMessageService = { add: vi.fn() };

  const setup = (): ComponentFixture<OnboardingWizard> => {
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
      steps: signal<readonly OnboardingStepOutput[]>([]),
      progress: signal({ done: 0, total: 0 }),
      nextStep: signal<OnboardingStepKey | null>('create_organization'),
      activeStepIndex: signal(0),
      canRollback: signal(false),
      targetOrganizationId: signal<string | null>(null),
      targetOrganizationName: signal<string | null>(null),
      dismiss: vi.fn(),
      load: vi.fn(),
      skipStep: vi.fn(),
      rollback: vi.fn(),
      resetExecuteStepOperation: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [OnboardingWizard],
      providers: [
        provideRouter([]),
        { provide: OnboardingStore, useValue: store },
        { provide: PlanService, useValue: mockPlanService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: OrganizationSetupService, useValue: mockOrganizationSetupService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    });

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(OnboardingWizard);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    mockPlanService.listAvailable.mockClear();
    mockBillingService.getPricing.mockClear();
    mockOrganizationSetupService.listRoles.mockClear();
    mockMessageService.add.mockClear();
  });

  describe('phase resolution', () => {
    it('shows the loading skeleton before onboarding data arrives', () => {
      const fixture = setup();

      expect(fixture.componentInstance['phase']()).toBe('loading');
      expect(fixture.nativeElement.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    it('shows the welcome screen for a fresh user with no progress', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.steps.set([stepWith('create_organization')]);
      store.progress.set({ done: 0, total: 1 });
      fixture.detectChanges();

      expect(fixture.componentInstance['phase']()).toBe('welcome');
      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading?.textContent).toContain("Let's set up your workspace");
    });

    it('skips the welcome screen for a returning user with progress', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.steps.set([stepWith('create_organization', { status: 'completed' })]);
      store.progress.set({ done: 1, total: 2 });
      fixture.detectChanges();

      expect(fixture.componentInstance['phase']()).toBe('steps');
      expect(fixture.debugElement.query(By.css('app-create-organization-step'))).not.toBeNull();
    });

    it('enters the steps phase once the welcome screen is dismissed', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.steps.set([stepWith('create_organization')]);
      store.progress.set({ done: 0, total: 1 });
      fixture.detectChanges();

      fixture.componentInstance['startSetup']();
      fixture.detectChanges();

      expect(fixture.componentInstance['phase']()).toBe('steps');
      expect(fixture.debugElement.query(By.css('app-create-organization-step'))).not.toBeNull();
    });

    it('shows the completion screen once onboarding is completed', () => {
      const fixture = setup();
      store.isCompleted.set(true);
      fixture.detectChanges();

      const heading = fixture.nativeElement.querySelector('h1');
      expect(heading?.textContent).toContain("You're all set");
    });

    it('shows the named organization on the completion screen when available', () => {
      const fixture = setup();
      store.isCompleted.set(true);
      store.targetOrganizationName.set('Acme Corp');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Acme Corp');
    });
  });

  describe('step rendering', () => {
    it('renders the component mapped to the current next step', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.nextStep.set('invite_members');
      store.steps.set([stepWith('invite_members')]);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('app-invite-members-step'))).not.toBeNull();
      expect(fixture.debugElement.query(By.css('app-create-organization-step'))).toBeNull();
    });

    it('shows the optional badge when the current step is not required', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.steps.set([stepWith('create_organization', { required: false })]);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('p-tag'))).not.toBeNull();
    });

    it('does not show the optional badge when the current step is required', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.steps.set([stepWith('create_organization', { required: true })]);
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('p-tag'))).toBeNull();
    });
  });

  describe('navigation actions', () => {
    it('rolls back the last step when back is triggered', () => {
      const fixture = setup();
      fixture.componentInstance['handleBack']();

      expect(store.rollback).toHaveBeenCalledTimes(1);
    });

    it('skips the current step by key', () => {
      const fixture = setup();
      store.nextStep.set('invite_members');

      fixture.componentInstance['handleSkip']();

      expect(store.skipStep).toHaveBeenCalledWith('invite_members');
    });

    it('does not attempt to skip when there is no pending step', () => {
      const fixture = setup();
      store.nextStep.set(null);

      fixture.componentInstance['handleSkip']();

      expect(store.skipStep).not.toHaveBeenCalled();
    });

    it('reloads onboarding when retrying after a block', () => {
      const fixture = setup();
      fixture.componentInstance['retryAfterBlock']();

      expect(store.load).toHaveBeenCalledTimes(1);
    });

    it('dismisses the step error banner', () => {
      const fixture = setup();
      fixture.componentInstance['dismissStepError']();

      expect(store.resetExecuteStepOperation).toHaveBeenCalledTimes(1);
    });

    it('navigates to the created organization from the completion screen', () => {
      const fixture = setup();
      store.targetOrganizationId.set('org-123');

      fixture.componentInstance['goToDashboard']();

      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/organizations', 'org-123']);
    });

    it('falls back to the app root when no target organization is known', () => {
      const fixture = setup();
      fixture.componentInstance['goToDashboard']();

      expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('blocked and error banners', () => {
    it('shows the blocked banner with a concrete reason', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.steps.set([stepWith('create_organization')]);
      store.isBlocked.set(true);
      store.blockedReason.set('Payment required');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Payment required');
    });

    it('falls back to a generic blocked message when no reason is given', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.steps.set([stepWith('create_organization')]);
      store.isBlocked.set(true);
      store.blockedReason.set(null);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        'Something stopped your setup from continuing.',
      );
    });

    it('shows the inline step error banner', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.steps.set([stepWith('create_organization')]);
      store.executeStepError.set({ message: 'Could not execute step' });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('Could not execute step');
    });
  });

  describe('back/skip footer', () => {
    it('shows the back button when rollback is available', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.steps.set([stepWith('create_organization')]);
      store.canRollback.set(true);
      fixture.detectChanges();

      const buttons = Array.from(fixture.nativeElement.querySelectorAll('p-button'));
      const backButton = buttons.find((el) => (el as HTMLElement).textContent?.includes('Back'));
      expect(backButton).not.toBeUndefined();
    });

    it('shows the skip button when the current step is skippable', () => {
      const fixture = setup();
      store.onboarding.set({} as OnboardingOutput);
      store.progress.set({ done: 1, total: 5 });
      store.steps.set([stepWith('create_organization', { skipAvailable: true })]);
      fixture.detectChanges();

      const buttons = Array.from(fixture.nativeElement.querySelectorAll('p-button'));
      const skipButton = buttons.find((el) =>
        (el as HTMLElement).textContent?.includes('Skip for now'),
      );
      expect(skipButton).not.toBeUndefined();
    });
  });
});
