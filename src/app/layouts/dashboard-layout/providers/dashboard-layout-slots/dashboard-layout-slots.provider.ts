import {
  type InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import { SHELL_PANEL_PORT } from '@core/shell-panel';
import { DashboardPanelService } from '../../services/dashboard-panel';
import { NAVIGATION_SLOT, type NavigationContribution } from '../../slots/navigation';
import { PAGE_HEADER_SLOT, type PageHeaderContribution } from '../../slots/page-header';
import { PANEL_SLOT, type PanelContribution } from '../../slots/panel';
import { SIDEBAR_SLOT, type SidebarContribution } from '../../slots/sidebar';
import { TOPBAR_SLOT, type TopbarContribution } from '../../slots/topbar';

/**
 * DashboardLayoutSlotFeature
 *
 * @description
 * Common contract returned by dashboard layout slot contribution factories.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DashboardLayoutSlotFeature<TContribution> {
  useFactory: () => TContribution;
}

export type DashboardLayoutNavigationSlotFeature =
  DashboardLayoutSlotFeature<NavigationContribution>;

export type DashboardLayoutTopbarSlotFeature = DashboardLayoutSlotFeature<TopbarContribution>;

export type DashboardLayoutSidebarSlotFeature = DashboardLayoutSlotFeature<SidebarContribution>;

export type DashboardLayoutPageHeaderSlotFeature =
  DashboardLayoutSlotFeature<PageHeaderContribution>;
export type DashboardLayoutPanelSlotFeature = DashboardLayoutSlotFeature<PanelContribution>;

/**
 * DashboardLayoutSlotsConfig
 *
 * @description
 * Declarative dashboard layout slot composition.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface DashboardLayoutSlotsConfig {
  readonly navigation?: DashboardLayoutNavigationSlotFeature[];
  readonly sidebar?: DashboardLayoutSidebarSlotFeature[];
  readonly topbar?: DashboardLayoutTopbarSlotFeature[];
  readonly pageHeader?: DashboardLayoutPageHeaderSlotFeature[];
  readonly panel?: DashboardLayoutPanelSlotFeature[];
}

/**
 * Provider provideDashboardLayoutSlots
 *
 * @description
 * Provides all configured dashboard layout slot contributions.
 *
 * @param {DashboardLayoutSlotsConfig} config - Slot contributions grouped by layout area.
 * @returns {EnvironmentProviders}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideDashboardLayoutSlots(
  config: DashboardLayoutSlotsConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideSlotContributions(NAVIGATION_SLOT, config.navigation),
    ...provideSlotContributions(SIDEBAR_SLOT, config.sidebar),
    ...provideSlotContributions(TOPBAR_SLOT, config.topbar),
    ...provideSlotContributions(PAGE_HEADER_SLOT, config.pageHeader),
    ...provideSlotContributions(PANEL_SLOT, config.panel),
    // Bound here, in `makeEnvironmentProviders`, and NOT in the layout
    // component's `providers` array: a routed page injecting SHELL_PANEL_PORT
    // resolves against the route's environment injector, which never sees a
    // component-node binding. Documented in `core/shell-panel`.
    DashboardPanelService,
    { provide: SHELL_PANEL_PORT, useExisting: DashboardPanelService },
  ]);
}

function provideSlotContributions<TContribution>(
  token: InjectionToken<TContribution[]>,
  features: readonly DashboardLayoutSlotFeature<TContribution>[] = [],
): Provider[] {
  return features.map(
    (feature: DashboardLayoutSlotFeature<TContribution>): Provider => ({
      provide: token,
      useFactory: feature.useFactory,
      multi: true,
    }),
  );
}
