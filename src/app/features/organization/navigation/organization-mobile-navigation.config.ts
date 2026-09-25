import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import type { OrganizationAdministrationLinkDefinition } from './organization-administration-link-definition.interface';
import type { OrganizationMobileNavigationLink } from './organization-mobile-navigation-link.interface';
import type { OrganizationMobileNavigationModel } from './organization-mobile-navigation-model.interface';
import type { OrganizationMobileNavigationSection } from './organization-mobile-navigation-section.interface';
import {
  buildOrganizationNavigation,
  hasOrganizationNavigationAccess,
  matchesOrganizationPermission,
} from './organization-navigation.config';
import { ORGANIZATION_SWITCHER_QUICK_LINKS } from './organization-switcher-quick-link.config';

/**
 * Constant ACCOUNT_LINKS
 *
 * @description
 * Existing account routes available independently of organization permissions.
 *
 * @since 1.0.0
 */
const ACCOUNT_LINKS: readonly OrganizationMobileNavigationLink[] = [
  {
    id: 'account',
    label: $localize`:@@account.menu.profile:Account`,
    icon: 'lucideUserRound',
    route: '/account/profile',
    exact: false,
  },
  {
    id: 'security',
    label: $localize`:@@account.menu.security:Security`,
    icon: 'lucideShieldCheck',
    route: '/account/security',
    exact: false,
  },
  {
    id: 'notifications',
    label: $localize`:@@account.menu.notifications:Notifications`,
    icon: 'lucideBell',
    route: '/account/notifications',
    exact: false,
  },
  {
    id: 'organizations',
    label: $localize`:@@account.menu.organizations:Your organizations`,
    icon: 'lucideBuilding2',
    route: '/account/organizations',
    exact: false,
  },
];

/**
 * Constant MEMBERSHIP_TAB_LINKS
 *
 * @description
 * Direct links to the existing independently permission-gated members page tabs.
 *
 * @since 1.0.0
 */
const MEMBERSHIP_TAB_LINKS: readonly OrganizationAdministrationLinkDefinition[] = [
  {
    id: 'teams',
    label: $localize`:@@org.more.teams:Teams`,
    icon: 'lucideUsersRound',
    path: 'members',
    queryParams: { tab: 'teams' },
    permissions: [ORGANIZATION_PERMISSION.TEAMS_READ],
    match: 'all',
  },
  {
    id: 'roles',
    label: $localize`:@@org.more.roles:Roles and permissions`,
    icon: 'lucideShieldCheck',
    path: 'members',
    queryParams: { tab: 'roles' },
    permissions: [ORGANIZATION_PERMISSION.ROLES_READ, ORGANIZATION_PERMISSION.ROLES_MANAGE],
    match: 'any',
  },
];

/**
 * Function buildOrganizationMobileNavigation
 *
 * @description
 * Resolves the five stable primary destinations in their fixed order and groups all
 * remaining allowed routes for More. Denied destinations are omitted, never replaced
 * by another tab. Equipment stays reachable in More independently of facility access.
 * Messaging uses the same grant matcher as CollaborationNav.
 *
 * @access public
 * @since 1.0.0
 * @param {string | null} organizationId - Current workspace from the owner context.
 * @param {ReadonlySet<string>} grantedPermissions - Effective member grants.
 * @returns {OrganizationMobileNavigationModel} Navigation derived without side effects.
 */
