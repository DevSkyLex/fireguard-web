import type { DashboardGlobalNavItem } from '../../models';
import { buildDashboardGlobalNavRows } from '../build-nav-rows.utils';

const catalog: readonly DashboardGlobalNavItem[] = Object.freeze([
  { id: 'support', label: 'Support', icon: 'support', route: null },
  { id: 'account', label: 'Account', icon: 'account', route: '/account' },
  {
    id: 'workspace',
    label: 'Workspace',
    icon: 'workspace',
    route: 'settings',
    organizationScoped: true,
    permissions: ['organization.read'],
  },
  { id: 'future', label: 'Future', icon: 'future', route: null, organizationScoped: true },
]);

describe('buildDashboardGlobalNavRows', () => {
  it.each(['organization.read', 'organization.*'])(
    'keeps wildcard and exact grants: %s',
    (grant) => {
      const rows = buildDashboardGlobalNavRows(catalog, 'org-1', [grant]);
      expect(rows.map((row) => row.id)).toEqual(['support', 'account', 'workspace']);
      expect(rows[2]?.resolvedRoute).toBe('/organizations/org-1/settings');
      expect(rows[0]?.resolvedRoute).toBeNull();
      expect(rows[1]?.resolvedRoute).toBe('/account');
    },
  );

  it.each([
    { permissions: [] },
    { permissions: ['organizations.read'] },
    { permissions: ['organization.members.*'] },
  ])('withholds the gated destination for %j', ({ permissions }) => {
    expect(buildDashboardGlobalNavRows(catalog, 'org-1', permissions).map((row) => row.id)).toEqual(
      ['support', 'account'],
    );
  });

  it('withholds organization destinations without a selected organization', () => {
    expect(
      buildDashboardGlobalNavRows(catalog, null, ['organization.*']).map((row) => row.id),
    ).toEqual(['support', 'account']);
  });

  it('projects another organization and revoked grants without mutating the catalog', () => {
    const before = structuredClone(catalog);
    expect(
      buildDashboardGlobalNavRows(catalog, 'org-2', ['organization.*'])[2]?.resolvedRoute,
    ).toBe('/organizations/org-2/settings');
    expect(buildDashboardGlobalNavRows(catalog, 'org-2', []).map((row) => row.id)).toEqual([
      'support',
      'account',
    ]);
    expect(catalog).toEqual(before);
  });
});
