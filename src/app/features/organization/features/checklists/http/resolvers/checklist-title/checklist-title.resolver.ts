import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { MaybeAsync, ResolveFn } from '@angular/router';
import { filter, first, map, type Observable } from 'rxjs';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { ActiveChecklistStore } from '@features/organization/features/checklists/state';

/**
 * Resolves the active checklist name for the route title.
 */
export const checklistTitleResolver: ResolveFn<string> = (): MaybeAsync<string> => {
  const activeChecklistStore: ActiveChecklistStore =
    inject<ActiveChecklistStore>(ActiveChecklistStore);
  const checklist: ChecklistOutput | null = activeChecklistStore.selectedChecklist();

  if (checklist) {
    return checklist.name;
  }

  const title$: Observable<string> = toObservable(activeChecklistStore.selectedChecklist).pipe(
    filter((value: ChecklistOutput | null): value is ChecklistOutput => value !== null),
    map((value: ChecklistOutput): string => value.name),
    first(),
  );

  return title$;
};
