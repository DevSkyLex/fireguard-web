import { resolveInvitationTag } from '../invitation-tag.util';

describe('resolveInvitationTag', () => {
  it('resolves invitation status descriptors', () => {
    expect(resolveInvitationTag('invitationStatus', 'pending').severity).toBe('info');
    expect(resolveInvitationTag('invitationStatus', 'accepted').severity).toBe('success');
    expect(resolveInvitationTag('invitationStatus', 'revoked').severity).toBe('danger');
    expect(resolveInvitationTag('invitationStatus', 'expired').severity).toBe('warn');
  });

  it('resolves member status descriptors', () => {
    expect(resolveInvitationTag('memberStatus', 'active').severity).toBe('success');
    expect(resolveInvitationTag('memberStatus', 'inactive').severity).toBe('secondary');
  });

  it('falls back to a neutral descriptor for unknown values', () => {
    const descriptor = resolveInvitationTag('invitationStatus', 'something_else');
    expect(descriptor.severity).toBe('secondary');
    expect(descriptor.label).toBe('something else');
    expect(descriptor.icon).toBe('pi pi-tag');
  });
});
