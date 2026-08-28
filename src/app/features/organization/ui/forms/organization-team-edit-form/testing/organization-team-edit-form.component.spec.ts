import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { TeamOutput, UpdateTeamInput } from '@features/organization/models';
import { OrganizationTeamEditForm } from '../organization-team-edit-form.component';

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

describe('OrganizationTeamEditForm', () => {
  let fixture: ComponentFixture<OrganizationTeamEditForm>;
  let submissions: UpdateTeamInput[];
  let cancellations: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const nameInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="organization-team-edit-name"]') as HTMLInputElement;
  const descriptionInput = (): HTMLTextAreaElement =>
    root().querySelector(
      '[data-testid="organization-team-edit-description"]',
    ) as HTMLTextAreaElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="organization-team-edit-submit"]') as HTMLButtonElement;
  const cancelButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="organization-team-edit-cancel"]') as HTMLButtonElement;

  const typeName = async (value: string): Promise<void> => {
    nameInput().value = value;
    nameInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const typeDescription = async (value: string): Promise<void> => {
    descriptionInput().value = value;
    descriptionInput().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationTeamEditForm);
    fixture.componentRef.setInput('team', TEAM);
    await fixture.whenStable();

    submissions = [];
    cancellations = 0;
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancellations++);
  });

  it('should prefill the name and description from the given team', () => {
    expect(nameInput().value).toBe('Response team');
    expect(descriptionInput().value).toBe('On-call responders.');
  });

  it('should re-seed the draft whenever a different team is bound', async () => {
    fixture.componentRef.setInput('team', {
      ...TEAM,
      id: 'team-2',
      name: 'Compliance team',
      description: '',
    });
    await fixture.whenStable();

    expect(nameInput().value).toBe('Compliance team');
    expect(descriptionInput().value).toBe('');
  });

  it('should refuse to submit a blank name and show the required error', async () => {
    await typeName('');
    await submit();

    expect(submissions).toEqual([]);
    expect(root().textContent).toContain('Team name is required.');
  });

  it('should emit the trimmed name and description', async () => {
    await typeName('  Renamed team  ');
    await typeDescription('  Updated description.  ');
    await submit();

    expect(submissions).toEqual([{ name: 'Renamed team', description: 'Updated description.' }]);
  });

  it('should emit a null description when cleared, not undefined', async () => {
    await typeDescription('   ');
    await submit();

    expect(submissions).toEqual([{ name: 'Response team', description: null }]);
  });

  it('should emit cancelled without submitting anything', () => {
    cancelButton().dispatchEvent(new Event('click'));

    expect(cancellations).toBe(1);
    expect(submissions).toEqual([]);
  });

  it('should lock the controls and swap the submit label while pending', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Saving…');
  });

  it('should surface the constraint violation the API reported on the name field', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'name', message: 'This team name is already used.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-team-edit-error"]')?.textContent,
    ).toContain('This team name is already used.');
  });

  it('should render a blank shell when no team is bound', async () => {
    fixture.componentRef.setInput('team', null);
    await fixture.whenStable();

    expect(nameInput().value).toBe('');
    expect(descriptionInput().value).toBe('');
  });
});
