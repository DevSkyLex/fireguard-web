import { hasAnyOrganizationPermission } from '../has-any-permission.utils';

describe('hasAnyOrganizationPermission', () => {
  it.each([
    [['organization.read'], ['organization.read'], true],
    [['organization.*'], ['organization.members.read'], true],
    [['organization.members.*'], ['organization.read'], false],
    [['organization.*'], ['organizations.read'], false],
    [[' organization.read '], [' organization.read '], true],
    [[], ['organization.read'], false],
    [['organization.*'], [], false],
    [['organization.*'], [''], false],
    [['organization.read'], ['organization.write', 'organization.read'], true],
  ] as const)(
    'evaluates grants %j against requirements %j as %s',
    (granted, required, expected) => {
      expect(hasAnyOrganizationPermission(granted, required)).toBe(expected);
    },
  );
});
