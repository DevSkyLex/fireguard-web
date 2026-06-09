import {
  type InjectionToken,
  makeEnvironmentProviders,
  type EnvironmentProviders,
  type Provider,
} from '@angular/core';
import { ASIDE_SLOT, type AsideContribution } from '../../slots/aside';
import { NAVIGATION_SLOT, type NavigationContribution } from '../../slots/navigation';
import { PAGE_HEADER_SLOT, type PageHeaderContribution } from '../../slots/page-header';
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

export type DashboardLayoutAsideSlotFeature = DashboardLayoutSlotFeature<AsideContribution>;

export type DashboardLayoutPageHeaderSlotFeature =
  DashboardLayoutSlotFeature<PageHeaderContribution>;

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
  readonly topbar?: DashboardLayoutTopbarSlotFeature[];
  readonly aside?: DashboardLayoutAsideSlotFeature[];
  readonly pageHeader?: DashboardLayoutPageHeaderSlotFeature[];
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
    ...provideSlotContributions(TOPBAR_SLOT, config.topbar),
    ...provideSlotContributions(ASIDE_SLOT, config.aside),
    ...provideSlotContributions(PAGE_HEADER_SLOT, config.pageHeader),
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
