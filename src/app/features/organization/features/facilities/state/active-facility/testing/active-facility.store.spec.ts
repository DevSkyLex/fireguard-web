import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { NEVER, of, throwError } from 'rxjs';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '../active-facility.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveFacilityStore', () => {
  let store: ActiveFacilityStore;
  let dispatch: ReturnType<typeof vi.fn>;
  let mockFacilityService: {
    get: ReturnType<typeof vi.fn>;
  };

  const facility = { id: 'facility-1', name: 'HQ' } as unknown as FacilityOutput;

  beforeEach(() => {
    dispatch = vi.fn();
    mockFacilityService = {
      get: vi.fn().mockReturnValue(of(facility)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch } },
        { provide: FacilityService, useValue: mockFacilityService },
      ],
    });

    store = TestBed.inject(ActiveFacilityStore);
  });

  it('should resolve and expose the active facility', async () => {
    store.resolveFacility({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(mockFacilityService.get).toHaveBeenCalledWith('org-1', 'facility-1');
    expect(store.selectedFacility()).toEqual(facility);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the previous record while resolving a different id', () => {
    store.setFacility(facility);
    mockFacilityService.get.mockReturnValue(NEVER);

    store.resolveFacility({ organizationId: 'org-1', facilityId: 'facility-2' });

    expect(store.selectedFacility()).toBeNull();
    expect(store.getCallState().status).toBe('pending');
  });

  it('should keep the current record on screen while re-resolving the same id', () => {
    store.setFacility(facility);
    mockFacilityService.get.mockReturnValue(NEVER);

    store.resolveFacility({ organizationId: 'org-1', facilityId: 'facility-1' });

    expect(store.selectedFacility()).toEqual(facility);
    expect(store.getCallState().status).toBe('pending');
  });

  it('should record the failure and dispatch getFailed when the fetch errors', async () => {
    mockFacilityService.get.mockReturnValue(throwError(() => new Error('down')));

    store.resolveFacility({ organizationId: 'org-1', facilityId: 'facility-1' });
    await flushEffects();

    expect(store.selectedFacility()).toBeNull();
    expect(store.getCallState().status).toBe('error');
    expect(dispatch).toHaveBeenCalled();
  });

  it('should clear the selected facility', () => {
    store.setFacility(facility);
    store.clear();

    expect(store.selectedFacility()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
