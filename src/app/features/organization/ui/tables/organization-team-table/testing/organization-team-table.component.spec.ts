import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TeamOutput } from '@features/organization/models';
import { OrganizationTeamTable } from '../organization-team-table.component';

const TEAM: TeamOutput = {
  '@id': '/api/organizations/org-1/teams/team-1',
  '@type': 'Team',
  id: 'team-1',
  organizationId: 'org-1',
  name: 'Response team',
  description: 'On-call responders.',
  memberCount: 3,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('OrganizationTeamTable', () => {
  let fixture: ComponentFixture<OrganizationTeamTable>;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] =>
    Array.from(root().querySelectorAll('[data-testid="organization-team-table-row"]'));

  async function create(
    inputs: Partial<{
      items: readonly TeamOutput[];
      loading: boolean;
      canEdit: boolean;
      canDelete: boolean;
    }> = {},
  ): Promise<void> {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationTeamTable);
    fixture.componentRef.setInput('items', inputs.items ?? [TEAM]);
    fixture.componentRef.setInput('loading', inputs.loading ?? false);
    fixture.componentRef.setInput('canEdit', inputs.canEdit ?? false);
    fixture.componentRef.setInput('canDelete', inputs.canDelete ?? false);
    await fixture.whenStable();
  }

  /** Opens the row's `…` menu and returns its overlay content, rendered outside `fixture.nativeElement`. */
  async function openRowMenu(): Promise<HTMLElement> {
    root()
      .querySelector('[data-testid="organization-team-table-row-menu"]')
      ?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    return document.body;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should render the team name, description and member count', async () => {
    await create();

    expect(root().textContent).toContain('Response team');
    expect(root().textContent).toContain('On-call responders.');
    expect(root().textContent).toContain('3 members');
  });

  it('should pluralize a single member', async () => {
    await create({ items: [{ ...TEAM, memberCount: 1 }] });

    expect(root().textContent).toContain('1 member');
    expect(root().textContent).not.toContain('1 members');
  });

  it('should render skeleton placeholder rows while loading with nothing yet loaded', async () => {
    await create({ items: [], loading: true });

    expect(rows().length).toBe(0);
    expect(root().querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should render existing rows even while a background load is in flight', async () => {
    await create({ items: [TEAM], loading: true });

    // The shared surface's loading contract is "first load only": a later page
    // fetch leaves the rows already on screen alone.
    expect(rows().length).toBe(1);
    expect(root().querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('should render the same team a second time as a card, under the row testid plus -card', async () => {
    await create({ items: [TEAM, { ...TEAM, id: 'team-2' }] });

    // Both layouts stay mounted — a container query, not an `@if`, picks the
    // visible one — so a card is a second render of the same row.
    expect(root().querySelectorAll('[data-testid="organization-team-table-row-card"]').length).toBe(
      2,
    );
    expect(rows().length).toBe(2);
  });

  it('should render the empty-results row once loaded with no teams', async () => {
    await create({ items: [] });

    expect(root().textContent).toContain('No results.');
  });

  it('should emit editRequested from the row menu', async () => {
    await create({ canEdit: true });
    let requested: TeamOutput | undefined;
    fixture.componentInstance.editRequested.subscribe((team) => (requested = team));

    const menu = await openRowMenu();
    (
      menu.querySelector('[data-testid="organization-team-table-row-edit"]') as HTMLButtonElement
    ).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(requested).toBe(TEAM);
  });

  it('should emit membersRequested from the row menu', async () => {
    await create();
    let requested: TeamOutput | undefined;
    fixture.componentInstance.membersRequested.subscribe((team) => (requested = team));

    const menu = await openRowMenu();
    (
      menu.querySelector('[data-testid="organization-team-table-row-members"]') as HTMLButtonElement
    ).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(requested).toBe(TEAM);
  });

  it('should emit deleteRequested from the row menu', async () => {
    await create({ canDelete: true });
    let requested: TeamOutput | undefined;
    fixture.componentInstance.deleteRequested.subscribe((team) => (requested = team));

    const menu = await openRowMenu();
    (
      menu.querySelector('[data-testid="organization-team-table-row-delete"]') as HTMLButtonElement
    ).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(requested).toBe(TEAM);
  });

  it('should hide the Edit menu entry without canEdit', async () => {
    await create({ canEdit: false });

    const menu = await openRowMenu();

    expect(menu.querySelector('[data-testid="organization-team-table-row-edit"]')).toBeNull();
  });

  it('should hide the Delete menu entry without canDelete', async () => {
    await create({ canDelete: false });

    const menu = await openRowMenu();

    expect(menu.querySelector('[data-testid="organization-team-table-row-delete"]')).toBeNull();
  });

  it('should always offer the Members action regardless of write permissions', async () => {
    await create({ canEdit: false, canDelete: false });

    const menu = await openRowMenu();

    expect(
      menu.querySelector('[data-testid="organization-team-table-row-members"]'),
    ).not.toBeNull();
  });

  it('should render a placeholder dash for a team with no description', async () => {
    await create({ items: [{ ...TEAM, description: '' }] });

    expect(rows()[0].querySelectorAll('td')[1]?.textContent?.trim()).toBe('—');
  });
});
