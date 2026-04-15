import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { OnboardingService } from '@features/onboarding/data-access';
import type { OnboardingOutput } from '@features/onboarding/models';
import { OnboardingStore } from '../onboarding.store';

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
  };

  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOnboardingService: {
    get: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    executeStep: ReturnType<typeof vi.fn>;
    skipStep: ReturnType<typeof vi.fn>;
    rollback: ReturnType<typeof vi.fn>;
  };

  const configure = (platformId: 'browser' | 'server' = 'browser') => {
    mockDispatcher = { dispatch: vi.fn() };
    mockOnboardingService = {
      get: vi.fn(),
      start: vi.fn(),
      executeStep: vi.fn(),
      skipStep: vi.fn(),
      rollback: vi.fn(),
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

  it('should reuse transferred onboarding on the browser without calling the API', async () => {
    transferState.set(makeStateKey<OnboardingOutput | null>('organization-onboarding'), onboarding);

    await store.initialize({ reset: false });

    expect(mockOnboardingService.start).not.toHaveBeenCalled();
    expect(store.onboarding()).toEqual(onboarding);
    expect(store.startCallState().status).toBe('success');
  });

  it('should fetch onboarding and write it to transfer state when not hydrated', async () => {
    mockOnboardingService.start.mockReturnValue(of(onboarding));

    await store.initialize({ reset: false });

    expect(mockOnboardingService.start).toHaveBeenCalledWith({ reset: false });
    expect(store.onboarding()).toEqual(onboarding);
    expect(
      transferState.get(makeStateKey<OnboardingOutput | null>('organization-onboarding'), null),
    ).toEqual(onboarding);
  });

  it('should only bootstrap onboarding once when state is already present', async () => {
    mockOnboardingService.start.mockReturnValue(of(onboarding));

    await store.initialize({ reset: false });
    await store.initialize({ reset: false });

    expect(mockOnboardingService.start).toHaveBeenCalledTimes(1);
  });
});
