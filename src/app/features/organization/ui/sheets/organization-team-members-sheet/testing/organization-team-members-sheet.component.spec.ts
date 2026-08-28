import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type {
  AddTeamMemberInput,
  OrganizationMemberOutput,
  TeamMemberOutput,
  TeamOutput,
} from '@features/organization/models';
import { OrganizationTeamMembersSheet } from '../organization-team-members-sheet.component';

const TEAM: TeamOutput = {
  '@id': '/api/organizations/org-1/teams/team-1',
  '@type': 'Team',
  id: 'team-1',
  organizationId: 'org-1',
  name: 'Response team',
  description: '',
  memberCount: 1,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const ORG_MEMBER: OrganizationMemberOutput = {
  '@id': '/api/organizations/org-1/members/member-1',
  '@type': 'OrganizationMember',
  id: 'member-1',
  organizationId: 'org-1',
  userId: 'user-1',
  displayName: 'Ada Lovelace',
  isActive: true,
  isOwner: false,
  joinedAt: '2026-01-01T00:00:00Z',
  roleIds: [],
};

const OTHER_ORG_MEMBER: OrganizationMemberOutput = {
  ...ORG_MEMBER,
  '@id': '/api/organizations/org-1/members/member-2',
  id: 'member-2',
  userId: 'user-2',
  displayName: 'Grace Hopper',
};

const ROSTER_ROW: TeamMemberOutput = {
  '@id': '/api/organizations/org-1/teams/team-1/members/member-1',
  '@type': 'TeamMember',
  memberId: 'member-1',
  role: 'lead',
  addedAt: '2026-01-05T00:00:00Z',
};

const sheet = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-team-members-sheet"]');

describe('OrganizationTeamMembersSheet', () => {
  let fixture: ComponentFixture<OrganizationTeamMembersSheet>;

  async function create(
    inputs: Partial<{
      members: readonly TeamMemberOutput[];
      orgMembers: readonly OrganizationMemberOutput[];
      loadingMembers: boolean;
      membersError: string | null;
      canWrite: boolean;
      isAddingMember: boolean;
      isRemovingMember: boolean;
    }> = {},
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationTeamMembersSheet);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('team', TEAM);
    fixture.componentRef.setInput('members', inputs.members ?? [ROSTER_ROW]);
    fixture.componentRef.setInput('orgMembers', inputs.orgMembers ?? [ORG_MEMBER]);
    fixture.componentRef.setInput('loadingMembers', inputs.loadingMembers ?? false);
    fixture.componentRef.setInput('membersError', inputs.membersError ?? null);
    fixture.componentRef.setInput('canWrite', inputs.canWrite ?? true);
    fixture.componentRef.setInput('isAddingMember', inputs.isAddingMember ?? false);
    fixture.componentRef.setInput('isRemovingMember', inputs.isRemovingMember ?? false);
    await fixture.whenStable();
  }

  it('should render nothing while closed', async () => {
    await create();
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(sheet()).toBeNull();
  });

  it('should resolve the roster row identity from the member directory', async () => {
    await create();

    expect(sheet()?.textContent).toContain('Ada Lovelace');
  });

  it('should fall back to a generic name for a roster row missing from the directory', async () => {
    await create({ orgMembers: [] });

    expect(sheet()?.textContent).toContain('Member');
  });

  it('should render the row’s free-form role label as a badge', async () => {
    await create();

    expect(sheet()?.querySelector('[hlmBadge]')?.textContent).toContain('lead');
  });

  it('should render no badge for a row without a role label', async () => {
    await create({ members: [{ ...ROSTER_ROW, role: undefined }] });

    expect(sheet()?.querySelector('[hlmBadge]')).toBeNull();
  });

  it('should show a loading skeleton while the first roster load is pending', async () => {
    await create({ members: [], loadingMembers: true });

    expect(sheet()?.querySelector('[data-testid="organization-team-members-roster"]')).toBeNull();
    expect(sheet()?.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should show the error state and retry from it once the roster load fails', async () => {
    await create({ members: [], membersError: 'Network down' });
    let retried = 0;
    fixture.componentInstance.retryLoad.subscribe(() => retried++);

    const errorState = sheet()?.querySelector('app-error-state');
    expect(errorState).not.toBeNull();
    expect(errorState?.textContent).toContain('Network down');

    const retry: HTMLButtonElement | null | undefined = sheet()?.querySelector(
      '[data-testid="organization-team-members-retry"]',
    );
    retry?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(retried).toBe(1);
  });

  it('should show the empty state once loaded with no members', async () => {
    await create({ members: [] });

    expect(sheet()?.querySelector('app-empty-state')).not.toBeNull();
  });

  it('should exclude the current roster member from the add-member candidates', async () => {
    await create({ orgMembers: [ORG_MEMBER, OTHER_ORG_MEMBER] });

    expect(fixture.componentInstance['candidates']()).toEqual([
      { memberId: 'member-2', label: 'Grace Hopper' },
    ]);
  });

  it('should emit memberRemoveRequested with the row’s member id', async () => {
    await create();
    let requested: string | undefined;
    fixture.componentInstance.memberRemoveRequested.subscribe((id) => (requested = id));

    const remove: HTMLButtonElement | null | undefined = sheet()?.querySelector(
      '[data-testid="organization-team-members-row-remove"]',
    );
    remove?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(requested).toBe('member-1');
  });

  it('should hide the row Remove action without canWrite', async () => {
    await create({ canWrite: false });

    expect(
      sheet()?.querySelector('[data-testid="organization-team-members-row-remove"]'),
    ).toBeNull();
  });

  it('should disable each row’s Remove action while a removal is in flight', async () => {
    await create({ isRemovingMember: true });

    const remove: HTMLButtonElement | null | undefined = sheet()?.querySelector(
      '[data-testid="organization-team-members-row-remove"]',
    );

    expect(remove?.disabled).toBe(true);
  });

  it('should hide the add-member form without canWrite', async () => {
    await create({ canWrite: false });

    expect(sheet()?.querySelector('app-organization-team-member-add-form')).toBeNull();
  });

  it('should forward memberAdded from the hosted add-member form', async () => {
    await create({ orgMembers: [ORG_MEMBER, OTHER_ORG_MEMBER] });
    let added: AddTeamMemberInput | undefined;
    fixture.componentInstance.memberAdded.subscribe((value) => (added = value));

    const form = fixture.debugElement.query(By.css('app-organization-team-member-add-form'));
    form.componentInstance.submitted.emit({ memberId: 'member-2' });

    expect(added).toEqual({ memberId: 'member-2' });
  });

  it('should forward isAddingMember and addMemberError to the hosted add-member form', async () => {
    await create({
      orgMembers: [ORG_MEMBER, OTHER_ORG_MEMBER],
      isAddingMember: true,
    });

    const form = fixture.debugElement.query(By.css('app-organization-team-member-add-form'));

    expect(form.componentInstance.pending()).toBe(true);
  });

  it('should relay a dismissal as visibleChange(false)', async () => {
    await create();
    let visibilities: boolean[] = [];
    fixture.componentInstance.visibleChange.subscribe((value) => visibilities.push(value));

    fixture.componentInstance['onStateChanged']('closed');

    expect(visibilities).toEqual([false]);
  });
});
