export { DashboardLayout } from './dashboard-layout.component';
export type { DashboardPanelContribution, SidebarExtensionContribution } from './models';
export { DashboardPanelRegistry } from './services/dashboard-panel-registry/dashboard-panel-registry.service';
export {
  provideDashboardLayoutSlots,
  withDashboardBreadcrumb,
  withDashboardGlobalNav,
  withDashboardPagePanel,
  type DashboardLayoutSlotsConfig,
} from './providers';
export {
  DASHBOARD_HEADER_ACTIONS_SLOT,
  DASHBOARD_MOBILE_NAVIGATION_SLOT,
  DASHBOARD_HEADER_SLOT,
  DASHBOARD_PANEL_SLOT,
  DASHBOARD_SIDEBAR_EXTENSION_SLOT,
  DASHBOARD_SIDEBAR_FOOTER_SLOT,
  DASHBOARD_SIDEBAR_HEADER_SLOT,
  DASHBOARD_SIDEBAR_NAV_SLOT,
} from './slots';
