import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  activeOrganizationMobileDestination,
  buildOrganizationMobileNavigation,
} from '../organization-mobile-navigation.config';
import { buildOrganizationNavigation } from '../organization-navigation.config';
import { ORGANIZATION_SWITCHER_QUICK_LINKS } from '../organization-switcher-quick-link.config';

describe('buildOrganizationMobileNavigation', () => {
  it('keeps five stable primary ids in their specified order for a full-access member', () => {
    const navigation = buildOrganizationMobileNavigation('org-1', new Set(['organization.*']));
    expect(navigation.primary.map((link) => link.id)).toEqual([
      'dashboard',
      'interventions',
      'assets',
      'messages',
      'more',
    ]);
    expect(navigation.primary.map((link) => link.route)).toEqual([
      '/organizations/org-1',
      '/organizations/org-1/interventions',
      '/organizations/org-1/assets',
      '/organizations/org-1/messages',
      '/organizations/org-1/more',
    ]);
    expect(navigation.primary[0]?.label).toBe('Home');
  });

  it('preserves every allowed sidebar and switcher destination across primary and More', () => {
    const permissions = new Set(['organization.*']);
    const navigation = buildOrganizationMobileNavigation('org-1', permissions);
    const links = [
      ...navigation.primary,
      ...navigation.sections.flatMap((section) => section.links),
    ];
    for (const link of buildOrganizationNavigation('org-1', permissions).flatMap(
      (section) => section.links,
    )) {
      expect(links.find((candidate) => candidate.id === link.id)).toMatchObject({
        id: link.id,
        icon: link.icon,
        route: link.route,
        counterKey: link.counterKey,
        exact: link.exact,
      });
    }
    for (const definition of ORGANIZATION_SWITCHER_QUICK_LINKS) {
      expect(links.find((link) => link.id === definition.id)).toMatchObject({
        route: `/organizations/org-1/${definition.path}`,
        queryParams: definition.queryParams,
      });
    }
    expect(
      navigation.sections
        .find((section) => section.id === 'operations')
        ?.links.map((link) => link.id),
    ).toEqual(['calendar', 'inspections', 'workload', 'checklists', 'maintenance', 'approvals']);
  });

  it('omits denied primary destinations without substituting secondary destinations', () => {
    const navigation = buildOrganizationMobileNavigation(
      'org-1',
      new Set([ORGANIZATION_PERMISSION.EVENTS_READ]),
    );
    expect(navigation.primary.map((link) => link.id)).toEqual(['more']);
    expect(navigation.sections.map((section) => section.id)).toEqual(['operations', 'account']);
    expect(navigation.sections[0]?.links.map((link) => link.id)).toEqual(['calendar', 'workload']);
  });

  it.each(['organization.messaging.read', 'organization.messaging.*', 'organization.*'])(
    'shares the collaboration grant semantics for %s',
    (grant) => {
      const navigation = buildOrganizationMobileNavigation('org-1', new Set([grant]));
      expect(navigation.primary.some((link) => link.id === 'messages')).toBe(true);
      expect(
        navigation.sections.find((section) => section.id === 'collaboration')?.links[0]?.route,
      ).toBe('/organizations/org-1/channels');
    },
  );

  it('does not infer read access from messaging write or an unrelated wildcard', () => {
    const navigation = buildOrganizationMobileNavigation(
      'org-1',
      new Set(['organization.messaging.write', 'other.*']),
    );
    expect(navigation.primary.map((link) => link.id)).toEqual(['more']);
    expect(navigation.sections.map((section) => section.id)).toEqual(['operations', 'account']);
    expect(navigation.sections[0]?.links.map((link) => link.id)).toEqual(['workload']);
  });

  it.each([
    [ORGANIZATION_PERMISSION.TEAMS_READ, 'teams'],
    [ORGANIZATION_PERMISSION.ROLES_READ, 'roles'],
    [ORGANIZATION_PERMISSION.ROLES_MANAGE, 'roles'],
    [ORGANIZATION_PERMISSION.MEMBERS_MANAGE, 'members'],
  ])('preserves independently permitted people tab %s', (permission, tab) => {
    const navigation = buildOrganizationMobileNavigation('org-1', new Set([permission]));
    const links = navigation.sections.find((section) => section.id === 'administration')?.links;
    expect(links?.map((link) => link.id)).toEqual([tab]);
    expect(links?.[0]?.route).toBe('/organizations/org-1/members');
    expect(links?.[0]?.queryParams).toEqual(tab === 'members' ? null : { tab });
  });

  it('retains subscription query parameters and exposes notifications once', () => {
    const navigation = buildOrganizationMobileNavigation('org-1', new Set(['organization.*']));
    const links = navigation.sections.flatMap((section) => section.links);
    expect(links.find((link) => link.id === 'billing')).toMatchObject({
      route: '/organizations/org-1/settings',
      queryParams: { tab: 'subscription' },
    });
    expect(links.filter((link) => link.id === 'notifications')).toHaveLength(1);
    expect(links.find((link) => link.id === 'notifications')).toMatchObject({
      route: '/account/notifications',
    });
    expect(links.find((link) => link.id === 'notifications')?.queryParams).toBeUndefined();
  });

  it('offers account and organizations without building any null organization URLs', () => {
    const navigation = buildOrganizationMobileNavigation(null, new Set(['organization.*']));
    expect(navigation.primary.map((link) => [link.id, link.route])).toEqual([
      ['account', '/account/profile'],
      ['organizations', '/account/organizations'],
    ]);
    expect(navigation.sections.map((section) => section.id)).toEqual(['account']);
    expect(navigation.sections[0]?.links.map((link) => link.id)).toEqual([
      'account',
      'security',
      'notifications',
      'organizations',
    ]);
  });
});

describe('activeOrganizationMobileDestination', () => {
  const navigation = buildOrganizationMobileNavigation('org-1', new Set(['organization.*']));

  it.each([
    ['/organizations/org-1?period=30#activity', 'dashboard'],
    ['/organizations/org-1/', 'dashboard'],
    ['/organizations/org-1/interventions/job-1?tab=activity', 'interventions'],
    ['/organizations/org-1/assets?facility=site-1', 'assets'],
    ['/organizations/org-1/facilities/site-1', 'assets'],
    ['/organizations/org-1/equipments/item-1', 'assets'],
    ['/organizations/org-1/messages/saved', 'messages'],
    ['/organizations/org-1/messages/thread-1', 'messages'],
    ['/organizations/org-1/channels/channel-1', 'more'],
    ['/organizations/org-1/settings?tab=subscription', 'more'],
    ['/organizations/org-1/members?tab=roles', 'more'],
    ['/organizations/org-1/more', 'more'],
    ['/account/security', 'more'],
    ['/organizations/org-10/interventions', null],
    ['/organizations/org-2', null],
    ['/auth/login', null],
  ])('matches %s to %s', (url, expected) => {
    expect(activeOrganizationMobileDestination(navigation, url)).toBe(expected);
  });

  it('keeps account fallback selection on account subpages and organizations distinct', () => {
    const fallback = buildOrganizationMobileNavigation(null, new Set());
    expect(activeOrganizationMobileDestination(fallback, '/account/security')).toBe('account');
    expect(activeOrganizationMobileDestination(fallback, '/account/organizations')).toBe(
      'organizations',
    );
    expect(activeOrganizationMobileDestination(fallback, '/organizations')).toBeNull();
  });
});
