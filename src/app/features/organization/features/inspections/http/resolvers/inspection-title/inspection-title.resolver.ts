import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { MaybeAsync, ResolveFn } from '@angular/router';
import { filter, first, map, type Observable } from 'rxjs';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '@features/organization/features/inspections/state';

/**
 * Resolves the active inspection identifier for the route title.
 */
export const inspectionTitleResolver: ResolveFn<string> = (): MaybeAsync<string> => {
  const activeInspectionStore: ActiveInspectionStore =
    inject<ActiveInspectionStore>(ActiveInspectionStore);
  const inspection: InspectionOutput | null = activeInspectionStore.selectedInspection();

  if (inspection) {
    return `Inspection ${inspection.performedAt.slice(0, 10)}`;
  }

  const title$: Observable<string> = toObservable(activeInspectionStore.selectedInspection).pipe(
    filter((value: InspectionOutput | null): value is InspectionOutput => value !== null),
    map((value: InspectionOutput): string => `Inspection ${value.performedAt.slice(0, 10)}`),
    first(),
  );

  return title$;
};
