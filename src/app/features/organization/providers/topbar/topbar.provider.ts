import { computed, inject } from '@angular/core';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { ShellAssistantAction } from '@features/organization/ui/components/shell-assistant-action';
import type { DashboardLayoutTopbarSlotFeature } from '@layouts/dashboard-layout';

/**
 * Function withShellAssistantAction
 * @function withShellAssistantAction
 *
 * @description
 * Registers the {@link ShellAssistantAction} sparkles button into the dashboard
 * topbar, matching the prototype's persistent header tool cluster. Available
 * only inside an organization workspace — the assistant panel answers with
 * workspace context.
 *
 * Use inside {@link provideDashboardLayoutSlots}:
 * ```typescript
 * provideDashboardLayoutSlots({ topbar: [withShellAssistantAction()] })
 * ```
 *
 * @returns {DashboardLayoutTopbarSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withShellAssistantAction(): DashboardLayoutTopbarSlotFeature {
  return {
    useFactory: () => {
      const context: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

      return {
        id: 'shell-assistant-action',
        order: 15,
        component: ShellAssistantAction,
        available: computed((): boolean => context.selectedOrganization() !== null),
      };
    },
  };
}
