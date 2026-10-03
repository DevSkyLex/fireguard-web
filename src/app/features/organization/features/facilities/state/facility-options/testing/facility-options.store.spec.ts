import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { AUTH_SESSION_PORT } from '@features/auth/ports';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityOptionsStore } from '../facility-options.store';

const facility = (
  id: string,
  name: string,
  type: string,
  path: readonly { id: string; name: string }[],
) => ({
  id,
  name,
  type,
  address: null,
  latitude: 48.85,
  longitude: 2.35,
  path,
});

describe('FacilityOptionsStore', () => {
  const sessionRevision = signal(0);
  const isAuthenticated = signal(true);
  let store: InstanceType<typeof FacilityOptionsStore>;
  let facilities: { get: ReturnType<typeof vi.fn>; list: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  const configure = (platformId: string): void => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_SESSION_PORT, useValue: { isAuthenticated, sessionRevision } },
        FacilityOptionsStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: facilities },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    store = TestBed.inject(FacilityOptionsStore);
  };

  beforeEach(() => {
    sessionRevision.set(0);
    isAuthenticated.set(true);
    dispatch = vi.fn();
    facilities = {
      get: vi.fn(),
      list: vi.fn().mockReturnValue(
        of({
          member: [
            facility('f-1', 'Head office', 'site', [{ id: 'f-1', name: 'Head office' }]),
            facility('f-2', 'Annex', 'building', [
              { id: 'f-1', name: 'Head office' },
              { id: 'f-2', name: 'Annex' },
            ]),
          ],
          totalItems: 2,
        }),
      ),
    };
  });

  it('should load the facilities once and derive the picker options', async () => {
    configure('browser');

    store.ensureLoaded('org-1');
    store.ensureLoaded('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(facilities.list).toHaveBeenCalledTimes(1);
    expect(facilities.list).toHaveBeenCalledWith('org-1', {
      page: 1,
      itemsPerPage: 200,
      includePath: true,
    });
    expect(store.options()).toEqual([
      {
        value: 'f-1',
        type: 'site',
        label: 'Head office',
        typeLabel: 'Site',
        pathLabel: null,
        address: null,
      },
      {
        value: 'f-2',
        type: 'building',
        label: 'Annex',
        typeLabel: 'Building',
        pathLabel: 'Head office',
        address: null,
      },
    ]);
    expect(store.mapCenter()).toEqual({ latitude: 48.85, longitude: 2.35 });
  });

  it('should not fetch on the server', () => {
    configure('server');

    store.ensureLoaded('org-1');

    expect(facilities.list).not.toHaveBeenCalled();
    expect(store.options()).toEqual([]);
  });

  it('should surface an error, clear the options and dispatch the failure', async () => {
    facilities.list.mockReturnValue(throwError(() => new Error('boom')));
    configure('browser');

    store.load('org-1');

    await vi.waitFor(() => expect(store.loading()).toBe(false));

    expect(store.options()).toEqual([]);
    expect(store.loadError()).not.toBeNull();
    expect(dispatch).toHaveBeenCalled();
  });
  it('clears options immediately for a new organization and cancels replaced reads', () => {
    configure('browser');
    store.ensureLoaded('org-1');
    const firstB = new Subject<HydraCollection<FacilityOutput>>();
    const secondA = new Subject<HydraCollection<FacilityOutput>>();
    facilities.list.mockReturnValueOnce(firstB).mockReturnValueOnce(secondA);
    store.ensureLoaded('org-2');
    expect(store.options()).toEqual([]);
    expect(store.mapCenter()).toBeUndefined();
    store.ensureLoaded('org-1');
    expect(firstB.observed).toBe(false);
    firstB.error(new Error('old request'));
    expect(store.loading()).toBe(true);
    expect(store.loadError()).toBeNull();
    secondA.next({ member: [], totalItems: 0 } as unknown as HydraCollection<FacilityOutput>);
    store.ensureLoaded('org-1');
    expect(facilities.list).toHaveBeenCalledTimes(3);
    expect(store.loadCallState().status).toBe('success');
  });

  it('retries failures and retains options only for a refresh of the same organization', () => {
    configure('browser');
    store.ensureLoaded('org-1');
    facilities.list.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.load('org-1');
    expect(store.options()).toHaveLength(2);
    expect(store.loadError()).not.toBeNull();
    store.ensureLoaded('org-1');
    expect(facilities.list).toHaveBeenCalledTimes(3);
    expect(store.loadError()).toBeNull();
  });

  it('cancels an old session and permits a new request for the same organization', () => {
    configure('browser');
    const response = new Subject<HydraCollection<FacilityOutput>>();
    facilities.list.mockReturnValueOnce(response);
    store.ensureLoaded('org-1');
    sessionRevision.update((revision) => revision + 1);
    store.ensureLoaded('org-1');
    expect(response.observed).toBe(false);
    expect(store.options()).toHaveLength(2);
    expect(facilities.list).toHaveBeenCalledTimes(2);
  });

  it('does not fetch on the server through the public load method', () => {
    configure('server');
    store.load('org-1');
    expect(facilities.list).not.toHaveBeenCalled();
  });

  it('reaches the 201st facility and sends search to the server at page one', () => {
    configure('browser');
    facilities.list.mockReturnValue(
      of({ member: [facility('f-201', 'Annex 201', 'site', [])], totalItems: 201 }),
    );
    store.load({ organizationId: 'org-1', page: 2 });
    expect(store.pageCount()).toBe(2);
    expect(store.options()[0].value).toBe('f-201');
    expect(facilities.list).toHaveBeenCalledWith('org-1', {
      page: 2,
      itemsPerPage: 200,
      includePath: true,
    });
    store.load({ organizationId: 'org-1', search: 'Annex' });
    expect(facilities.list).toHaveBeenLastCalledWith('org-1', {
      page: 1,
      itemsPerPage: 200,
      includePath: true,
      search: 'Annex',
    });
  });

  it('cancels a delayed server search when the owning scope is cleared', () => {
    vi.useFakeTimers();
    configure('browser');
    store.searchOptions({ organizationId: 'org-1', search: 'old scope' });
    store.clear();
    vi.advanceTimersByTime(300);
    expect(facilities.list).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
  it('keeps parent context across search/pages and hydrates an off-page selection', () => {
    configure('browser');
    facilities.get.mockReturnValue(of(facility('outside-page', 'Existing parent', 'site', [])));
    store.load({ organizationId: 'org-1', parentForFacilityId: 'moving-floor' });
    store.ensureSelected({ organizationId: 'org-1', facilityId: 'outside-page' });
    store.load({ organizationId: 'org-1', page: 2, search: 'remote' });
    expect(facilities.list).toHaveBeenLastCalledWith('org-1', {
      page: 2,
      itemsPerPage: 200,
      includePath: true,
      parentForFacilityId: 'moving-floor',
      search: 'remote',
    });
    expect(store.selectedOption()?.label).toBe('Existing parent');
    store.ensureLoaded({ organizationId: 'org-1', parentForType: 'building' });
    expect(facilities.list).toHaveBeenLastCalledWith('org-1', {
      page: 1,
      itemsPerPage: 200,
      includePath: true,
      parentForType: 'building',
    });
  });

  it('retains the intervention creation scope across pages and clears it for published creation', () => {
    configure('browser');
    store.ensureLoaded({
      organizationId: 'org-1',
      interventionId: 'intervention-1',
      parentForType: 'floor',
    });
    store.load({ organizationId: 'org-1', page: 2, search: 'North' });
    expect(facilities.list).toHaveBeenLastCalledWith('org-1', {
      page: 2,
      itemsPerPage: 200,
      includePath: true,
      interventionId: 'intervention-1',
      parentForType: 'floor',
      search: 'North',
    });
    store.ensureLoaded({ organizationId: 'org-1', parentForType: 'floor' });
    expect(facilities.list).toHaveBeenLastCalledWith('org-1', {
      page: 1,
      itemsPerPage: 200,
      includePath: true,
      parentForType: 'floor',
    });
    expect(store.interventionId()).toBeNull();
  });
});
