import { HttpErrorResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  OrganizationSetupService,
  type SetupFacilityAddressMatch,
} from '@features/organization/setup';
import {
  FacilityAddressSearchStore,
  type FacilityAddressSearchStoreType,
} from '../facility-address-search.store';

const MATCH: SetupFacilityAddressMatch = Object.freeze({
  displayName: '1 Rue de la Paix, Paris, France',
  latitude: 48.8686,
  longitude: 2.3314,
});

describe('FacilityAddressSearchStore', () => {
  let store: FacilityAddressSearchStoreType;
  let service: { searchFacilityAddresses: ReturnType<typeof vi.fn> };
  beforeEach(() => {
    vi.useFakeTimers();
    service = { searchFacilityAddresses: vi.fn(() => of([MATCH])) };
    TestBed.configureTestingModule({
      providers: [
        FacilityAddressSearchStore,
        { provide: OrganizationSetupService, useValue: service },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
    store = TestBed.inject(FacilityAddressSearchStore);
  });
  afterEach(() => vi.useRealTimers());

  it('does not request suggestions before input has settled for 500 milliseconds', async () => {
    const params = Object.freeze({ organizationId: 'org', query: '  1 Rue de la Paix  ' });
    store.search(params);
    expect(store.loading()).toBe(true);
    await vi.advanceTimersByTimeAsync(499);
    expect(service.searchFacilityAddresses).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(service.searchFacilityAddresses).toHaveBeenCalledExactlyOnceWith(
      'org',
      '1 Rue de la Paix',
    );
    expect(store.matches()).toEqual([MATCH]);
    expect(store.loading()).toBe(false);
    expect(store.notFound()).toBe(false);
    expect(params.query).toBe('  1 Rue de la Paix  ');
  });

  it('cancels the old HTTP response immediately when the address changes', async () => {
    const old = new Subject<readonly SetupFacilityAddressMatch[]>();
    service.searchFacilityAddresses.mockReturnValueOnce(old);
    store.search({ organizationId: 'org', query: 'old address' });
    await vi.advanceTimersByTimeAsync(500);
    expect(old.observed).toBe(true);
    store.search({ organizationId: 'org', query: 'new address' });
    expect(old.observed).toBe(false);
    old.next([{ ...MATCH, displayName: 'Obsolete' }]);
    expect(store.matches()).toEqual([]);
    await vi.advanceTimersByTimeAsync(500);
    expect(store.matches()).toEqual([MATCH]);
  });

  it('cancels a delayed search when the query becomes too short', async () => {
    store.search({ organizationId: 'org', query: 'Paris' });
    await vi.advanceTimersByTimeAsync(300);
    store.search({ organizationId: 'org', query: ' Pa ' });
    await vi.advanceTimersByTimeAsync(500);
    expect(service.searchFacilityAddresses).not.toHaveBeenCalled();
    expect(store.loading()).toBe(false);
    expect(store.notFound()).toBe(false);
  });

  it('cancels a request and clears state when leaving the step or editing the draft', async () => {
    const pending = new Subject<readonly SetupFacilityAddressMatch[]>();
    service.searchFacilityAddresses.mockReturnValueOnce(pending);
    store.search({ organizationId: 'org', query: 'Paris' });
    await vi.advanceTimersByTimeAsync(500);
    store.clear();
    expect(pending.observed).toBe(false);
    pending.error(new Error('Obsolete error'));
    expect(store.error()).toBeNull();
    expect(store.matches()).toEqual([]);
    expect(store.loading()).toBe(false);
    expect(store.notFound()).toBe(false);
  });

  it('represents a successful empty list separately from an error', async () => {
    service.searchFacilityAddresses.mockReturnValueOnce(of([]));
    store.search({ organizationId: 'org', query: 'No such address' });
    await vi.advanceTimersByTimeAsync(500);
    expect(store.notFound()).toBe(true);
    expect(store.error()).toBeNull();
    expect(store.matches()).toEqual([]);
  });

  it.each([0, 403, 404, 429, 503])(
    'preserves HTTP %s as an error rather than no matches',
    async (status) => {
      service.searchFacilityAddresses.mockReturnValueOnce(
        throwError(() => new HttpErrorResponse({ status })),
      );
      store.search({ organizationId: 'org', query: 'Paris' });
      await vi.advanceTimersByTimeAsync(500);
      expect(store.error()?.code).toBe(status);
      expect(store.notFound()).toBe(false);
      store.search({ organizationId: 'org', query: 'Paris' });
      expect(store.error()).toBeNull();
      await vi.advanceTimersByTimeAsync(500);
      expect(store.matches()).toEqual([MATCH]);
    },
  );

  it('does not show results from the previous organization', async () => {
    const previous = new Subject<readonly SetupFacilityAddressMatch[]>();
    service.searchFacilityAddresses.mockReturnValueOnce(previous);
    store.search({ organizationId: 'org', query: 'Paris' });
    await vi.advanceTimersByTimeAsync(500);
    store.search({ organizationId: 'another', query: 'Paris' });
    expect(previous.observed).toBe(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(service.searchFacilityAddresses).toHaveBeenLastCalledWith('another', 'Paris');
  });

  it('does not call the API during server rendering', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        FacilityAddressSearchStore,
        { provide: OrganizationSetupService, useValue: service },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const serverStore = TestBed.inject(FacilityAddressSearchStore);
    serverStore.search({ organizationId: 'org', query: 'Paris' });
    await vi.advanceTimersByTimeAsync(500);
    expect(service.searchFacilityAddresses).not.toHaveBeenCalled();
    expect(serverStore.loading()).toBe(false);
  });
});
