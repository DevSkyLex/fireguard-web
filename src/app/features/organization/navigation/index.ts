export {
  buildOrganizationMobileNavigation,
  activeOrganizationMobileDestination,
} from './organization-mobile-navigation.config';
export type { OrganizationMobileNavigationModel } from './organization-mobile-navigation-model.interface';
export type { OrganizationMobileNavigationLink } from './organization-mobile-navigation-link.interface';
export type { OrganizationMobileNavigationSection } from './organization-mobile-navigation-section.interface';
export { ORGANIZATION_SWITCHER_QUICK_LINKS } from './organization-switcher-quick-link.config';
export type { OrganizationSwitcherQuickLinkDefinition } from './organization-switcher-quick-link-definition.interface';
export {
  buildOrganizationNavigation,
  hasOrganizationNavigationAccess,
  matchesOrganizationPermission,
  ORGANIZATION_NAVIGATION_GROUPS,
  ORGANIZATION_NAVIGATION_ITEMS,
} from './organization-navigation.config';
export type {
  OrganizationNavigationCounterKey,
  OrganizationNavigationGroup,
  OrganizationNavigationGroupId,
  OrganizationNavigationItem,
  OrganizationNavigationLink,
  OrganizationNavigationMatch,
  OrganizationNavigationSection,
} from './organization-navigation.config';
