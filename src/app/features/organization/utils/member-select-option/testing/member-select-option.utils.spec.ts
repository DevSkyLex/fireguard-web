import type { OrganizationMemberOutput } from '@features/organization/models';
import { toMemberSelectOption } from '../member-select-option.utils';

const memberOf = (overrides: Partial<OrganizationMemberOutput> = {}): OrganizationMemberOutput =>
  ({
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    email: 'ada@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    displayName: 'Ada Lovelace',
    avatarUrl: null,
    isActive: true,
    isOwner: false,
    joinedAt: '2024-01-01T00:00:00Z',
    roleIds: ['role-1'],
    roleNames: ['Technician'],
    ...overrides,
  }) as unknown as OrganizationMemberOutput;

describe('toMemberSelectOption', () => {
  it('should default the value to the member IRI and derive name, initials and roles', () => {
    expect(toMemberSelectOption(memberOf(), 'org-1')).toEqual({
      value: '/api/organizations/org-1/members/member-1',
      label: 'Ada Lovelace',
      displayName: 'Ada Lovelace',
      roleLabel: 'Technician',
      avatarUrl: null,
      initials: 'AL',
    });
  });

  it('should take an explicit value and fall back on the name pair, then the user id', () => {
    const named = toMemberSelectOption(memberOf({ displayName: '  ' }), 'org-1', 'member-1');
    const anonymous = toMemberSelectOption(
      memberOf({ displayName: '', firstName: null, lastName: null, roleNames: [] }),
      'org-1',
      'user-1',
    );

    expect(named.value).toBe('member-1');
    expect(named.displayName).toBe('Ada Lovelace');
    expect(anonymous.displayName).toBe('user-1');
    expect(anonymous.initials).toBe('U');
    expect(anonymous.roleLabel).toBe('No assigned role');
  });
});
