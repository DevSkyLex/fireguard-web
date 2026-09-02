import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateTeamInput } from '@features/organization/models';
import { OrganizationTeamCreateForm } from '../organization-team-create-form.component';

describe('OrganizationTeamCreateForm', () => {
  let fixture: ComponentFixture<OrganizationTeamCreateForm>;
  let submissions: CreateTeamInput[];
  let cancellations: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const nameInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="organization-team-create-name"]') as HTMLInputElement;
  const descriptionInput = (): HTMLTextAreaElement =>
    root().querySelector(
      '[data-testid="organization-team-create-description"]',
    ) as HTMLTextAreaElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="organization-team-create-submit"]') as HTMLButtonElement;
  const cancelButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="organization-team-create-cancel"]') as HTMLButtonElement;

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
    fixture = TestBed.createComponent(OrganizationTeamCreateForm);
    await fixture.whenStable();

    submissions = [];
    cancellations = 0;
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancellations++);
  });

  it('should render the name and description fields', () => {
    expect(nameInput()).not.toBeNull();
    expect(descriptionInput()).not.toBeNull();
  });

  it('should refuse to submit a blank name and show the required error', async () => {
    await submit();

    expect(submissions).toEqual([]);
    expect(root().querySelector('[data-testid="organization-team-create-name"]')).not.toBeNull();
    expect(root().textContent).toContain('Team name is required.');
  });

  it('should emit the trimmed name with the description omitted when left blank', async () => {
    await typeName('  Response team  ');
    await submit();

    expect(submissions).toEqual([{ name: 'Response team', description: undefined }]);
  });

  it('should emit the trimmed description alongside the name', async () => {
    await typeName('Response team');
    await typeDescription('  On-call responders.  ');
    await submit();

    expect(submissions).toEqual([{ name: 'Response team', description: 'On-call responders.' }]);
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
    expect(submitButton().textContent).toContain('Creating…');
  });

  it('should render nothing in the error block before a rejection', () => {
    expect(root().querySelector('[data-testid="organization-team-create-error"]')).toBeNull();
  });

  it('should surface the constraint violation the API reported on the name field', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'name', message: 'This team name is already used.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-team-create-error"]')?.textContent,
    ).toContain('This team name is already used.');
  });

  it('should fall back to a generic failure message when the server error carries no detail', async () => {
    fixture.componentRef.setInput('serverError', {});
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-team-create-error"]')?.textContent,
    ).toContain('The team could not be created.');
  });

  it('should report dirtiness through dirtyChanged after a value change, and clear it once reset', async () => {
    const dirtyChanges: boolean[] = [];
    fixture.componentInstance.dirtyChanged.subscribe((dirty: boolean): void => {
      dirtyChanges.push(dirty);
    });
    await fixture.whenStable();

    await typeName('Response team');

    expect(dirtyChanges.at(-1)).toBe(true);

    fixture.componentInstance['createForm']().reset();
    await fixture.whenStable();

    expect(dirtyChanges.at(-1)).toBe(false);
  });
});
