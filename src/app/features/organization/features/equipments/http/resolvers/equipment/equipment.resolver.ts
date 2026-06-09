import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  MaybeAsync,
  RedirectCommand,
  Router,
  type ResolveFn,
} from '@angular/router';
import { catchError, of } from 'rxjs';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '@features/organization/features/equipments/state';

/**
 * Resolves and activates the equipment identified by the current route.
 */
export const equipmentResolver: ResolveFn<EquipmentOutput> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<EquipmentOutput | RedirectCommand> => {
  const activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);
  const router: Router = inject<Router>(Router);
  const organizationId: string | null = route.parent?.paramMap.get('organizationId') ?? null;
  const equipmentId: string | null = route.paramMap.get('equipmentId');

  if (!organizationId || !equipmentId) {
    return new RedirectCommand(router.parseUrl('/organizations'));
  }

  return activeEquipmentStore
    .resolveEquipment(organizationId, equipmentId)
    .pipe(
      catchError(() =>
        of(new RedirectCommand(router.parseUrl(`/organizations/${organizationId}/equipments`))),
      ),
    );
};
