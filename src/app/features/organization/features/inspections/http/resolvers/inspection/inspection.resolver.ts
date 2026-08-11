import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  MaybeAsync,
  RedirectCommand,
  Router,
  type ResolveFn,
} from '@angular/router';
import { ActiveInspectionStore } from '@features/organization/features/inspections/state';

/**
 * Resolver inspectionResolver
 *
 * @description
 * Seeds {@link ActiveInspectionStore} with the `:inspectionId` route param and
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
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot carrying `:inspectionId`.
 *
 * @returns {MaybeAsync<boolean | RedirectCommand>} `true` once the load is seeded, or a redirect on malformed ids.
 */
export const inspectionResolver: ResolveFn<boolean> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<boolean | RedirectCommand> => {
  const activeInspectionStore: ActiveInspectionStore =
    inject<ActiveInspectionStore>(ActiveInspectionStore);
  const router: Router = inject<Router>(Router);
  const organizationId: string | null = route.parent?.paramMap.get('organizationId') ?? null;
  const inspectionId: string | null = route.paramMap.get('inspectionId');

  if (!organizationId || !inspectionId) {
    return new RedirectCommand(router.parseUrl('/'));
  }

  activeInspectionStore.resolveInspection({ organizationId, inspectionId });

  return true;
};
