import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '../active-facility.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ActiveFacilityStore', () => {
  let store: ActiveFacilityStore;
  let mockFacilityService: {
    get: ReturnType<typeof vi.fn>;
  };

  const facility = { id: 'facility-1', name: 'HQ' } as unknown as FacilityOutput;

  beforeEach(() => {
    mockFacilityService = {
      get: vi.fn().mockReturnValue(of(facility)),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: FacilityService, useValue: mockFacilityService },
      ],
    });

    store = TestBed.inject(ActiveFacilityStore);
  });

  it('should resolve and expose the active facility', async () => {
    store.resolveFacility('org-1', 'facility-1').subscribe();
    await flushEffects();

    expect(mockFacilityService.get).toHaveBeenCalledWith('org-1', 'facility-1');
    expect(store.selectedFacility()).toEqual(facility);
    expect(store.getCallState().status).toBe('success');
  });

  it('should clear the selected facility', () => {
    store.setFacility(facility);
    store.clear();

    expect(store.selectedFacility()).toBeNull();
    expect(store.getCallState().status).toBe('idle');
  });
});
