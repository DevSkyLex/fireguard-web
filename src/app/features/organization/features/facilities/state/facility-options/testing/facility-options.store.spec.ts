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
  let facilities: { list: ReturnType<typeof vi.fn> };
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
    expect(facilities.list).toHaveBeenCalledWith('org-1', { itemsPerPage: 200 });
    expect(store.options()).toEqual([
      { value: 'f-1', label: 'Head office', typeLabel: 'Site', pathLabel: null, address: null },
      {
        value: 'f-2',
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
});
