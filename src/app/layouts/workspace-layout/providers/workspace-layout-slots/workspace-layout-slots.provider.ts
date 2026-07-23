import {
  type EnvironmentProviders,
  type InjectionToken,
  makeEnvironmentProviders,
  type Provider,
} from '@angular/core';
import {
  CONVERSATION_HEADER_SLOT,
  type ConversationHeaderContribution,
} from '../../slots/conversation-header';
import { WORKSPACE_PAGE_HEADER_SLOT, type PageHeaderContribution } from '../../slots/page-header';
import { PANEL_SLOT, type PanelContribution } from '../../slots/panel';
import { RAIL_SLOT, type RailContribution } from '../../slots/rail';
import { SECONDARY_NAV_SLOT, type SecondaryNavContribution } from '../../slots/secondary-nav';

/**
 * WorkspaceLayoutSlotFeature
 *
 * @description
 * Common contract returned by workspace layout slot contribution factories.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface WorkspaceLayoutSlotFeature<TContribution> {
  useFactory: () => TContribution;
}

export type WorkspaceLayoutRailSlotFeature = WorkspaceLayoutSlotFeature<RailContribution>;

export type WorkspaceLayoutSecondaryNavSlotFeature =
  WorkspaceLayoutSlotFeature<SecondaryNavContribution>;

export type WorkspaceLayoutConversationHeaderSlotFeature =
  WorkspaceLayoutSlotFeature<ConversationHeaderContribution>;

export type WorkspaceLayoutPageHeaderSlotFeature =
  WorkspaceLayoutSlotFeature<PageHeaderContribution>;

export type WorkspaceLayoutPanelSlotFeature = WorkspaceLayoutSlotFeature<PanelContribution>;

/**
 * WorkspaceLayoutSlotsConfig
 *
 * @description
 * Declarative workspace layout slot composition.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export interface WorkspaceLayoutSlotsConfig {
  readonly rail?: WorkspaceLayoutRailSlotFeature[];
  readonly secondaryNav?: WorkspaceLayoutSecondaryNavSlotFeature[];
  readonly conversationHeader?: WorkspaceLayoutConversationHeaderSlotFeature[];
  readonly pageHeader?: WorkspaceLayoutPageHeaderSlotFeature[];
  readonly panel?: WorkspaceLayoutPanelSlotFeature[];
}

/**
 * Provider provideWorkspaceLayoutSlots
 *
 * @description
 * Provides all configured workspace layout slot contributions.
 *
 * @param {WorkspaceLayoutSlotsConfig} config - Slot contributions grouped by layout area.
 * @returns {EnvironmentProviders}
 *
 * @since 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideWorkspaceLayoutSlots(
  config: WorkspaceLayoutSlotsConfig,
): EnvironmentProviders {
  return makeEnvironmentProviders([
    ...provideSlotContributions(RAIL_SLOT, config.rail),
    ...provideSlotContributions(SECONDARY_NAV_SLOT, config.secondaryNav),
    ...provideSlotContributions(CONVERSATION_HEADER_SLOT, config.conversationHeader),
    ...provideSlotContributions(WORKSPACE_PAGE_HEADER_SLOT, config.pageHeader),
    ...provideSlotContributions(PANEL_SLOT, config.panel),
  ]);
}

function provideSlotContributions<TContribution>(
  token: InjectionToken<TContribution[]>,
  features: readonly WorkspaceLayoutSlotFeature<TContribution>[] = [],
): Provider[] {
  return features.map(
    (feature: WorkspaceLayoutSlotFeature<TContribution>): Provider => ({
      provide: token,
      useFactory: feature.useFactory,
      multi: true,
    }),
  );
}