export function buildOrganizationMobileNavigation(
  organizationId: string | null,
  grantedPermissions: ReadonlySet<string>,
): OrganizationMobileNavigationModel {
  const account: OrganizationMobileNavigationSection = {
    id: 'account',
    label: $localize`:@@org.more.account:Your account`,
    links: ACCOUNT_LINKS,
  };
  if (organizationId === null) {
    return {
      organizationId,
      primary: ACCOUNT_LINKS.filter((link) => link.id === 'account' || link.id === 'organizations'),
      sections: [account],
    };
  }

  const prefix = `/organizations/${organizationId}`;
  const organizationSections = buildOrganizationNavigation(organizationId, grantedPermissions);
  const organizationLinks = organizationSections.flatMap((section) => section.links);
  const primaryIds = ['dashboard', 'interventions', 'assets'];
  const canReadMessaging = Array.from(grantedPermissions).some((grant) =>
    matchesOrganizationPermission(grant, ORGANIZATION_PERMISSION.MESSAGING_READ),
  );
  const primary: OrganizationMobileNavigationLink[] = primaryIds.flatMap((id) =>
    organizationLinks
      .filter((link) => link.id === id)
      .map((link) =>
        link.id === 'dashboard' ? { ...link, label: $localize`:@@org.mobileNav.home:Home` } : link,
      ),
  );
  if (canReadMessaging) {
    primary.push({
      id: 'messages',
      label: $localize`:@@org.mobileNav.messages:Messages`,
      icon: 'lucideMessagesSquare',
      route: `${prefix}/messages`,
      exact: false,
    });
  }
  primary.push({
    id: 'more',
    label: $localize`:@@route.organizationMore:More`,
    icon: 'lucideEllipsis',
    route: `${prefix}/more`,
    exact: true,
  });

  const sections: OrganizationMobileNavigationSection[] = organizationSections.map((section) => ({
    id: section.id,
    label: section.label,
    links: [
      ...section.links.filter((link) => !primaryIds.includes(link.id)),
      ...(section.id === 'assets' &&
      hasOrganizationNavigationAccess(
        { permissions: [ORGANIZATION_PERMISSION.EQUIPMENT_READ] },
        grantedPermissions,
      )
        ? [
            {
              id: 'equipments',
              label: $localize`:@@route.equipments:Equipments`,
              icon: 'lucidePackage',
              route: `${prefix}/equipments`,
              exact: false,
            },
          ]
        : []),
    ],
  }));
  if (canReadMessaging) {
    sections.push({
      id: 'collaboration',
      label: $localize`:@@org.more.collaboration:Collaboration`,
      links: [
        {
          id: 'channels',
          label: $localize`:@@org.more.channels:Channels`,
          icon: 'lucideUsersRound',
          route: `${prefix}/channels`,
          exact: false,
        },
      ],
    });
  }
  const adminLinks = [...ORGANIZATION_SWITCHER_QUICK_LINKS, ...MEMBERSHIP_TAB_LINKS];
  const adminOrder = ['members', 'teams', 'roles', 'settings', 'billing', 'webhooks', 'audit'];
  sections.push(
    {
      id: 'administration',
      label: $localize`:@@org.more.administration:Administration`,
      links: adminOrder
        .flatMap((id) =>
          adminLinks.filter(
            (link) => link.id === id && hasOrganizationNavigationAccess(link, grantedPermissions),
          ),
        )
        .map((link) => ({
          id: link.id,
          label: link.label,
          icon: link.icon,
          route: `${prefix}/${link.path}`,
          queryParams: link.queryParams,
          exact: false,
        })),
    },
    account,
  );
  return {
    organizationId,
    primary,
    sections: sections.filter((section) => section.links.length > 0),
  };
}

/**
 * Function activeOrganizationMobileDestination
 *
 * @description
 * Finds the current primary destination from the URL. Asset detail routes belong
 * to Assets; secondary organization and account pages belong to More. Segment
 * boundaries prevent similar names and another organization from matching.
 *
 * @access public
 * @since 1.0.0
 * @param {OrganizationMobileNavigationModel} navigation - Allowed destinations.
 * @param {string} url - Current router URL, including any query or fragment.
 * @returns {string | null} Stable destination id, or null outside this workspace.
 */
export function activeOrganizationMobileDestination(
  navigation: OrganizationMobileNavigationModel,
  url: string,
): string | null {
  const path = url.split(/[?#]/u)[0]?.replace(/\/$/u, '') ?? '';
  const matches = (route: string): boolean => path === route || path.startsWith(`${route}/`);
  const active = navigation.primary.find(
    (link) => link.id !== 'more' && (link.exact ? path === link.route : matches(link.route)),
  );
  if (active) return active.id;
  if (navigation.organizationId === null) return matches('/account') ? 'account' : null;
  const prefix = `/organizations/${navigation.organizationId}`;
  if (
    navigation.primary.some((link) => link.id === 'assets') &&
    (matches(`${prefix}/facilities`) || matches(`${prefix}/equipments`))
  )
    return 'assets';
  if (matches('/account') || matches(`${prefix}/more`) || path.startsWith(`${prefix}/`))
    return 'more';
  return null;
}
