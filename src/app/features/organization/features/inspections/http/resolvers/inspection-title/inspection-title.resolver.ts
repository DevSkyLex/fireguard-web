import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, MaybeAsync, ResolveFn } from '@angular/router';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { ActiveInspectionStore } from '@features/organization/features/inspections/state';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { OrgDatePipe } from '@shared/regional-format';

/**
 * Resolver inspectionTitleResolver
 *
 * @description
 * Returns the route title synchronously so navigation never waits on it: the
 * dated inspection label when {@link ActiveInspectionStore} already holds the
 * inspection matching `:inspectionId`, a neutral section label otherwise.
 * The date renders through the active organization's timezone and pattern
 * ({@link RegionalFormattingPort}), the same as the detail page's own title.
 * Once the seeded fetch lands, the detail page re-sets the document title
 * through `TitleService`, which also refreshes the breadcrumb's current-page
 * label.
 *
 * @version 2.1.0
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

  if (inspection?.id !== inspectionId) return $localize`:@@route.inspection.detail:Inspection`;

  const regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);
  const when: string = new OrgDatePipe().transform(
    inspection.performedAt,
    'date',
    regionalFormattingPort.regionalFormatting(),
  );

  return $localize`:@@inspection.titleResolver:Inspection ${when}:date:`;
};
