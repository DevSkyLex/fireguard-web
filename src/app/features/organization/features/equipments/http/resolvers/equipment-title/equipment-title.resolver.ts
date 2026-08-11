import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import type { MaybeAsync, ResolveFn } from '@angular/router';
import { filter, first, map, type Observable } from 'rxjs';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { ActiveEquipmentStore } from '@features/organization/features/equipments/state';
import { buildEquipmentTitle } from '@features/organization/features/equipments/utils';

/**
 * Resolves the active equipment display name for the route title.
 */
export const equipmentTitleResolver: ResolveFn<string> = (): MaybeAsync<string> => {
  const activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);
  const equipment: EquipmentOutput | null = activeEquipmentStore.selectedEquipment();

  if (equipment) {
    return buildEquipmentTitle(equipment);
  }

  const title$: Observable<string> = toObservable(activeEquipmentStore.selectedEquipment).pipe(
    filter((value: EquipmentOutput | null): value is EquipmentOutput => value !== null),
    map((value: EquipmentOutput): string => buildEquipmentTitle(value)),
    first(),
  );

  return title$;
};
