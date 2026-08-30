import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  OrganizationInvitationOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationInvitationTable } from '../organization-invitation-table.component';

function invitation(
  overrides: Partial<OrganizationInvitationOutput> = {},
): OrganizationInvitationOutput {
  return {
    id: 'invitation-1',
    organizationId: 'org-1',
    email: 'new@example.com',
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

describe('OrganizationInvitationTable', () => {
  let fixture: ComponentFixture<OrganizationInvitationTable>;
  let linkCopies: string[];
  let resends: OrganizationInvitationOutput[];
  let revokes: OrganizationInvitationOutput[];

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function createTable(items: readonly OrganizationInvitationOutput[] = []): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationInvitationTable);
    fixture.componentRef.setInput('items', items);
    await fixture.whenStable();

    linkCopies = [];
    resends = [];
    revokes = [];
    fixture.componentInstance.linkCopyRequested.subscribe((link) => linkCopies.push(link));
    fixture.componentInstance.resendRequested.subscribe((target) => resends.push(target));
    fixture.componentInstance.revokeRequested.subscribe((target) => revokes.push(target));
  }

  /** Opens a row's `…` menu and returns its overlay content, rendered outside `fixture.nativeElement`. */
  async function openRowMenu(): Promise<HTMLElement> {
    root()
      .querySelector('[data-testid="organization-invitation-table-row-menu"]')
      ?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    return document.body;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should draw placeholder rows on a first load, and nothing empty in their place', async () => {
    await createTable();
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    expect(
      root().querySelectorAll('[data-testid="organization-invitation-table-row"]'),
    ).toHaveLength(0);
    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should keep the rows on screen while a later page loads', async () => {
    await createTable([invitation()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    // The shared surface's loading contract is "first load only": flashing the
    // table to skeletons on page 2 loses the reader's place for nothing.
    expect(
      root().querySelectorAll('[data-testid="organization-invitation-table-row"]'),
    ).toHaveLength(1);
    expect(root().querySelectorAll('hlm-skeleton')).toHaveLength(0);
  });

  it('should render the same invitation a second time as a card, under the row testid plus -card', async () => {
    await createTable([invitation({ id: 'a' }), invitation({ id: 'b' })]);

    // Both layouts stay mounted — a container query, not an `@if`, picks the
    // visible one — so a card is a second render of the same row.
    expect(
      root().querySelectorAll('[data-testid="organization-invitation-table-row-card"]'),
    ).toHaveLength(2);
    expect(
      root().querySelectorAll('[data-testid="organization-invitation-table-row"]'),
    ).toHaveLength(2);
  });

  it('should say so plainly when there is nothing to show', async () => {
    await createTable();

    expect(root().textContent).toContain('No results.');
  });

  it('should name the scrolling region from the table caption', async () => {
    await createTable([invitation()]);

    const region: HTMLElement | null = root().querySelector('[role="region"]');
    const caption: HTMLElement | null = root().querySelector('caption');

    expect(region?.getAttribute('aria-labelledby')).toBe(caption?.id);
    expect(caption?.id).toBeTruthy();
  });

  it('should join roleIds against the given roles, in the order the API returned them', async () => {
    await createTable();
    fixture.componentRef.setInput('items', [invitation({ roleIds: ['r2', 'r1'] })]);
    fixture.componentRef.setInput('roles', [
      { id: 'r1', name: 'Inspector' } as unknown as OrganizationRoleOutput,
      { id: 'r2', name: 'Admin' } as unknown as OrganizationRoleOutput,
    ]);
    await fixture.whenStable();

    const row = root().querySelector('[data-testid="organization-invitation-table-row"]');
    expect(row?.textContent).toContain('Admin, Inspector');
  });

  it('should show a "No role" fallback when the invitation carries none', async () => {
    await createTable();
    fixture.componentRef.setInput('items', [invitation({ roleIds: [] })]);
    await fixture.whenStable();

    expect(root().textContent).toContain('No role');
  });

  it('should label an expired invitation distinctly from a merely pending one', async () => {
    await createTable();
    fixture.componentRef.setInput('items', [invitation({ status: 'expired' })]);
    await fixture.whenStable();

    const row = root().querySelector('[data-testid="organization-invitation-table-row"]');

    expect(row?.textContent).toContain('Expired');
    expect(row?.textContent).not.toContain('Pending');
  });

  it('should emit the row’s accept link to copy', async () => {
    await createTable();
    fixture.componentRef.setInput('items', [invitation()]);
    fixture.componentRef.setInput('links', { 'invitation-1': 'https://app.test/accept?token=abc' });
    await fixture.whenStable();

    const overlay = await openRowMenu();
    overlay.querySelectorAll('button').forEach((button) => {
      if (button.textContent?.includes('Copy accept link')) button.click();
    });
    await fixture.whenStable();

    expect(linkCopies).toEqual(['https://app.test/accept?token=abc']);
  });

  it('should offer no accept-link entry once the session-only link has not been captured', async () => {
    await createTable();
    fixture.componentRef.setInput('items', [invitation()]);
    await fixture.whenStable();

    const overlay = await openRowMenu();
    const hasCopyEntry = Array.from(overlay.querySelectorAll('button')).some((button) =>
      button.textContent?.includes('Copy accept link'),
    );

    expect(hasCopyEntry).toBe(false);
  });

  it('should offer Resend and Revoke only to a member holding canManage', async () => {
    await createTable();
    fixture.componentRef.setInput('items', [invitation()]);
    fixture.componentRef.setInput('canManage', false);
    await fixture.whenStable();

    const overlay = await openRowMenu();

    expect(
      overlay.querySelector('[data-testid="organization-invitation-table-row-resend"]'),
    ).toBeNull();
    expect(
      overlay.querySelector('[data-testid="organization-invitation-table-row-revoke"]'),
    ).toBeNull();
  });

  it('should emit resendRequested and revokeRequested with the row’s raw invitation', async () => {
    await createTable();
    const target = invitation();
    fixture.componentRef.setInput('items', [target]);
    fixture.componentRef.setInput('canManage', true);
    await fixture.whenStable();

    let overlay = await openRowMenu();
    (
      overlay.querySelector(
        '[data-testid="organization-invitation-table-row-resend"]',
      ) as HTMLButtonElement | null
    )?.click();
    await fixture.whenStable();

    expect(resends).toEqual([target]);

    overlay = await openRowMenu();
    (
      overlay.querySelector(
        '[data-testid="organization-invitation-table-row-revoke"]',
      ) as HTMLButtonElement | null
    )?.click();
    await fixture.whenStable();

    expect(revokes).toEqual([target]);
  });

  it('should lock Resend and Revoke while a mutation is pending', async () => {
    await createTable();
    fixture.componentRef.setInput('items', [invitation()]);
    fixture.componentRef.setInput('canManage', true);
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    const overlay = await openRowMenu();
    const resendButton = overlay.querySelector(
      '[data-testid="organization-invitation-table-row-resend"]',
    ) as HTMLButtonElement | null;
    const revokeButton = overlay.querySelector(
      '[data-testid="organization-invitation-table-row-revoke"]',
    ) as HTMLButtonElement | null;

    expect(resendButton?.disabled).toBe(true);
    expect(revokeButton?.disabled).toBe(true);
  });
});
