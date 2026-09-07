import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { Subject, defer, of, throwError } from 'rxjs';
import { OnboardingService } from '@features/onboarding/data-access';
import type {
  OnboardingOutput,
  OnboardingSetupOperation,
  PrepareOnboardingSetupInput,
} from '@features/onboarding/models';
import { OrganizationSetupService } from '@features/organization/setup';
import { OnboardingSetupStore } from '../setup.store';

const emptyFlow: OnboardingOutput & { setupOperations: readonly OnboardingSetupOperation[] } = {
  '@id': '/api/onboarding/organization',
  '@type': 'OrganizationOnboarding',
  sessionId: 'session-1',
  setupOperations: [],
  flow: 'organization',
  state: 'in_progress',
  nextStep: 'create_first_facility',
  blockedReason: null,
  completedSteps: [],
  skippedSteps: [],
  steps: [],
  stepHistory: [],
  targetOrganizationId: 'org-1',
  targetOrganizationName: 'Acme',
  canRollback: false,
  lastRollbackableStep: null,
  rollbackMethod: null,
  rollbackPath: null,
  updatedAt: null,
  dismissed: false,
  dismissedAt: null,
};
const first = { name: 'Main office', type: 'site' };
const second = { name: 'Warehouse', type: 'site' };
const receipt = (
  itemKey: string,
  payload = first,
  completed = false,
): OnboardingSetupOperation => ({
  stepKey: 'create_first_facility',
  itemKey,
  payload,
  status: completed ? 'completed' : 'prepared',
  resourceId: completed ? `facility-${itemKey}` : null,
});

const required = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('Expected fixture item');
  return value;
};

