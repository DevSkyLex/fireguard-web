import { computed, inject } from '@angular/core';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import type { DashboardLayoutPanelSlotFeature } from '@layouts/dashboard-layout';

/**
 * Slot id of the assistant panel, so a caller can open it by name — the
 * composer's sparkles button does exactly that.
 *
 * @since 2.0.0
 */
export const ASSISTANT_PANEL_ID: string = 'assistant';

/**
 * Function withAssistantPanel
 *
 * @description
 * Contributes the assistant to the shell's panel slot, replacing the routed
 * `/assistant` page: the design kit puts it beside the thread it answers from,
 * not on a screen of its own.
 *
 * ⚠️ Gated on `assistant.use` only. The backend also has a per-organization
 * setting that can switch the assistant off, which this does not read — same
 * caveat the deleted route carried.
 *
 * @since 2.0.0
 *
 * @returns {DashboardLayoutPanelSlotFeature} The slot contribution.
 */
export function withAssistantPanel(): DashboardLayoutPanelSlotFeature {
  return {
    useFactory: () => {
      const memberAccess: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

      return {
        id: ASSISTANT_PANEL_ID,
        order: 20,
        loadComponent: () =>
          import('@features/organization/features/assistant/ui/drawers/assistant-panel/assistant-panel.component').then(
            (m) => m.AssistantPanel,
          ),
        title: computed((): string => $localize`:@@assistant.panel.title:Assistant`),
        icon: 'pi pi-sparkles',
        available: computed((): boolean => {
          const granted: ReadonlySet<string> = new Set(memberAccess.permissions());

          return (
            granted.has(ORGANIZATION_PERMISSION.ASSISTANT_USE) ||
            Array.from(granted).some(
              (permission: string): boolean =>
                permission.endsWith('.*') &&
                ORGANIZATION_PERMISSION.ASSISTANT_USE.startsWith(permission.slice(0, -1)),
            )
          );
        }),
      };
    },
  };
}
