import { computed, inject } from '@angular/core';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import type { DashboardLayoutPanelSlotFeature } from '@layouts/dashboard-layout';

/**
 * Constant CONVERSATION_DETAILS_PANEL_ID
 * @const CONVERSATION_DETAILS_PANEL_ID
 *
 * @description
 * Identifier the messaging surfaces pass to `SHELL_PANEL_PORT` to toggle the
 * details panel. Exported so the caller never repeats the string.
 *
 * @since 1.0.0
 *
 * @type {string}
 */
export const CONVERSATION_DETAILS_PANEL_ID: string = 'conversation-details';

/**
 * Function withConversationDetailsPanel
 * @function withConversationDetailsPanel
 *
 * @description
 * Registers the conversation details panel — main info, members, pinned
 * messages and files — in the shell's right-hand panel region.
 *
 * Available only to members who may read messaging: the contribution itself
 * cannot be registered conditionally (a multi-provider array is immutable per
 * injector), so visibility is gated here, as the slot contract prescribes.
 *
 * @returns {DashboardLayoutPanelSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withConversationDetailsPanel(): DashboardLayoutPanelSlotFeature {
  return {
    useFactory: () => {
      const memberAccess: OrganizationMemberAccessPort = inject(ORGANIZATION_MEMBER_ACCESS_PORT);

      return {
        id: CONVERSATION_DETAILS_PANEL_ID,
        order: 10,
        loadComponent: () =>
          import('@features/organization/features/messaging/ui/drawers/conversation-details-panel/conversation-details-panel.component').then(
            (m) => m.ConversationDetailsPanel,
          ),
        title: computed((): string => $localize`:@@messaging.details.title:Details`),
        icon: 'pi pi-info-circle',
        available: computed((): boolean => {
          const granted: ReadonlySet<string> = new Set(memberAccess.permissions());

          return (
            granted.has(ORGANIZATION_PERMISSION.MESSAGING_READ) ||
            Array.from(granted).some(
              (permission: string): boolean =>
                permission.endsWith('.*') &&
                ORGANIZATION_PERMISSION.MESSAGING_READ.startsWith(permission.slice(0, -1)),
            )
          );
        }),
      };
    },
  };
}
