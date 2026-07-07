import { TestBed } from '@angular/core/testing';
import type { OrganizationInvitationOutput } from '@features/organization/models';
import { OrganizationInvitationTable } from '../organization-invitation-table.component';

type InvitationTableTestApi = OrganizationInvitationTable & {
  expiresLabel(iso: string): string;
  isPending(invitation: OrganizationInvitationOutput): boolean;
  canResend(invitation: OrganizationInvitationOutput): boolean;
};

const invitation = (status: string): OrganizationInvitationOutput =>
  ({ status }) as unknown as OrganizationInvitationOutput;

describe('OrganizationInvitationTable', () => {
  let component: InvitationTableTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(
      () => new OrganizationInvitationTable() as unknown as InvitationTableTestApi,
    );
  });

  it('labels a clearly past expiry as Expired', () => {
    expect(component.expiresLabel('2020-01-01T00:00:00.000Z')).toBe('Expired');
  });

  it('returns an empty label for a far-future expiry (falls back to the date)', () => {
    expect(component.expiresLabel('2999-01-01T00:00:00.000Z')).toBe('');
  });

  it('treats only pending invitations as pending', () => {
    expect(component.isPending(invitation('pending'))).toBe(true);
    expect(component.isPending(invitation('revoked'))).toBe(false);
  });

  it('allows resending pending or expired invitations only', () => {
    expect(component.canResend(invitation('pending'))).toBe(true);
    expect(component.canResend(invitation('expired'))).toBe(true);
    expect(component.canResend(invitation('accepted'))).toBe(false);
  });
});
