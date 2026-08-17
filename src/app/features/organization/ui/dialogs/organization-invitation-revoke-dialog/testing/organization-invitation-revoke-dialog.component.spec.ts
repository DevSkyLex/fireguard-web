import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { OrganizationInvitationOutput } from '@features/organization/models';
import { OrganizationInvitationRevokeDialog } from '../organization-invitation-revoke-dialog.component';

function invitation(
  overrides: Partial<OrganizationInvitationOutput> = {},
): OrganizationInvitationOutput {
  return {
    id: 'invitation-1',
    organizationId: 'org-1',
    email: 'jane@example.com',
    status: 'pending',
    invitedByUserId: 'user-1',
    acceptedByUserId: null,
    revokedByUserId: null,
    expiresAt: '2026-02-01T00:00:00+00:00',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    roleIds: [],
    ...overrides,
  } as unknown as OrganizationInvitationOutput;
}

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-invitation-revoke-dialog"]');

const confirmButton = (): HTMLButtonElement | null =>
  dialog()?.querySelector('[data-testid="organization-invitation-revoke-confirm"]') ?? null;

describe('OrganizationInvitationRevokeDialog', () => {
  let fixture: ComponentFixture<OrganizationInvitationRevokeDialog>;
  let emitted: void[];
  let visibilities: boolean[];

  async function open(
    inputs: Partial<{
      invitation: OrganizationInvitationOutput | null;
      pending: boolean;
      error: string | null;
    }> = {},
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationInvitationRevokeDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('invitation', inputs.invitation ?? invitation());
    fixture.componentRef.setInput('pending', inputs.pending ?? false);
    fixture.componentRef.setInput('error', inputs.error ?? null);
    await fixture.whenStable();

    emitted = [];
    visibilities = [];
    fixture.componentInstance.confirmed.subscribe(() => emitted.push(undefined));
    fixture.componentInstance.visibleChange.subscribe((next) => visibilities.push(next));
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render nothing while closed', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationInvitationRevokeDialog);
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should name the invited email in the confirmation body', async () => {
    await open({ invitation: invitation({ email: 'jane@example.com' }) });

    expect(dialog()?.textContent).toContain('jane@example.com');
  });

  it('should emit confirmed on the confirm action', async () => {
    await open();

    confirmButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(emitted.length).toBe(1);
  });

  it('should refuse to confirm while pending', async () => {
    await open({ pending: true });

    expect(confirmButton()?.disabled).toBe(true);

    fixture.componentInstance['confirm']();
    await fixture.whenStable();

    expect(emitted.length).toBe(0);
  });

  it('should surface the store error', async () => {
    await open({ error: 'invitation already accepted' });

    expect(
      dialog()?.querySelector('[data-testid="organization-invitation-revoke-error"]')?.textContent,
    ).toContain('invitation already accepted');
  });

  it('should report a dismissal as visibleChange(false)', async () => {
    await open();

    fixture.componentInstance['onStateChanged']('closed');
    await fixture.whenStable();

    expect(visibilities).toEqual([false]);
  });
});