describe('OnboardingSetupStore', () => {
  let store: InstanceType<typeof OnboardingSetupStore>;
  let flow: typeof emptyFlow;
  const service = { get: vi.fn(), prepareSetup: vi.fn() };
  const setup = {
    createOrganization: vi.fn(),
    inviteMembers: vi.fn(),
    createFacilities: vi.fn(),
    createEquipment: vi.fn(),
  };
  const dispatcher = { dispatch: vi.fn() };
  const commandDispatch = vi.fn();
  const configure = (platform = 'browser') => {
    TestBed.configureTestingModule({
      providers: [
        OnboardingSetupStore,
        { provide: PLATFORM_ID, useValue: platform },
        { provide: OnboardingService, useValue: service },
        { provide: OrganizationSetupService, useValue: setup },
        { provide: Dispatcher, useValue: dispatcher },
      ],
    });
    store = TestBed.inject(OnboardingSetupStore);
  };
  const complete = (itemKey: string) => {
    flow = {
      ...flow,
      setupOperations: flow.setupOperations.map((entry) =>
        entry.itemKey === itemKey
          ? Object.assign({}, entry, {
              status: 'completed' as const,
              resourceId: `facility-${itemKey}`,
            })
          : entry,
      ),
    };
  };
  beforeEach(() => {
    vi.resetAllMocks();
    dispatcher.dispatch.mockImplementation((event: { type: string }) => {
      if (event.type !== '[Onboarding Setup] snapshotUpdated') commandDispatch(event);
    });
    flow = { ...emptyFlow, setupOperations: [] };
    service.get.mockImplementation(() => of(flow));
    service.prepareSetup.mockImplementation((input: PrepareOnboardingSetupInput) => {
      const completed = flow.setupOperations.filter((entry) => entry.status === 'completed');
      flow = {
        ...flow,
        setupOperations: [
          ...completed,
          ...input.items
            .filter((item) => !completed.some((entry) => entry.itemKey === item.itemKey))
            .map((item) =>
              Object.assign({}, item, {
                stepKey: input.stepKey,
                status: 'prepared' as const,
                resourceId: null,
              }),
            ),
        ],
      };
      return of(flow);
    });
    setup.createFacilities.mockImplementation(
      (_org: string, _payload: unknown, context: { onboardingItemKey: string }) => {
        complete(context.onboardingItemKey);
        return of([]);
      },
    );
    configure();
  });
  const run = (payloads = [first]) => store.run({ stepKey: 'create_first_facility', payloads });

  it('persists the complete batch before the first creation and passes stable session/item keys', () => {
    const prepared = new Subject<OnboardingOutput>();
    service.prepareSetup.mockReturnValue(prepared);
    store.load(flow);
    run();
    expect(setup.createFacilities).not.toHaveBeenCalled();
    const input = service.prepareSetup.mock.calls[0]?.[0] as PrepareOnboardingSetupInput;
    expect(input.sessionId).toBe('session-1');
    expect(input.items[0]?.payload).toEqual(first);
    flow = { ...flow, setupOperations: [receipt(required(input.items[0]).itemKey)] };
    prepared.next(flow);
    prepared.complete();
    expect(setup.createFacilities).toHaveBeenCalledExactlyOnceWith('org-1', [first], {
      onboardingSessionId: 'session-1',
      onboardingItemKey: required(input.items[0]).itemKey,
    });
    expect(store.batchCallState().status).toBe('success');
    expect(commandDispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: '[Onboarding Setup] completed' }),
    );
  });

  it('restores a partial batch after reload and only creates the unfinished item', () => {
    flow = {
      ...flow,
      setupOperations: [receipt('saved', first, true), receipt('pending', second)],
    };
    store.load(null);
    expect(store.operations()).toHaveLength(2);
    run([first, second]);
    expect(setup.createFacilities).toHaveBeenCalledExactlyOnceWith('org-1', [second], {
      onboardingSessionId: 'session-1',
      onboardingItemKey: 'pending',
    });
    expect(store.operations().every((entry) => entry.status === 'completed')).toBe(true);
  });

  it('confirms a completed batch without recreating it or consuming quota', () => {
    flow = { ...flow, setupOperations: [receipt('saved', first, true)] };
    store.load(flow);
    run();
    expect(setup.createFacilities).not.toHaveBeenCalled();
    expect(store.batchCallState().status).toBe('success');
  });

  it('recovers a lost creation response using the committed server receipt', () => {
    setup.createFacilities.mockImplementation(
      (_org: string, _payload: unknown, context: { onboardingItemKey: string }) =>
        defer(() => {
          complete(context.onboardingItemKey);
          return throwError(() => new Error('Response lost'));
        }),
    );
    store.load(flow);
    run();
    expect(store.batchCallState().status).toBe('success');
    expect(store.failedItemKeys()).toEqual([]);
    expect(commandDispatch).toHaveBeenCalledOnce();
  });

  it('keeps prepared keys when the refresh response is lost and safely replays them', () => {
    service.get.mockReturnValueOnce(throwError(() => new Error('Offline')));
    store.load(flow);
    run();
    const originalKey = required(store.operations()[0]).itemKey;
    expect(store.batchCallState().status).toBe('error');
    run();
    const retried = service.prepareSetup.mock.calls[1]?.[0] as PrepareOnboardingSetupInput;
    expect(retried.items[0]?.itemKey).toBe(originalKey);
    expect(setup.createFacilities).toHaveBeenCalledOnce();
    expect(store.batchCallState().status).toBe('success');
  });

  it('retains successful rows and emits only one failure for a partial batch', () => {
    setup.createFacilities.mockImplementation(
      (_org: string, _payload: unknown, context: { onboardingItemKey: string }) => {
        const payload = flow.setupOperations.find(
          (entry) => entry.itemKey === context.onboardingItemKey,
        )?.payload;
        if (payload && 'name' in payload && payload.name === first.name) {
          complete(context.onboardingItemKey);
          return of([]);
        }
        return throwError(() => new Error('Quota reached'));
      },
    );
    store.load(flow);
    run([first, second]);
    expect(store.operations().map((entry) => entry.status)).toEqual(['completed', 'prepared']);
    expect(store.failedItemKeys()).toHaveLength(1);
    expect(commandDispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ type: '[Onboarding Setup] failed' }),
    );
  });

  it('blocks writes when preparation fails', () => {
    service.prepareSetup.mockReturnValue(throwError(() => new Error('Offline')));
    store.load(flow);
    run();
    expect(setup.createFacilities).not.toHaveBeenCalled();
    expect(store.batchCallState().status).toBe('error');
  });

  it('preserves the original API detail in the single failure feedback', () => {
    setup.createFacilities.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 409, error: { detail: 'Facility quota reached.' } }),
      ),
    );
    store.load(flow);
    run();
    expect(commandDispatch).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        payload: expect.objectContaining({ message: 'Facility quota reached.', code: 409 }),
      }),
    );
  });

  it.each([
    { ...emptyFlow, setupOperations: undefined },
    { ...emptyFlow, sessionId: 'another-session' },
    { ...emptyFlow, setupOperations: [] },
  ])('refuses an incomplete or foreign preparation response', (response) => {
    service.prepareSetup.mockReturnValue(of(response));
    store.load(flow);
    run();
    expect(setup.createFacilities).not.toHaveBeenCalled();
    expect(store.batchCallState().status).toBe('error');
  });

  it('does not progress until every server receipt is completed', () => {
    setup.createFacilities.mockReturnValue(of([]));
    store.load(flow);
    run();
    expect(store.batchCallState().status).toBe('error');
    expect(commandDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: '[Onboarding Setup] completed' }),
    );
  });

  it('blocks competing writes and journal refreshes while the batch is pending', () => {
    service.prepareSetup.mockReturnValue(new Subject<OnboardingOutput>());
    store.load(flow);
    run();
    run();
    store.load(null);
    expect(service.prepareSetup).toHaveBeenCalledOnce();
    expect(service.get).not.toHaveBeenCalled();
    expect(store.pending()).toBe(true);
  });

  it('does not reuse a previous ready state after a failed refresh', () => {
    store.load(flow);
    service.get.mockReturnValue(throwError(() => new Error('Offline')));
    store.load(null);
    run();
    expect(store.ready()).toBe(false);
    expect(service.prepareSetup).not.toHaveBeenCalled();
  });

  it('requires the secondary browser journal when the SSR handoff omitted it', () => {
    store.load({ ...flow, setupOperations: undefined });
    expect(service.get).toHaveBeenCalledOnce();
    expect(store.ready()).toBe(true);
  });

  it('does not load or create on the server', () => {
    TestBed.resetTestingModule();
    configure('server');
    store.load(null);
    run();
    expect(service.get).not.toHaveBeenCalled();
    expect(service.prepareSetup).not.toHaveBeenCalled();
  });
});
