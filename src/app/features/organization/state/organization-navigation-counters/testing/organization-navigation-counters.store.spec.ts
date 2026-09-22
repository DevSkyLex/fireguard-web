import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { OrganizationService } from '@features/organization/data-access';
import type { OrganizationNavigationCountersOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization';
import { OrganizationNavigationCountersStore } from '../organization-navigation-counters.store';

const flushEffects = async (): Promise<void> => {
  const testBedWithFlush = TestBed as typeof TestBed & {
    flushEffects?: () => void;
  };

  testBedWithFlush.flushEffects?.();
  await Promise.resolve();
};

describe('OrganizationNavigationCountersStore', () => {
  const sessionRevision = signal(0);
  const isAuthenticated = signal(true);
  let store: OrganizationNavigationCountersStore;
  let selectedOrganizationId: WritableSignal<string | null>;
  let mockOrganizationService: {
    navigationCounters: ReturnType<typeof vi.fn>;
  };

  const counters: OrganizationNavigationCountersOutput = {
    '@id': '/api/organizations/org-1/navigation-counters',
    '@type': 'OrganizationNavigationCounters',
    openInterventions: 4,
    openNonConformities: 2,
    submittedInterventions: 7,
  };

  beforeEach(() => {
    sessionRevision.set(0);
    isAuthenticated.set(true);
    selectedOrganizationId = signal<string | null>(null);
    mockOrganizationService = {
      navigationCounters: vi.fn().mockReturnValue(of(counters)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated, sessionRevision } },
        { provide: ActiveOrganizationStore, useValue: { selectedOrganizationId } },
        { provide: OrganizationService, useValue: mockOrganizationService },
      ],
    });

    store = TestBed.inject(OrganizationNavigationCountersStore);
  });

  it('should stay idle while no organization is active', async () => {
    await flushEffects();

    expect(mockOrganizationService.navigationCounters).not.toHaveBeenCalled();
    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(false);
    expect(store.submittedInterventions()).toBe(0);
  });

  it('should transition idle to pending to success when an organization becomes active', async () => {
    const response = new Subject<OrganizationNavigationCountersOutput>();
    mockOrganizationService.navigationCounters.mockReturnValue(response.asObservable());

    selectedOrganizationId.set('org-1');
    await flushEffects();

    expect(mockOrganizationService.navigationCounters).toHaveBeenCalledWith('org-1');
    expect(store.isQueryLoading()).toBe(true);
    expect(store.isQueryLoaded()).toBe(false);

    response.next(counters);
    response.complete();
    await flushEffects();

    expect(store.isQueryLoading()).toBe(false);
    expect(store.isQueryLoaded()).toBe(true);
    expect(store.submittedInterventions()).toBe(7);
    expect(store.openInterventions()).toBe(4);
    expect(store.openNonConformities()).toBe(2);
  });

  it('should normalize a failed load into a StoreError and keep the counters at zero', async () => {
    const apiError = {
      '@id': '',
      '@type': 'Error',
      status: 403,
      title: 'Forbidden',
      detail: 'Not a member.',
    };
    mockOrganizationService.navigationCounters.mockReturnValue(throwError(() => apiError));

    selectedOrganizationId.set('org-1');
    await flushEffects();

    expect(store.queryHasError()).toBe(true);
    expect(store.queryError()).toEqual({
      error: apiError,
      message: 'Not a member.',
      code: 403,
      retryable: false,
      timestamp: expect.any(Number),
    });
    expect(store.submittedInterventions()).toBe(0);
  });

  it('should not refetch when the same organization id is seen again', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();

    selectedOrganizationId.set('org-1');
    await flushEffects();

    expect(mockOrganizationService.navigationCounters).toHaveBeenCalledTimes(1);
  });

  it('should reload when the active organization switches to a different one', async () => {
    const secondCounters: OrganizationNavigationCountersOutput = {
      ...counters,
      submittedInterventions: 1,
    };
    mockOrganizationService.navigationCounters
      .mockReturnValueOnce(of(counters))
      .mockReturnValueOnce(of(secondCounters));

    selectedOrganizationId.set('org-1');
    await flushEffects();

    selectedOrganizationId.set('org-2');
    await flushEffects();

    expect(mockOrganizationService.navigationCounters).toHaveBeenCalledTimes(2);
    expect(mockOrganizationService.navigationCounters).toHaveBeenNthCalledWith(2, 'org-2');
    expect(store.submittedInterventions()).toBe(1);
  });

  it('should clear to idle once the organization context is lost', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();

    selectedOrganizationId.set(null);
    await flushEffects();

    expect(store.isQueryLoaded()).toBe(false);
    expect(store.isQueryLoading()).toBe(false);
    expect(store.queryHasError()).toBe(false);
    expect(store.submittedInterventions()).toBe(0);
  });
  it('drops counters immediately on organization replacement and cancels reads when cleared', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();
    const response = new Subject<OrganizationNavigationCountersOutput>();
    mockOrganizationService.navigationCounters.mockReturnValueOnce(response);
    selectedOrganizationId.set('org-2');
    await flushEffects();
    expect(store.submittedInterventions()).toBe(0);
    expect(store.isQueryLoading()).toBe(true);
    store.clear();
    expect(response.observed).toBe(false);
    response.next(counters);
    expect(store.submittedInterventions()).toBe(0);
    expect(store.isQueryLoading()).toBe(false);
  });

  it('retains same-context counters during refresh and retries after failure', async () => {
    selectedOrganizationId.set('org-1');
    await flushEffects();
    const response = new Subject<OrganizationNavigationCountersOutput>();
    mockOrganizationService.navigationCounters.mockReturnValueOnce(response);
    store.load('org-1');
    expect(store.submittedInterventions()).toBe(7);
    response.error(new Error('offline'));
    expect(store.submittedInterventions()).toBe(7);
    store.load('org-1');
    expect(store.isQueryLoaded()).toBe(true);
    expect(mockOrganizationService.navigationCounters).toHaveBeenCalledTimes(3);
  });

  it('reloads the remembered organization for a new session and ignores the old session response', async () => {
    const response = new Subject<OrganizationNavigationCountersOutput>();
    mockOrganizationService.navigationCounters.mockReturnValueOnce(response);
    selectedOrganizationId.set('org-1');
    await flushEffects();
    sessionRevision.update((revision) => revision + 1);
    await flushEffects();
    expect(response.observed).toBe(false);
    expect(mockOrganizationService.navigationCounters).toHaveBeenCalledTimes(2);
    response.next({ ...counters, submittedInterventions: 99 });
    expect(store.submittedInterventions()).toBe(7);
    isAuthenticated.set(false);
    sessionRevision.update((revision) => revision + 1);
    await flushEffects();
    expect(store.submittedInterventions()).toBe(0);
    expect(mockOrganizationService.navigationCounters).toHaveBeenCalledTimes(2);
  });
});
