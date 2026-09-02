import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { CreateOrganizationRoleInput } from '@features/organization/models';
import { OrganizationRoleCreateSheet } from '../organization-role-create-sheet.component';

const dialog = (): HTMLElement | null =>
  document.querySelector('[data-testid="organization-role-create-sheet"]');
const nameInput = (): HTMLInputElement | null =>
  dialog()?.querySelector('[data-testid="organization-role-create-name"]') ?? null;

describe('OrganizationRoleCreateSheet', () => {
  let fixture: ComponentFixture<OrganizationRoleCreateSheet>;
  let submissions: CreateOrganizationRoleInput[];
  let visibilities: boolean[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    fixture = TestBed.createComponent(OrganizationRoleCreateSheet);

    submissions = [];
    visibilities = [];
    fixture.componentInstance.submitted.subscribe((value) => submissions.push(value));
    fixture.componentInstance.visibleChange.subscribe((value) => visibilities.push(value));
  });

  it('should render nothing while closed', async () => {
    await fixture.whenStable();

    expect(dialog()).toBeNull();
  });

  it('should render its content once visible', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(dialog()).not.toBeNull();
  });

  it('should forward the hosted form’s submitted payload untouched', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    const payload: CreateOrganizationRoleInput = {
      name: 'inspector',
      description: undefined,
      permissions: ['organization.inspection.read'],
    };
    fixture.componentInstance.submitted.emit(payload);

    expect(submissions).toEqual([payload]);
  });

  it('should relay a dismissal — escape or the backdrop — as visibleChange(false) while clean', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    fixture.componentInstance['onStateChanged']('closed');

    expect(visibilities).toEqual([false]);
  });

  it('should ignore the echo of a state the page already applied', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    fixture.componentInstance['onStateChanged']('open');

    expect(visibilities).toEqual([]);
  });

  it('should close right away on cancel while nothing was typed', () => {
    fixture.componentInstance['requestClose']();

    expect(visibilities).toEqual([false]);
  });

  it('should ask before discarding a dirty draft, and close only once confirmed', () => {
    fixture.componentInstance['dirty'].set(true);

    fixture.componentInstance['requestClose']();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');
    expect(visibilities).toEqual([]);

    fixture.componentInstance['onUnsavedChangesDismissed']();
    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('closed');
    expect(visibilities).toEqual([]);

    fixture.componentInstance['requestClose']();
    fixture.componentInstance['onUnsavedChangesConfirmed']();
    expect(visibilities).toEqual([false]);
  });

  it('should treat an Escape on a dirty draft as a close request, not a close', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    fixture.componentInstance['dirty'].set(true);

    fixture.componentInstance['onStateChanged']('closed');

    expect(fixture.componentInstance['unsavedChangesDialogState']()).toBe('open');
    expect(visibilities).toEqual([]);
  });

  it('should forget the dirty flag once the panel closes', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();
    fixture.componentInstance['dirty'].set(true);

    fixture.componentRef.setInput('visible', false);
    await fixture.whenStable();

    expect(fixture.componentInstance['dirty']()).toBe(false);
  });

  it('should forward pending and serverError to the hosted form', async () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('pending', true);
    fixture.componentRef.setInput('serverError', {
      status: 422,
      violations: [{ propertyPath: 'name', message: 'This role name is already used.' }],
    });
    await fixture.whenStable();

    const submit: HTMLButtonElement | null | undefined = dialog()?.querySelector(
      '[data-testid="organization-role-create-submit"]',
    );

    expect(dialog()?.textContent).toContain('This role name is already used.');
    expect(submit?.disabled).toBe(true);
  });

  it('should render the name field from the hosted form', async () => {
    fixture.componentRef.setInput('visible', true);
    await fixture.whenStable();

    expect(nameInput()).not.toBeNull();
  });
});
