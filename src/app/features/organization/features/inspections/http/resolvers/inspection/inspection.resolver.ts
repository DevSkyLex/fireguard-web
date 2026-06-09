import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  MaybeAsync,
  RedirectCommand,
  Router,
  type ResolveFn,
} from '@angular/router';
import { catchError, of } from 'rxjs';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '@features/organization/features/inspections/state';

/**
 * Resolves and activates the inspection identified by the current route.
 */
export const inspectionResolver: ResolveFn<InspectionOutput> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<InspectionOutput | RedirectCommand> => {
  const activeInspectionStore: ActiveInspectionStore =
    inject<ActiveInspectionStore>(ActiveInspectionStore);
  const router: Router = inject<Router>(Router);
  const organizationId: string | null = route.parent?.paramMap.get('organizationId') ?? null;
  const inspectionId: string | null = route.paramMap.get('inspectionId');

  if (!organizationId || !inspectionId) {
    return new RedirectCommand(router.parseUrl('/organizations'));
  }

  return activeInspectionStore
    .resolveInspection(organizationId, inspectionId)
    .pipe(
      catchError(() =>
        of(new RedirectCommand(router.parseUrl(`/organizations/${organizationId}/inspections`))),
      ),
    );
};
