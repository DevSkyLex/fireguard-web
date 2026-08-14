import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type {
  CreateOrganizationRoleInput,
  OrganizationPermissionOutput,
} from '@features/organization/models';
import { OrganizationRoleCreateForm } from '../organization-role-create-form.component';

/** Builds a permission fixture from just its dotted name. */
function permission(name: string): OrganizationPermissionOutput {
  return { id: name, name, description: null } as unknown as OrganizationPermissionOutput;
}

describe('OrganizationRoleCreateForm', () => {
  let fixture: ComponentFixture<OrganizationRoleCreateForm>;
  let submissions: CreateOrganizationRoleInput[];
  let cancellations: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const nameInput = (): HTMLInputElement =>
    root().querySelector('[data-testid="organization-role-create-name"]') as HTMLInputElement;
  const descriptionInput = (): HTMLTextAreaElement =>
    root().querySelector(
      '[data-testid="organization-role-create-description"]',
    ) as HTMLTextAreaElement;
  const form = (): HTMLFormElement => root().querySelector('form') as HTMLFormElement;
  const submitButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="organization-role-create-submit"]') as HTMLButtonElement;
  const cancelButton = (): HTMLButtonElement =>
    root().querySelector('[data-testid="organization-role-create-cancel"]') as HTMLButtonElement;
  const actionRow = (): HTMLElement =>
    root().querySelector('hlm-field[orientation="horizontal"]') as HTMLElement;

  const checkboxFor = (name: string): HTMLElement | null =>
    Array.from(root().querySelectorAll('[data-testid="organization-role-create-permission"]'))
      .find((el) => el.parentElement?.textContent?.includes(name))
      ?.querySelector('[role="checkbox"]') as HTMLElement | null;

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
  const check = async (name: string): Promise<void> => {
    checkboxFor(name)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    form().dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(OrganizationRoleCreateForm);
    await fixture.whenStable();

    submissions = [];
    cancellations = 0;
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.cancelled.subscribe(() => cancellations++);
  });

  it('should render the name and description fields alongside the permission checklist', async () => {
    fixture.componentRef.setInput('catalog', [permission('organization.inspection.read')]);
    await fixture.whenStable();

    expect(nameInput()).not.toBeNull();
    expect(descriptionInput()).not.toBeNull();
    expect(root().querySelector('fieldset')?.textContent).toContain('Permissions');
    expect(root().textContent).toContain('organization.inspection.read');
  });

  it('should show the permissions checklist error once submission touches it with none picked', async () => {
    await typeName('inspector');
    await submit();

    expect(submissions).toEqual([]);
    expect(
      root().querySelector('[data-testid="organization-role-create-permissions-error"]')
        ?.textContent,
    ).toContain('Select at least one permission.');
  });

  it('should emit the API-shaped payload with the checked permissions', async () => {
    fixture.componentRef.setInput('catalog', [
      permission('organization.inspection.read'),
      permission('organization.inspection.write'),
    ]);
    await fixture.whenStable();

    await typeName('inspector');
    await typeDescription('  Reads and writes inspections.  ');
    await check('organization.inspection.read');
    await submit();

    expect(submissions).toEqual([
      {
        name: 'inspector',
        description: 'Reads and writes inspections.',
        permissions: ['organization.inspection.read'],
      },
    ]);
  });

  it('should emit cancelled without submitting anything', async () => {
    cancelButton().dispatchEvent(new Event('click'));

    expect(cancellations).toBe(1);
    expect(submissions).toEqual([]);
  });

  it('should lock the submit control and swap its label while a request is in flight', async () => {
    fixture.componentRef.setInput('pending', true);
    await fixture.whenStable();

    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain('Creating…');
  });

  it('should surface the constraint violation the API reported on the name field', async () => {
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'name', message: 'This role name is already used.' }],
    });
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="organization-role-create-error"]')?.textContent,
    ).toContain('This role name is already used.');
  });

  it('should render nothing in the error block before a rejection', () => {
    expect(root().querySelector('[data-testid="organization-role-create-error"]')).toBeNull();
  });

  it('should list the cancel button before the submit button in the action row', () => {
    const buttons = Array.from(actionRow().querySelectorAll('button'));

    expect(buttons[0]).toBe(cancelButton());
    expect(buttons[1]).toBe(submitButton());
  });
});
