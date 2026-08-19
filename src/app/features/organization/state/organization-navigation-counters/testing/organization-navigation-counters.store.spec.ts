import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
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
    selectedOrganizationId = signal<string | null>(null);
    mockOrganizationService = {
      navigationCounters: vi.fn().mockReturnValue(of(counters)),
    };

    TestBed.configureTestingModule({
      providers: [
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
});
