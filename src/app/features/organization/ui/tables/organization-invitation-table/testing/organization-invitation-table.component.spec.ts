import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OrganizationInvitationOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationInvitationTable } from '../organization-invitation-table.component';

type InvitationTableTestApi = OrganizationInvitationTable & {
  expiresLabel(iso: string): string;
  isPending(invitation: OrganizationInvitationOutput): boolean;
  canResend(invitation: OrganizationInvitationOutput): boolean;
  hasRowActions(invitation: OrganizationInvitationOutput): boolean;
  roleName(roleId: string): string;
};

const invitation = (
  overrides: Partial<OrganizationInvitationOutput> = {},
): OrganizationInvitationOutput =>
  ({
    id: 'inv-1',
    email: 'bob@example.com',
    status: 'pending',
    roleIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    invitedByDisplayName: null,
    ...overrides,
  }) as unknown as OrganizationInvitationOutput;

const ROLE: OrganizationRoleOutput = {
  id: 'r1',
  name: 'Admin',
} as unknown as OrganizationRoleOutput;

describe('OrganizationInvitationTable', () => {
  let fixture: ComponentFixture<OrganizationInvitationTable>;
  let component: InvitationTableTestApi;

  function setup(overrides: {
    invitations?: readonly OrganizationInvitationOutput[];
    roles?: readonly OrganizationRoleOutput[];
    loading?: boolean;
    canManage?: boolean;
  }): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [OrganizationInvitationTable] });
    fixture = TestBed.createComponent(OrganizationInvitationTable);
    fixture.componentRef.setInput('invitations', overrides.invitations ?? [invitation()]);
    fixture.componentRef.setInput('roles', overrides.roles ?? [ROLE]);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.componentRef.setInput('canManage', overrides.canManage ?? true);
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as InvitationTableTestApi;
  }

  beforeEach(() => setup({}));

  it('labels a clearly past expiry as Expired', () => {
    expect(component.expiresLabel('2020-01-01T00:00:00.000Z')).toBe('Expired');
  });

  it('returns an empty label for a far-future expiry (falls back to the date)', () => {
    expect(component.expiresLabel('2999-01-01T00:00:00.000Z')).toBe('');
  });

  it('treats only pending invitations as pending', () => {
    expect(component.isPending(invitation({ status: 'pending' }))).toBe(true);
    expect(component.isPending(invitation({ status: 'revoked' }))).toBe(false);
  });

  it('allows resending pending or expired invitations only', () => {
    expect(component.canResend(invitation({ status: 'pending' }))).toBe(true);
    expect(component.canResend(invitation({ status: 'expired' }))).toBe(true);
    expect(component.canResend(invitation({ status: 'accepted' }))).toBe(false);
  });

  it('resolves a role name from its identifier, falling back to the id', () => {
    expect(component.roleName('r1')).toBe('Admin');
    expect(component.roleName('unknown')).toBe('unknown');
  });

  it('renders the invitation email in the table body', () => {
    expect(fixture.nativeElement.textContent).toContain('bob@example.com');
  });

  it('renders the invited-by line only when present', () => {
    setup({ invitations: [invitation({ invitedByDisplayName: 'Alice' })] });
    expect(fixture.nativeElement.textContent).toContain('Alice');
  });

  it('renders skeleton rows while loading', () => {
    setup({ loading: true });
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
  });

  it('renders the empty state when there are no invitations', () => {
    setup({ invitations: [] });
    expect(fixture.nativeElement.textContent).toContain('No pending invitations');
  });

  it('renders role chips for an invitation and a dash when there are none', () => {
    setup({ invitations: [invitation({ roleIds: ['r1'] })] });
    expect(fixture.nativeElement.textContent).toContain('Admin');

    setup({ invitations: [invitation({ roleIds: [] })] });
    expect(fixture.nativeElement.textContent).toContain('—');
  });

  it('exposes row actions only when the member can manage and the invitation is actionable', () => {
    expect(component.hasRowActions(invitation({ status: 'pending' }))).toBe(true);
    expect(component.hasRowActions(invitation({ status: 'accepted' }))).toBe(false);

    setup({ canManage: false });
    expect(component.hasRowActions(invitation({ status: 'pending' }))).toBe(false);
  });

  it('hides the row action button when the member cannot manage invitations', () => {
    setup({ canManage: false, invitations: [invitation({ status: 'pending' })] });
    expect(fixture.nativeElement.querySelector('p-button[aria-label]')).toBeNull();
  });

  it('builds the contextual row menu items for a manageable pending invitation', () => {
    setup({ canManage: true, invitations: [invitation({ status: 'pending' })] });
    const revokeButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('button[aria-label]');
    revokeButton?.click();
    fixture.detectChanges();

    const menuText: string = document.body.textContent ?? '';
    expect(menuText).toContain('Copy link');
    expect(menuText).toContain('Resend');
    expect(menuText).toContain('Revoke');
  });

  it('emits revoke, resend and copyLink from the row menu commands', () => {
    setup({ canManage: true, invitations: [invitation({ status: 'pending' })] });
    const revokeSpy = vi.spyOn(component.revoke, 'emit');
    const resendSpy = vi.spyOn(component.resend, 'emit');
    const copyLinkSpy = vi.spyOn(component.copyLink, 'emit');

    const button: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('button[aria-label]');
    button?.click();
    fixture.detectChanges();

    const menuItems: NodeListOf<HTMLElement> = document.querySelectorAll('.p-menu-item-link');
    menuItems.forEach((item) => item.click());
    fixture.detectChanges();

    expect(copyLinkSpy).toHaveBeenCalled();
    expect(resendSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it('returns no row menu items when nothing is selected or management is disallowed', () => {
    setup({ canManage: false });
    expect(component['rowMenuItems']()).toEqual([]);
  });
});
