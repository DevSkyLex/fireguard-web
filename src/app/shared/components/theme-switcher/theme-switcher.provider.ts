import type { WorkspaceLayoutConversationHeaderSlotFeature } from '@layouts/workspace-layout';
import { ThemeSwitcher } from './theme-switcher.component';

/**
 * Feature withThemeSwitcher
 *
 * @description
 * Registers the {@link ThemeSwitcher} component at the end of the workspace
 * header's tool cluster, where the app-wide controls sit.
 *
 * @returns {WorkspaceLayoutConversationHeaderSlotFeature}
 *
 * @since 1.4.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withThemeSwitcher(): WorkspaceLayoutConversationHeaderSlotFeature {
  return {
    useFactory: () => ({
      id: 'theme-switcher',
      order: 30,
      component: ThemeSwitcher,
    }),
  };
}
