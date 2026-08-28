import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TeamOutput } from '@features/organization/models';
import { OrganizationTeamDeleteDialog } from '../organization-team-delete-dialog.component';

const TEAM: TeamOutput = {
  '@id': '/api/organizations/org-1/teams/team-1',
  '@type': 'Team',
  id: 'team-1',
  organizationId: 'org-1',
  name: 'Response team',
  description: '',
  memberCount: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-team-delete-dialog"]');
const confirmButton = (): HTMLButtonElement | null =>
  dialog()?.querySelector('[data-testid="organization-team-delete-confirm"]') ?? null;

describe('OrganizationTeamDeleteDialog', () => {
  let fixture: ComponentFixture<OrganizationTeamDeleteDialog>;
  let emitted: number;
  let visibilities: boolean[];

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationTeamDeleteDialog);
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('team', TEAM);
    await fixture.whenStable();

    emitted = 0;
    visibilities = [];
    fixture.componentInstance.confirmed.subscribe(() => emitted++);
    fixture.componentInstance.visibleChange.subscribe((value) => visibilities.push(value));
  });

  it('should render nothing while closed', async () => {
    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should always render the referential warning', () => {
    expect(
      dialog()?.querySelector('[data-testid="organization-team-delete-warning"]')?.textContent,
    ).toContain('Channels bound to this team keep referencing it.');
  });

  it('should name the team in the description', () => {
    expect(dialog()?.textContent).toContain('Response team');
  });

  it('should emit confirmed on the confirm action', () => {
    confirmButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(emitted).toBe(1);
  });

  it('should refuse to confirm while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(confirmButton()?.disabled).toBe(true);

    fixture.componentInstance['confirm']();

    expect(emitted).toBe(0);
  });

  it('should show the deleting label while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(confirmButton()?.textContent).toContain('Deleting…');
  });

  it('should render nothing in the error block before a rejection', () => {
    expect(dialog()?.querySelector('[data-testid="organization-team-delete-error"]')).toBeNull();
  });

  it('should surface the store’s delete failure message', async () => {
    fixture.componentRef.setInput('error', 'Team could not be deleted.');
    await fixture.whenStable();

    expect(
      dialog()?.querySelector('[data-testid="organization-team-delete-error"]')?.textContent,
    ).toContain('Team could not be deleted.');
  });

  it('should report a dismissal as visibleChange(false)', () => {
    fixture.componentInstance['onStateChanged']('closed');

    expect(visibilities).toEqual([false]);
  });

  it('should ignore the echo of a state the page already applied', () => {
    fixture.componentInstance['onStateChanged']('open');

    expect(visibilities).toEqual([]);
  });
});
