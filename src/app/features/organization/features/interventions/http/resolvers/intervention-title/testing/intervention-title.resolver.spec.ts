import { TestBed } from '@angular/core/testing';
import {
  convertToParamMap,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import { ActiveInterventionStore } from '@features/organization/features/interventions/state';
import { interventionTitleResolver } from '../intervention-title.resolver';

type ActiveInterventionStoreMock = {
  selectedIntervention: () => InterventionOutput | null;
  resolveIntervention: ReturnType<typeof vi.fn>;
};

function routeFor(interventionId: string | null): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap(interventionId ? { interventionId } : {}),
  } as ActivatedRouteSnapshot;
}

function resolve(store: ActiveInterventionStoreMock, interventionId: string | null): string {
  return TestBed.runInInjectionContext(() =>
    interventionTitleResolver(routeFor(interventionId), {} as RouterStateSnapshot),
  ) as string;
}

describe('interventionTitleResolver', () => {
  let store: ActiveInterventionStoreMock;

  function configure(mock: ActiveInterventionStoreMock): void {
    store = mock;
    TestBed.configureTestingModule({
      providers: [{ provide: ActiveInterventionStore, useValue: store }],
    });
  }

  it('should return the cached name without fetching when the active intervention matches', () => {
    configure({
      selectedIntervention: () =>
        ({ id: 'i-1', name: 'Spring audit' }) as unknown as InterventionOutput,
      resolveIntervention: vi.fn(),
    });

    expect(resolve(store, 'i-1')).toBe('Spring audit');
    expect(store.resolveIntervention).not.toHaveBeenCalled();
  });

  it('should seed the fetch and answer the neutral label when no matching intervention is cached', () => {
    configure({
      selectedIntervention: () => null,
      resolveIntervention: vi.fn(),
    });

    expect(resolve(store, 'i-1')).toBe('Intervention');
    expect(store.resolveIntervention).toHaveBeenCalledWith('i-1');
  });

  it('should seed the fetch when a different intervention is still cached', () => {
    configure({
      selectedIntervention: () =>
        ({ id: 'i-1', name: 'Spring audit' }) as unknown as InterventionOutput,
      resolveIntervention: vi.fn(),
    });

    expect(resolve(store, 'i-2')).toBe('Intervention');
    expect(store.resolveIntervention).toHaveBeenCalledWith('i-2');
  });

  it('should fall back to a neutral label when the route has no intervention id', () => {
    configure({
      selectedIntervention: () => null,
      resolveIntervention: vi.fn(),
    });

    expect(resolve(store, null)).toBe('Intervention');
    expect(store.resolveIntervention).not.toHaveBeenCalled();
  });
});
