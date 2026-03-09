import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';
import { facilityTitleResolver } from './facility-title.resolver';
import { ActiveFacilityStore } from '@core/stores/facility';
import type { FacilityOutput } from '@core/models/facility';

const MOCK_FACILITY: FacilityOutput = {
  id: 'fac-1',
  name: 'Main Site',
  type: 'site',
  status: 'active',
} as FacilityOutput;

describe('facilityTitleResolver', () => {
  const facilitySignal = signal<FacilityOutput | null>(null);

  const mockActiveFacilityStore = {
    selectedFacility: facilitySignal,
  };

  function runResolver() {
    return TestBed.runInInjectionContext(() => facilityTitleResolver({} as never, {} as never));
  }

  beforeEach(() => {
    facilitySignal.set(null);

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActiveFacilityStore, useValue: mockActiveFacilityStore },
      ],
    });
  });

  it('should return facility name synchronously when facility is already loaded', () => {
    facilitySignal.set(MOCK_FACILITY);
    const result = runResolver();

    expect(result).toBe('Main Site');
  });

  it('should return an observable that emits when the store is populated', async () => {
    facilitySignal.set(null);
    const result = runResolver() as ReturnType<typeof of>;

    // Populate the store after resolver is called
    TestBed.runInInjectionContext(() => {
      facilitySignal.set(MOCK_FACILITY);
    });

    const value = await firstValueFrom(result);
    expect(value).toBe('Main Site');
  });
});
