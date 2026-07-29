import { computed, inject, type Provider, type Signal } from '@angular/core';
import {
  AssistantStore,
  type AssistantStoreType,
} from '@features/organization/features/collaboration/state';
import { AssistantPanel } from '@features/organization/features/collaboration/ui/components/assistant-panel';
import { AssistantToggle } from '@features/organization/features/collaboration/ui/components/assistant-toggle';
import type {
  WorkspaceLayoutConversationHeaderSlotFeature,
  WorkspaceLayoutPanelSlotFeature,
} from '@layouts/workspace-layout';

/**
 * Priority of the assistant in the mono-active `PANEL_SLOT`.
 *
 * Deliberately far above the info panel's 10: the prototype's rule is that the
 * assistant outranks every other right-hand panel, because it is the only one
 * a member summons explicitly rather than receiving from the current route.
 */
const ASSISTANT_PANEL_PRIORITY = 90;

/**
 * Function provideCollaborationAssistant
 * @function provideCollaborationAssistant
 *
 * @description
 * Provides the assistant's store at the workspace route.
 *
 * Route-scoped rather than root: the store reads the active organization
 * through `ORGANIZATION_CONTEXT_PORT`, which is a route binding, and the panel
 * and header contributions are both resolved from this same environment
 * injector — a root store would throw `NG0201` on the port.
 *
 * @returns {Provider[]}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideCollaborationAssistant(): Provider[] {
  return [AssistantStore];
}

/**
 * Function withCollaborationAssistantPanel
 * @function withCollaborationAssistantPanel
 *
 * @description
 * Registers the assistant as the workspace's highest-priority right panel.
 *
 * Requires {@link provideCollaborationAssistant} in the same route's providers.
 *
 * @returns {WorkspaceLayoutPanelSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withCollaborationAssistantPanel(): WorkspaceLayoutPanelSlotFeature {
  return {
    useFactory: () => {
      const store: AssistantStoreType = inject(AssistantStore);
      const active: Signal<boolean> = computed(
        (): boolean => store.panelOpen() && store.isAvailable(),
      );

      return {
        id: 'collaboration-assistant-panel',
        priority: ASSISTANT_PANEL_PRIORITY,
        component: AssistantPanel,
        active,
        // Literal: the prototype's assistant column is 360px, and no Tailwind
        // step lands on it.
        widthClass: 'lg:w-[360px]',
        ariaLabel: $localize`:@@workspace.assistant.toggle.aria:Assistant`,
      };
    },
  };
}

/**
 * Function withCollaborationAssistantToggle
 * @function withCollaborationAssistantToggle
 *
 * @description
 * Registers the assistant's toggle in the conversation header's tool cluster.
 *
 * Ordered at 15 — after the offline chip, before the info toggle — so the
 * cluster reads offline state, assistant, page-contextual controls, then
 * app-wide ones.
 *
 * @returns {WorkspaceLayoutConversationHeaderSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withCollaborationAssistantToggle(): WorkspaceLayoutConversationHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'collaboration-assistant-toggle',
      order: 15,
      component: AssistantToggle,
    }),
  };
}
