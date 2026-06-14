import type { DashboardLayoutTopbarSlotFeature } from '@layouts/dashboard-layout';
import { ThemeSwitcher } from './theme-switcher.component';

/**
 * Feature withThemeSwitcher
 *
 * @description
 * Registers the {@link ThemeSwitcher} component into the dashboard topbar slot.
 *
 * @returns {DashboardLayoutTopbarSlotFeature}
 *
 * @since 1.4.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function withThemeSwitcher(): DashboardLayoutTopbarSlotFeature {
  return {
    useFactory: () => ({
      id: 'theme-switcher',
      order: 15,
      component: ThemeSwitcher,
    }),
  };
}
