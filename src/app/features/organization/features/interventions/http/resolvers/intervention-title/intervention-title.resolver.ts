import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, MaybeAsync, ResolveFn } from '@angular/router';
import type { InterventionOutput } from '@features/organization/features/interventions/models';
import {
  ActiveInterventionStore,
  type ActiveInterventionStoreType,
} from '@features/organization/features/interventions/state';

/**
 * Constant INTERVENTION_TITLE_FALLBACK
 * @const INTERVENTION_TITLE_FALLBACK
 *
 * @description
 * Neutral label used for the breadcrumb, page title and header banner until
 * the intervention name is known (slow connection, offline before the
 * workspace cache hydrates), so the UI degrades gracefully instead of
 * breaking.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
const INTERVENTION_TITLE_FALLBACK: string = 'Intervention';

/**
 * Resolver interventionTitleResolver
 *
 * @description
 * Resolves the intervention name for the breadcrumb and page title, seeding
 * the root {@link ActiveInterventionStore}. Returns synchronously so
 * navigation never waits on the network: the cached name when the active
 * intervention already matches the route id, the neutral fallback otherwise —
 * in which case the fetch runs fire-and-forget and the detail page re-sets
 * the document title through `TitleService` once its workspace loads. It
 * never redirects, so offline detail views keep working (the page's
 * workspace store still loads the full data from its offline cache).
 *
 * Used as both a `title` resolver and a `breadcrumb` resolver.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - Activated route snapshot carrying `:interventionId`.
 *
 * @returns {MaybeAsync<string>} The intervention name, or a neutral fallback.
 */
export const interventionTitleResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<string> => {
  const activeInterventionStore: ActiveInterventionStoreType =
    inject<ActiveInterventionStoreType>(ActiveInterventionStore);

  const interventionId: string | null = route.paramMap.get('interventionId');
  if (!interventionId) return INTERVENTION_TITLE_FALLBACK;

  const current: InterventionOutput | null = activeInterventionStore.selectedIntervention();
  if (current && current.id === interventionId) return current.name;

  activeInterventionStore.resolveIntervention(interventionId);

  return INTERVENTION_TITLE_FALLBACK;
};
