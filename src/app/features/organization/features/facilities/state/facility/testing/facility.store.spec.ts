import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of } from 'rxjs';
import type { HydraCollection, OptionOutput } from '@core/models/api';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { ActiveFacilityStore } from '../../active-facility/active-facility.store';
import { FacilityStore } from '../facility.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('FacilityStore', () => {
  let store: FacilityStore;
  let mockFacilityService: {
    list: ReturnType<typeof vi.fn>;
    listTypes: ReturnType<typeof vi.fn>;
  };

  const facility = { id: 'facility-1', name: 'HQ' } as unknown as FacilityOutput;
  const collection: HydraCollection<FacilityOutput> = {
    '@id': '/api/organizations/org-1/facilities',
    '@type': 'Collection',
    totalItems: 1,
    member: [facility],
  };
  const typesCollection: HydraCollection<OptionOutput> = {
    '@id': '/api/facility-types',
    '@type': 'Collection',
    totalItems: 1,
    member: [{ '@id': '/api/options/site', '@type': 'Option', value: 'site', label: 'Site' }],
  };

  beforeEach(() => {
    mockFacilityService = {
      list: vi.fn().mockReturnValue(of(collection)),
      listTypes: vi.fn().mockReturnValue(of(typesCollection)),
    };

    TestBed.configureTestingModule({
      providers: [
        FacilityStore,
        { provide: Dispatcher, useValue: { dispatch: vi.fn() } },
        { provide: FacilityService, useValue: mockFacilityService },
        {
          provide: ActiveFacilityStore,
          useValue: {
            selectedFacility: signal<FacilityOutput | null>(null),
            isLoadingFacility: signal(false),
          },
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });

    store = TestBed.inject(FacilityStore);
  });

  it('should load facilities', async () => {
    store.load({ organizationId: 'org-1' });
    await flushEffects();

    expect(mockFacilityService.list).toHaveBeenCalledWith('org-1', undefined);
    expect(store.facilities()).toEqual([facility]);
    expect(store.totalFacilities()).toBe(1);
  });

  it('should load facility types', async () => {
    store.loadTypes();
    await flushEffects();

    expect(mockFacilityService.listTypes).toHaveBeenCalledTimes(1);
    expect(store.facilityTypes()).toEqual(typesCollection.member);
    expect(store.typesCallState().status).toBe('success');
  });
});
