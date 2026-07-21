import { computed, inject } from '@angular/core';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import type { DashboardLayoutPanelSlotFeature } from '@layouts/dashboard-layout';

/**
 * Constant MAP_FACILITIES_PANEL_ID
 * @const MAP_FACILITIES_PANEL_ID
 *
 * @description
 * Identifier the organization map page passes to `SHELL_PANEL_PORT` to open
 * and close the facilities panel. Exported so the caller never repeats the
 * string.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const MAP_FACILITIES_PANEL_ID: string = 'map-facilities';

/**
 * Function withMapFacilitiesPanel
 * @function withMapFacilitiesPanel
 *
 * @description
 * Registers the organization map's facilities browser — search, cards, the
 * add-facility form — in the shell's right-hand panel region. The map page
 * opens it on mount and closes it on destroy rather than leaving it to a
 * manual toggle: outside the map, there is nothing for this panel to show.
 *
 * Available only to members who may read facilities: the contribution
 * itself cannot be registered conditionally (a multi-provider array is
 * immutable per injector), so visibility is gated here, as the slot
 * contract prescribes.
 *
 * @returns {DashboardLayoutPanelSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withMapFacilitiesPanel(): DashboardLayoutPanelSlotFeature {
  return {
    useFactory: () => {
      const memberAccess: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

      return {
        id: MAP_FACILITIES_PANEL_ID,
        order: 30,
        loadComponent: () =>
          import('@features/organization/ui/drawers/map-facilities-panel/map-facilities-panel.component').then(
            (m) => m.MapFacilitiesPanel,
          ),
        title: computed((): string => $localize`:@@map.panel.title:Facilities`),
        icon: 'pi pi-map-marker',
        available: computed((): boolean => {
          const granted: ReadonlySet<string> = new Set(memberAccess.permissions());

          return (
            granted.has(ORGANIZATION_PERMISSION.FACILITIES_READ) ||
            Array.from(granted).some(
              (permission: string): boolean =>
                permission.endsWith('.*') &&
                ORGANIZATION_PERMISSION.FACILITIES_READ.startsWith(permission.slice(0, -1)),
            )
          );
        }),
      };
    },
  };
}
