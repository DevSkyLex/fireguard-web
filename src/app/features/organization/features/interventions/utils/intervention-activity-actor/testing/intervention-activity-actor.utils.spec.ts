import type { MemberSelectOption } from '@features/organization/features/interventions/models';
import { resolveInterventionActivityActor } from '../intervention-activity-actor.utils';

const member = (overrides: Partial<MemberSelectOption> = {}): MemberSelectOption => ({
  value: '/api/organizations/org-1/members/member-1',
  label: 'Jane Doe',
  displayName: 'Jane Doe',
  roleLabel: 'Manager',
  avatarUrl: null,
  initials: 'JD',
  ...overrides,
});

describe('resolveInterventionActivityActor', () => {
  it('should return null for a system entry with no actor', () => {
    expect(resolveInterventionActivityActor(null, [member()])).toBeNull();
  });

  it('should resolve the matching member by IRI', () => {
    const target: MemberSelectOption = member();

    expect(resolveInterventionActivityActor(target.value, [target])).toBe(target);
  });

  it('should return null when the actor is not among the loaded members', () => {
    expect(
      resolveInterventionActivityActor('/api/organizations/org-1/members/gone', [member()]),
    ).toBeNull();
  });
});
