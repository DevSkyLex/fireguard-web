import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, MaybeAsync, ResolveFn } from '@angular/router';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '@features/organization/features/inspections/state';

/**
 * Resolver inspectionTitleResolver
 *
 * @description
 * Returns the route title synchronously so navigation never waits on it: the
 * dated inspection label when {@link ActiveInspectionStore} already holds the
 * inspection matching `:inspectionId`, a neutral section label otherwise.
 * Once the seeded fetch lands, the detail page re-sets the document title
 * through `TitleService`, which also refreshes the breadcrumb's current-page
 * label.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot carrying `:inspectionId`.
 *
 * @returns {MaybeAsync<string>} The dated inspection label, or the neutral section label.
 */
export const inspectionTitleResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<string> => {
  const activeInspectionStore: ActiveInspectionStore =
    inject<ActiveInspectionStore>(ActiveInspectionStore);
  const inspection: InspectionOutput | null = activeInspectionStore.selectedInspection();
  const inspectionId: string | null = route.paramMap.get('inspectionId');

  return inspection && inspection.id === inspectionId
    ? $localize`:@@inspection.titleResolver:Inspection ${inspection.performedAt.slice(0, 10)}:date:`
    : $localize`:@@route.inspection.detail:Inspection`;
};
