import { computed, inject, type Signal } from '@angular/core';
import { ChannelPanelStore } from '@features/collaboration/state';
import { ChannelInfoPanel } from '@features/collaboration/ui/components/channel-info-panel';
import type { WorkspaceLayoutPanelSlotFeature } from '@layouts/workspace-layout';

/**
 * Priority of the channel info panel in the mono-active `PANEL_SLOT`.
 *
 * The bottom of the scale on purpose: the info panel is the default companion
 * to a conversation, and anything explicitly summoned over it — the assistant
 * above all — must outrank it.
 */
const CHANNEL_INFO_PANEL_PRIORITY = 10;

/**
 * Function withCollaborationInfoPanel
 * @function withCollaborationInfoPanel
 *
 * @description
 * Registers the channel info panel as the workspace's contextual right panel.
 *
 * Its `active` signal is route-scoped through {@link ChannelPanelStore}: the
 * panel claims the slot only while a channel conversation is open, which is
 * what keeps it off the intervention route, where the page owns its own aside.
 *
 * @returns {WorkspaceLayoutPanelSlotFeature}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withCollaborationInfoPanel(): WorkspaceLayoutPanelSlotFeature {
  return {
    useFactory: () => {
      const store: InstanceType<typeof ChannelPanelStore> = inject(ChannelPanelStore);
      const active: Signal<boolean> = computed((): boolean => store.channelId() !== null);

      return {
        id: 'collaboration-info-panel',
        priority: CHANNEL_INFO_PANEL_PRIORITY,
        component: ChannelInfoPanel,
        active,
        // Literal: Tailwind has no safelist here, and the prototype's info
        // panel is 330px.
        widthClass: 'lg:w-[330px]',
        ariaLabel: $localize`:@@workspace.panel.toggle.aria:Channel details`,
      };
    },
  };
}
