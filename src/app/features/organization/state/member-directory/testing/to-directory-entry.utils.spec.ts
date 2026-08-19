import type { OrganizationMemberOutput } from '@features/organization/models';
import { toDirectoryEntry } from '../utils';

function member(overrides: Partial<OrganizationMemberOutput> = {}): OrganizationMemberOutput {
  return {
    '@id': '/api/organizations/org-1/members/mem-1',
    '@type': 'OrganizationMember',
    id: 'mem-1',
    organizationId: 'org-1',
    userId: 'user-1',
    displayName: '',
    isActive: true,
    isOwner: false,
    joinedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    ...overrides,
  };
}

describe('toDirectoryEntry', () => {
  it('should prefer the display name', () => {
    const entry = toDirectoryEntry(
      member({ displayName: 'Daniel Anderson', firstName: 'Dan', email: 'd@x.io' }),
    );

    expect(entry.displayName).toBe('Daniel Anderson');
  });

  it('should fall back to the full name', () => {
    const entry = toDirectoryEntry(member({ firstName: 'Amélie', lastName: 'Rivet' }));

    expect(entry.displayName).toBe('Amélie Rivet');
  });

  it('should use whichever name part exists', () => {
    expect(toDirectoryEntry(member({ lastName: 'Rivet' })).displayName).toBe('Rivet');
  });

  it('should fall back to the email, then to the id', () => {
    expect(toDirectoryEntry(member({ email: 'd@x.io' })).displayName).toBe('d@x.io');
    expect(toDirectoryEntry(member()).displayName).toBe('mem-1');
  });

  it('should treat a blank name as absent', () => {
    // These three fields are optional *and* nullable on this contract, unusually
    // — everywhere else the API omits nulls.
    const entry = toDirectoryEntry(
      member({ displayName: '   ', firstName: null, lastName: null, email: 'd@x.io' }),
    );

    expect(entry.displayName).toBe('d@x.io');
  });

  it('should normalize a null avatar to undefined and a missing role list to empty', () => {
    const entry = toDirectoryEntry(member({ avatarUrl: null }));

    expect(entry.avatarUrl).toBeUndefined();
    expect(entry.roleNames).toEqual([]);
  });
});
