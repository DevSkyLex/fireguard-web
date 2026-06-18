import { TestBed } from '@angular/core/testing';
import {
  convertToParamMap,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
} from '@angular/router';
import { isObservable, of, throwError, type Observable } from 'rxjs';
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

  it('should fetch and map the name when no matching intervention is cached', () => {
    configure({
      selectedIntervention: () => null,
      resolveIntervention: vi
        .fn()
        .mockReturnValue(of({ id: 'i-1', name: 'Fetched name' } as InterventionOutput)),
    });

    const result = TestBed.runInInjectionContext(() =>
      interventionTitleResolver(routeFor('i-1'), {} as RouterStateSnapshot),
    );

    expect(isObservable(result)).toBe(true);
    let emitted: string | undefined;
    (result as Observable<string>).subscribe((value) => (emitted = value));
    expect(emitted).toBe('Fetched name');
  });

  it('should fall back to a neutral label when the fetch fails', () => {
    configure({
      selectedIntervention: () => null,
      resolveIntervention: vi.fn().mockReturnValue(throwError(() => new Error('offline'))),
    });

    const result = TestBed.runInInjectionContext(() =>
      interventionTitleResolver(routeFor('i-1'), {} as RouterStateSnapshot),
    );

    let emitted: string | undefined;
    (result as Observable<string>).subscribe((value) => (emitted = value));
    expect(emitted).toBe('Intervention');
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
