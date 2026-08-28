import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TeamOutput, UpdateTeamInput } from '@features/organization/models';
import { OrganizationTeamEditDialog } from '../organization-team-edit-dialog.component';

const TEAM: TeamOutput = {
  '@id': '/api/organizations/org-1/teams/team-1',
  '@type': 'Team',
  id: 'team-1',
  organizationId: 'org-1',
  name: 'Response team',
  description: 'On-call responders.',
  memberCount: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-team-edit-dialog"]');

describe('OrganizationTeamEditDialog', () => {
  let fixture: ComponentFixture<OrganizationTeamEditDialog>;
  let submissions: UpdateTeamInput[];
  let visibilities: boolean[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationTeamEditDialog);

    submissions = [];
    visibilities = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.visibleChange.subscribe((value) => visibilities.push(value));
  });

  it('should render nothing while closed', async () => {
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should render its content once visible, prefilled from the given team', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('team', TEAM);
    await fixture.whenStable();

    const name: HTMLInputElement | null | undefined = dialog()?.querySelector(
      '[data-testid="organization-team-edit-name"]',
    );

    expect(dialog()).not.toBeNull();
    expect(name?.value).toBe('Response team');
  });

  it('should forward the hosted form’s submitted payload untouched', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('team', TEAM);
    await fixture.whenStable();

    dialog()?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(submissions).toEqual([{ name: 'Response team', description: 'On-call responders.' }]);
  });

  it('should relay the hosted form’s cancel as visibleChange(false)', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('team', TEAM);
    await fixture.whenStable();

    const cancel: HTMLButtonElement | null | undefined = dialog()?.querySelector(
      '[data-testid="organization-team-edit-cancel"]',
    );
    cancel?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(visibilities).toEqual([false]);
  });

  it('should relay a dismissal as visibleChange(false)', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('team', TEAM);
    await fixture.whenStable();

    fixture.componentInstance['onStateChanged']('closed');

    expect(visibilities).toEqual([false]);
  });

  it('should forward pending and serverError to the hosted form', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('team', TEAM);
    fixture.componentRef.setInput('pending', true);
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'name', message: 'This team name is already used.' }],
    });
    await fixture.whenStable();

    const submit: HTMLButtonElement | null | undefined = dialog()?.querySelector(
      '[data-testid="organization-team-edit-submit"]',
    );

    expect(dialog()?.textContent).toContain('This team name is already used.');
    expect(submit?.disabled).toBe(true);
  });
});
