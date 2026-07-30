export { WorkspaceLayout } from './workspace-layout.component';
export {
  provideWorkspaceLayoutSlots,
  withThemeSwitcher,
  type WorkspaceLayoutConversationHeaderSlotFeature,
  type WorkspaceLayoutPageHeaderSlotFeature,
  type WorkspaceLayoutPanelSlotFeature,
  type WorkspaceLayoutRailSlotFeature,
  type WorkspaceLayoutSecondaryNavSlotFeature,
  type WorkspaceLayoutSlotFeature,
  type WorkspaceLayoutSlotsConfig,
} from './providers';
export { WorkspaceShellService, type WorkspaceMobilePane } from './services';
export type { RailContribution, RailRegion } from './slots/rail';
export type { SecondaryNavContribution } from './slots/secondary-nav';
export type { ConversationHeaderContribution } from './slots/conversation-header';
export type { PageHeaderContribution } from './slots/page-header';
export type { PanelContribution } from './slots/panel';
