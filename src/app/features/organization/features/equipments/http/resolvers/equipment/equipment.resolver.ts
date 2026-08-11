import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  MaybeAsync,
  RedirectCommand,
  Router,
  type ResolveFn,
} from '@angular/router';
import { ActiveEquipmentStore } from '@features/organization/features/equipments/state';

/**
 * Resolver equipmentResolver
 *
 * @description
 * Seeds {@link ActiveEquipmentStore} with the `:equipmentId` route param and
 * returns immediately, so route activation never waits on the network: the
 * detail page paints its skeleton from the store's pending state instead of
 * leaving the app blank on a slow connection. The store remains the single
 * loading path for the record; a fetch failure surfaces there and the page
 * redirects back to the index. Only a malformed URL (missing ids) redirects
 * from here.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot carrying `:equipmentId`.
 *
 * @returns {MaybeAsync<boolean | RedirectCommand>} `true` once the load is seeded, or a redirect on malformed ids.
 */
export const equipmentResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<boolean | RedirectCommand> => {
  const activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);
  const router: Router = inject<Router>(Router);
  const organizationId: string | null = route.parent?.paramMap.get('organizationId') ?? null;
  const equipmentId: string | null = route.paramMap.get('equipmentId');

  if (!organizationId || !equipmentId) {
    return new RedirectCommand(router.parseUrl('/'));
  }

  activeEquipmentStore.resolveEquipment({ organizationId, equipmentId });

  return true;
};
