import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  MaybeAsync,
  RedirectCommand,
  Router,
  type ResolveFn,
} from '@angular/router';
import { catchError, of } from 'rxjs';
import type { ChecklistOutput } from '@features/organization/features/checklists/models';
import { ActiveChecklistStore } from '@features/organization/features/checklists/state';

/**
 * Resolves and activates the checklist identified by the current route.
 */
export const checklistResolver: ResolveFn<ChecklistOutput> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<ChecklistOutput | RedirectCommand> => {
  const activeChecklistStore: ActiveChecklistStore =
    inject<ActiveChecklistStore>(ActiveChecklistStore);
  const router: Router = inject<Router>(Router);
  const organizationId: string | null = route.parent?.paramMap.get('organizationId') ?? null;
  const checklistId: string | null = route.paramMap.get('checklistId');

  if (!organizationId || !checklistId) {
    return new RedirectCommand(router.parseUrl('/organizations'));
  }

  return activeChecklistStore
    .resolveChecklist(organizationId, checklistId)
    .pipe(
      catchError(() =>
        of(new RedirectCommand(router.parseUrl(`/organizations/${organizationId}/checklists`))),
      ),
    );
};
