import { inject } from '@angular/core';
import type { ActivatedRouteSnapshot, MaybeAsync, ResolveFn } from '@angular/router';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '@features/organization/features/equipments/state';
import { buildEquipmentTitle } from '@features/organization/features/equipments/utils';

/**
 * Resolver equipmentTitleResolver
 *
 * @description
 * Returns the route title synchronously so navigation never waits on it: the
 * record's display name when {@link ActiveEquipmentStore} already holds the
 * equipment matching `:equipmentId`, a neutral section label otherwise. Once
 * the seeded fetch lands, the detail page re-sets the document title through
 * `TitleService`, which also refreshes the breadcrumb's current-page label.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 *
 * @param {ActivatedRouteSnapshot} route - The activated route snapshot carrying `:equipmentId`.
 *
 * @returns {MaybeAsync<string>} The equipment display name, or the neutral section label.
 */
export const equipmentTitleResolver: ResolveFn<string> = (
  route: ActivatedRouteSnapshot,
): MaybeAsync<string> => {
  const activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);
  const equipment: EquipmentOutput | null = activeEquipmentStore.selectedEquipment();
  const equipmentId: string | null = route.paramMap.get('equipmentId');

  return equipment && equipment.id === equipmentId
    ? buildEquipmentTitle(equipment)
    : $localize`:@@route.equipment.detail:Equipment`;
};
