import { computed, inject } from '@angular/core';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import type { SlotFeature } from '@shared/layout-slot';
import { DashboardPagePanel } from '../../components/dashboard-page-panel/dashboard-page-panel.component';
import type { DashboardPanelContribution } from '../../models';
import { DashboardPanelRegistry } from '../../services/dashboard-panel-registry/dashboard-panel-registry.service';

/**
 * Function withDashboardPagePanel
 *
 * @description Supplies the active routed page's template to the existing exclusive right slot.
 * @access public
 * @since 1.0.0
 * @returns {SlotFeature<DashboardPanelContribution>} Page-panel contribution factory.
 */
export function withDashboardPagePanel(): SlotFeature<DashboardPanelContribution> {
  return {
    useFactory: () => {
      const registry = inject(DashboardPanelRegistry);
      const mobile = inject(INTERACTION_CAPABILITIES_PORT).isMobileInteractionMode;
      return {
        id: 'dashboard-page-panel',
        priority: 0,
        component: DashboardPagePanel,
        label: computed(() => registry.panel()?.label ?? ''),
        active: computed(() => registry.panel() !== null && !mobile()),
      };
    },
  };
}
