import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import { FacilityService } from '@features/organization/features/facilities/data-access';
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
  let store: InstanceType<typeof FacilityOptionsStore>;
  let facilities: { list: ReturnType<typeof vi.fn> };
  let dispatch: ReturnType<typeof vi.fn>;

  const configure = (platformId: string): void => {
    TestBed.configureTestingModule({
      providers: [
        FacilityOptionsStore,
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: facilities },
        { provide: PLATFORM_ID, useValue: platformId },
      ],
    });
    store = TestBed.inject(FacilityOptionsStore);
  };

  beforeEach(() => {
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
});
