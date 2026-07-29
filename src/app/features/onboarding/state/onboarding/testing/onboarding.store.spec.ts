import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { firstValueFrom, Subject, of, throwError } from 'rxjs';
import { authStoreEvents } from '@features/auth';
import { OnboardingService } from '@features/onboarding/data-access';
import type { OnboardingOutput, OnboardingStepOutput } from '@features/onboarding/models';
import { OnboardingStore } from '../onboarding.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('OnboardingStore', () => {
  let store: OnboardingStore;
  let transferState: TransferState;

  const onboarding: OnboardingOutput = {
    '@id': '/api/onboarding/organization',
    '@type': 'OrganizationOnboarding',
    flow: 'organization',
    state: 'in_progress',
    nextStep: 'create_organization',
    blockedReason: null,
    completedSteps: [],
    skippedSteps: [],
    steps: [],
    stepHistory: [],
    targetOrganizationId: null,
    targetOrganizationName: null,
    canRollback: false,
    lastRollbackableStep: null,
    rollbackMethod: null,
    rollbackPath: null,
    updatedAt: '2026-04-15T10:00:00Z',
    dismissed: false,
    dismissedAt: null,
  };

  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOnboardingService: {
    get: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    executeStep: ReturnType<typeof vi.fn>;
    skipStep: ReturnType<typeof vi.fn>;
    rollback: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
  };

  const configure = (platformId: 'browser' | 'server' = 'browser') => {
    mockDispatcher = { dispatch: vi.fn() };
    mockOnboardingService = {
      get: vi.fn(),
      start: vi.fn(),
      executeStep: vi.fn(),
      skipStep: vi.fn(),
      rollback: vi.fn(),
      dismiss: vi.fn(),
      resume: vi.fn(),
    };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OnboardingService, useValue: mockOnboardingService },
      ],
    });

    store = TestBed.inject(OnboardingStore);
    transferState = TestBed.inject(TransferState);
  };

  beforeEach(() => {
    configure();
  });

  // The SSR handoff hangs off `ensureLoaded()`, not `initialize()`: the guards
  // call it first on both sides, so that is the only place that sees the very
  // first load.
  it('should consume the transferred record on hydration without calling the API', async () => {
    transferState.set(makeStateKey<OnboardingOutput | null>('organization-onboarding'), onboarding);

    const resolved = await firstValueFrom(store.ensureLoaded());

    expect(mockOnboardingService.get).not.toHaveBeenCalled();
    expect(resolved).toEqual(onboarding);
    expect(store.onboarding()).toEqual(onboarding);
    // Consumed, so a later load cannot read a stale record.
    expect(
      transferState.hasKey(makeStateKey<OnboardingOutput | null>('organization-onboarding')),
    ).toBe(false);
  });

  it('should write the record to transfer state while rendering on the server', async () => {
    configure('server');
    mockOnboardingService.get.mockReturnValue(of(onboarding));

    await firstValueFrom(store.ensureLoaded());

    expect(mockOnboardingService.get).toHaveBeenCalled();
    expect(
      transferState.get(makeStateKey<OnboardingOutput | null>('organization-onboarding'), null),
    ).toEqual(onboarding);
  });

  it('should not write transfer state from the browser', async () => {
    mockOnboardingService.get.mockReturnValue(of(onboarding));

    await firstValueFrom(store.ensureLoaded());

    expect(
      transferState.hasKey(makeStateKey<OnboardingOutput | null>('organization-onboarding')),
    ).toBe(false);
  });

  it('should only bootstrap onboarding once when state is already present', async () => {
    mockOnboardingService.start.mockReturnValue(of(onboarding));

    await store.initialize({ reset: false });
    await store.initialize({ reset: false });

    expect(mockOnboardingService.start).toHaveBeenCalledTimes(1);
  });

  it('should hide activation surfaces and keep progression after dismiss', () => {
    mockOnboardingService.start.mockReturnValue(of(onboarding));
    mockOnboardingService.dismiss.mockReturnValue(
      of({ ...onboarding, dismissed: true, dismissedAt: '2026-04-15T11:00:00Z' }),
    );

    store.start({ reset: false });
    expect(store.isActivationVisible()).toBe(true);

    store.dismiss();

    expect(mockOnboardingService.dismiss).toHaveBeenCalledTimes(1);
    expect(store.isDismissed()).toBe(true);
    expect(store.isActivationVisible()).toBe(false);
    // Dismissal must not block progression.
    expect(store.state()).toBe('in_progress');
  });

  it('should re-show activation surfaces after resume', () => {
    mockOnboardingService.start.mockReturnValue(
      of({ ...onboarding, dismissed: true, dismissedAt: '2026-04-15T11:00:00Z' }),
    );
    mockOnboardingService.resume.mockReturnValue(
      of({ ...onboarding, dismissed: false, dismissedAt: null }),
    );

    store.start({ reset: false });
    expect(store.isDismissed()).toBe(true);

    store.resume();

    expect(mockOnboardingService.resume).toHaveBeenCalledTimes(1);
    expect(store.isDismissed()).toBe(false);
    expect(store.isActivationVisible()).toBe(true);
  });

  it('should compute progress from completed and skipped steps', () => {
    const stepWith = (key: string, status: string): OnboardingStepOutput =>
      ({ key, status }) as unknown as OnboardingStepOutput;

    mockOnboardingService.start.mockReturnValue(
      of({
        ...onboarding,
        steps: [
          stepWith('create_organization', 'completed'),
          stepWith('invite_members', 'skipped'),
          stepWith('create_first_facility', 'pending'),
        ],
      } as OnboardingOutput),
    );

    store.start({ reset: false });

    expect(store.progress()).toEqual({ done: 2, total: 3 });
  });

  describe('load', () => {
    it('should load the onboarding record and expose derived computed signals', async () => {
      const loaded: OnboardingOutput = {
        ...onboarding,
        targetOrganizationId: 'org-1',
        targetOrganizationName: 'Acme',
        canRollback: true,
        blockedReason: null,
        steps: [
          { key: 'create_organization', status: 'completed' } as unknown as OnboardingStepOutput,
          { key: 'invite_members', status: 'pending' } as unknown as OnboardingStepOutput,
        ],
      };
      mockOnboardingService.get.mockReturnValue(of(loaded));

      store.load();
      await flushEffects();

      expect(mockOnboardingService.get).toHaveBeenCalledTimes(1);
      expect(store.loadCallState().status).toBe('success');
      expect(store.isLoading()).toBe(false);
      expect(store.loadError()).toBeNull();
      expect(store.onboarding()).toEqual(loaded);
      expect(store.state()).toBe('in_progress');
      expect(store.isInProgress()).toBe(true);
      expect(store.isCompleted()).toBe(false);
      expect(store.isBlocked()).toBe(false);
      expect(store.nextStep()).toBe('create_organization');
      expect(store.steps()).toEqual(loaded.steps);
      expect(store.canRollback()).toBe(true);
      expect(store.targetOrganizationId()).toBe('org-1');
      expect(store.targetOrganizationName()).toBe('Acme');
      expect(store.activeStepIndex()).toBe(0);
    });

    it('should set pending state while the load request is in flight', async () => {
      const subject = new Subject<OnboardingOutput>();
      mockOnboardingService.get.mockReturnValue(subject.asObservable());

      store.load();
      await flushEffects();

      expect(store.isLoading()).toBe(true);
      expect(store.isBusy()).toBe(true);

      subject.next(onboarding);
      subject.complete();
    });

    it('should normalize the error and dispatch loadFailed on failure', async () => {
      mockOnboardingService.get.mockReturnValue(throwError(() => new Error('boom')));

      store.load();
      await flushEffects();

      expect(store.loadCallState().status).toBe('error');
      expect(store.loadError()).not.toBeNull();
      expect(store.loadError()?.message).toBeDefined();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] loadFailed' }),
      );
    });
  });

  describe('start', () => {
    it('should normalize the error and dispatch startFailed on failure', async () => {
      mockOnboardingService.start.mockReturnValue(throwError(() => new Error('start failed')));

      store.start({ reset: false });
      await flushEffects();

      expect(store.startCallState().status).toBe('error');
      expect(store.startCallState().error).not.toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] startFailed' }),
      );
    });
  });

  describe('initialize', () => {
    it('should normalize the error and dispatch startFailed when the bootstrap request fails', async () => {
      mockOnboardingService.start.mockReturnValue(throwError(() => new Error('bootstrap failed')));

      await store.initialize({ reset: false });

      expect(store.startCallState().status).toBe('error');
      expect(
        transferState.get(makeStateKey<OnboardingOutput | null>('organization-onboarding'), null),
      ).toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] startFailed' }),
      );
    });

    it('should skip bootstrapping when a start request is already pending', async () => {
      mockOnboardingService.start.mockReturnValue(of(onboarding));

      const firstInit = store.initialize({ reset: false });
      const secondInit = store.initialize({ reset: false });
      await Promise.all([firstInit, secondInit]);

      expect(mockOnboardingService.start).toHaveBeenCalledTimes(1);
    });

    it('should not bootstrap on the server without transferred state and should call start', async () => {
      configure('server');
      mockOnboardingService.start.mockReturnValue(of(onboarding));

      await store.initialize({ reset: false });

      expect(mockOnboardingService.start).toHaveBeenCalledWith({ reset: false });
      expect(store.onboarding()).toEqual(onboarding);
    });
  });

  describe('executeStep', () => {
    it('should execute a step and refresh the onboarding record', async () => {
      const refreshed: OnboardingOutput = { ...onboarding, nextStep: 'invite_members' };
      const subject = new Subject<OnboardingOutput>();
      mockOnboardingService.executeStep.mockReturnValue(subject.asObservable());

      store.executeStep({ stepKey: 'create_organization' });
      await flushEffects();

      expect(store.isExecutingStep()).toBe(true);
      expect(store.isBusy()).toBe(true);

      subject.next(refreshed);
      subject.complete();
      await flushEffects();

      expect(mockOnboardingService.executeStep).toHaveBeenCalledWith('create_organization');
      expect(store.executeStepCallState().status).toBe('success');
      expect(store.isExecutingStep()).toBe(false);
      expect(store.onboarding()).toEqual(refreshed);
      expect(store.nextStep()).toBe('invite_members');
    });

    it('should normalize the error, expose executeStepError and dispatch executeStepFailed', async () => {
      mockOnboardingService.executeStep.mockReturnValue(
        throwError(() => new Error('execute failed')),
      );

      store.executeStep({ stepKey: 'create_organization' });
      await flushEffects();

      expect(store.executeStepCallState().status).toBe('error');
      expect(store.executeStepError()).not.toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] executeStepFailed' }),
      );
    });
  });

  describe('resetExecuteStepOperation', () => {
    it('should reset the execute-step call state back to idle', async () => {
      mockOnboardingService.executeStep.mockReturnValue(
        throwError(() => new Error('execute failed')),
      );

      store.executeStep({ stepKey: 'create_organization' });
      await flushEffects();
      expect(store.executeStepCallState().status).toBe('error');

      store.resetExecuteStepOperation();

      expect(store.executeStepCallState().status).toBe('idle');
      expect(store.executeStepError()).toBeNull();
    });
  });

  describe('skipStep', () => {
    it('should skip a step and refresh the onboarding record', async () => {
      const refreshed: OnboardingOutput = { ...onboarding, nextStep: 'invite_members' };
      const subject = new Subject<OnboardingOutput>();
      mockOnboardingService.skipStep.mockReturnValue(subject.asObservable());

      store.skipStep('create_organization');
      await flushEffects();

      expect(store.isSkippingStep()).toBe(true);

      subject.next(refreshed);
      subject.complete();
      await flushEffects();

      expect(mockOnboardingService.skipStep).toHaveBeenCalledWith('create_organization');
      expect(store.skipStepCallState().status).toBe('success');
      expect(store.isSkippingStep()).toBe(false);
      expect(store.onboarding()).toEqual(refreshed);
    });

    it('should normalize the error and dispatch skipStepFailed on failure', async () => {
      mockOnboardingService.skipStep.mockReturnValue(throwError(() => new Error('skip failed')));

      store.skipStep('create_organization');
      await flushEffects();

      expect(store.skipStepCallState().status).toBe('error');
      expect(store.skipStepCallState().error).not.toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] skipStepFailed' }),
      );
    });
  });

  describe('rollback', () => {
    it('should roll back the last completed step', async () => {
      const rolledBack: OnboardingOutput = { ...onboarding, canRollback: false };
      const subject = new Subject<OnboardingOutput>();
      mockOnboardingService.rollback.mockReturnValue(subject.asObservable());

      store.rollback();
      await flushEffects();

      expect(store.isRollingBack()).toBe(true);

      subject.next(rolledBack);
      subject.complete();
      await flushEffects();

      expect(mockOnboardingService.rollback).toHaveBeenCalledTimes(1);
      expect(store.rollbackCallState().status).toBe('success');
      expect(store.isRollingBack()).toBe(false);
      expect(store.canRollback()).toBe(false);
    });

    it('should normalize the error and dispatch rollbackFailed on failure', async () => {
      mockOnboardingService.rollback.mockReturnValue(
        throwError(() => new Error('rollback failed')),
      );

      store.rollback();
      await flushEffects();

      expect(store.rollbackCallState().status).toBe('error');
      expect(store.rollbackCallState().error).not.toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] rollbackFailed' }),
      );
    });
  });

  describe('dismiss', () => {
    it('should normalize the error and dispatch dismissFailed on failure', async () => {
      mockOnboardingService.start.mockReturnValue(of(onboarding));
      mockOnboardingService.dismiss.mockReturnValue(throwError(() => new Error('dismiss failed')));

      store.start({ reset: false });
      store.dismiss();
      await flushEffects();

      expect(store.dismissCallState().status).toBe('error');
      expect(store.dismissCallState().error).not.toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] dismissFailed' }),
      );
    });
  });

  describe('resume', () => {
    it('should normalize the error and dispatch resumeFailed on failure', async () => {
      mockOnboardingService.start.mockReturnValue(
        of({ ...onboarding, dismissed: true, dismissedAt: '2026-04-15T11:00:00Z' }),
      );
      mockOnboardingService.resume.mockReturnValue(throwError(() => new Error('resume failed')));

      store.start({ reset: false });
      store.resume();
      await flushEffects();

      expect(store.resumeCallState().status).toBe('error');
      expect(store.resumeCallState().error).not.toBeNull();
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Onboarding Store] resumeFailed' }),
      );
    });
  });

  describe('clear', () => {
    it('should reset the store back to its initial idle state', async () => {
      mockOnboardingService.start.mockReturnValue(of(onboarding));

      store.start({ reset: false });
      expect(store.onboarding()).toEqual(onboarding);

      store.clear();

      expect(store.onboarding()).toBeNull();
      expect(store.startCallState().status).toBe('idle');
      expect(store.loadCallState().status).toBe('idle');
      expect(store.executeStepCallState().status).toBe('idle');
      expect(store.skipStepCallState().status).toBe('idle');
      expect(store.rollbackCallState().status).toBe('idle');
      expect(store.dismissCallState().status).toBe('idle');
      expect(store.resumeCallState().status).toBe('idle');
      expect(store.isActivationVisible()).toBe(false);
    });
  });

  describe('ensureLoaded', () => {
    it('should return the cached record synchronously without calling the API', async () => {
      mockOnboardingService.start.mockReturnValue(of(onboarding));
      store.start({ reset: false });

      const result = await new Promise<OnboardingOutput | null>((resolve) => {
        store.ensureLoaded().subscribe((value) => resolve(value));
      });

      expect(result).toEqual(onboarding);
      expect(mockOnboardingService.get).not.toHaveBeenCalled();
    });

    it('should fetch and patch the record when not already loaded', async () => {
      mockOnboardingService.get.mockReturnValue(of(onboarding));

      const result = await new Promise<OnboardingOutput | null>((resolve) => {
        store.ensureLoaded().subscribe((value) => resolve(value));
      });

      expect(result).toEqual(onboarding);
      expect(mockOnboardingService.get).toHaveBeenCalledTimes(1);
      expect(store.onboarding()).toEqual(onboarding);
      expect(store.loadCallState().status).toBe('success');
    });

    it('should resolve to null and stay non-blocking when the API call fails', async () => {
      mockOnboardingService.get.mockReturnValue(throwError(() => new Error('network error')));

      const result = await new Promise<OnboardingOutput | null>((resolve) => {
        store.ensureLoaded().subscribe((value) => resolve(value));
      });

      expect(result).toBeNull();
      expect(store.onboarding()).toBeNull();
    });
  });

  describe('additional computed signals', () => {
    it('should expose isBlocked, blockedReason and isDismissed when the workflow is blocked', () => {
      mockOnboardingService.start.mockReturnValue(
        of({ ...onboarding, state: 'blocked', blockedReason: 'missing_payment_method' }),
      );

      store.start({ reset: false });

      expect(store.isBlocked()).toBe(true);
      expect(store.isInProgress()).toBe(false);
      expect(store.blockedReason()).toBe('missing_payment_method');
    });

    it('should default computed signals to their empty values before any data is loaded', () => {
      expect(store.state()).toBeNull();
      expect(store.isCompleted()).toBe(false);
      expect(store.isBlocked()).toBe(false);
      expect(store.isInProgress()).toBe(false);
      expect(store.nextStep()).toBeNull();
      expect(store.steps()).toEqual([]);
      expect(store.completedSteps()).toEqual([]);
      expect(store.canRollback()).toBe(false);
      expect(store.blockedReason()).toBeNull();
      expect(store.targetOrganizationId()).toBeNull();
      expect(store.targetOrganizationName()).toBeNull();
      expect(store.activeStepIndex()).toBe(0);
      expect(store.isDismissed()).toBe(false);
      expect(store.isActivationVisible()).toBe(false);
      expect(store.isBusy()).toBe(false);
    });

    it('should compute activeStepIndex as the steps length when no next step remains', () => {
      mockOnboardingService.start.mockReturnValue(
        of({
          ...onboarding,
          nextStep: null,
          steps: [
            { key: 'create_organization', status: 'completed' } as unknown as OnboardingStepOutput,
            { key: 'invite_members', status: 'completed' } as unknown as OnboardingStepOutput,
          ],
        }),
      );

      store.start({ reset: false });

      expect(store.activeStepIndex()).toBe(2);
    });

    it('should expose completedSteps from the onboarding record', () => {
      mockOnboardingService.start.mockReturnValue(
        of({ ...onboarding, completedSteps: ['create_organization'] }),
      );

      store.start({ reset: false });

      expect(store.completedSteps()).toEqual(['create_organization']);
    });
  });

  describe('session teardown', () => {
    /**
     * Needs the real `Dispatcher`: the store reacts through `Events`, which only
     * sees what a genuine dispatcher publishes.
     */
    const configureWithRealDispatcher = () => {
      mockOnboardingService = {
        get: vi.fn(),
        start: vi.fn(),
        executeStep: vi.fn(),
        skipStep: vi.fn(),
        rollback: vi.fn(),
        dismiss: vi.fn(),
        resume: vi.fn(),
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'browser' },
          { provide: OnboardingService, useValue: mockOnboardingService },
        ],
      });

      store = TestBed.inject(OnboardingStore);
    };

    it('should drop the previous user record when the session ends', async () => {
      configureWithRealDispatcher();
      mockOnboardingService.get.mockReturnValue(of(onboarding));

      await firstValueFrom(store.ensureLoaded());
      expect(store.onboarding()).toEqual(onboarding);

      TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());

      expect(store.onboarding()).toBeNull();
    });

    it('should refetch for the next user instead of reusing the previous record', async () => {
      configureWithRealDispatcher();
      mockOnboardingService.get.mockReturnValue(of(onboarding));

      await firstValueFrom(store.ensureLoaded());
      expect(mockOnboardingService.get).toHaveBeenCalledTimes(1);

      TestBed.inject(Dispatcher).dispatch(authStoreEvents.sessionEnded());

      // Left populated, `ensureLoaded()` would hand the access guards the departing
      // user's record and gate the next one on somebody else's activation state.
      await firstValueFrom(store.ensureLoaded());
      expect(mockOnboardingService.get).toHaveBeenCalledTimes(2);
    });
  });
});
