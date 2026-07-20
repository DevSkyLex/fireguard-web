import { toMemberId } from '../member-reference.adapter';

describe('toMemberId', () => {
  // The shape the API actually sends on authorMember, pinnedBy and mentions.
  it('should extract the id from a member IRI', () => {
    expect(toMemberId('/api/organizations/org-1/members/member-abc')).toBe('member-abc');
  });

  // Callers must be able to convert defensively without corrupting the value.
  it('should leave an already-bare id alone', () => {
    expect(toMemberId('member-abc')).toBe('member-abc');
  });

  it('should degrade an empty reference to an empty id rather than throwing', () => {
    expect(toMemberId('')).toBe('');
  });
});
