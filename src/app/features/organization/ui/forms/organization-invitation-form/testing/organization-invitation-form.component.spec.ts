import { TestBed } from '@angular/core/testing';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { OrganizationInvitationForm } from '../organization-invitation-form.component';

type InvitationFormTestApi = OrganizationInvitationForm & {
  form: {
    controls: {
      email: { setValue(value: string): void; value: string; touched: boolean };
      roleId: { setValue(value: string): void };
    };
    disabled: boolean;
  };
  submit(): void;
};

const ROLES: readonly OrganizationRoleOutput[] = [
  {
    '@id': '/api/organizations/org-1/roles/role-1',
    '@type': 'OrganizationRole',
    id: 'role-1',
    organizationId: 'org-1',
    name: 'Manager',
    description: null,
    isSystem: false,
    permissions: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('OrganizationInvitationForm', () => {
  function createFixture(): {
    fixture: ReturnType<typeof TestBed.createComponent<OrganizationInvitationForm>>;
    component: InvitationFormTestApi;
  } {
    const fixture = TestBed.createComponent(OrganizationInvitationForm);
    fixture.componentRef.setInput('roles', ROLES);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as unknown as InvitationFormTestApi };
  }

  it('should create and render the email input and the role select', () => {
    const { fixture } = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#invite-email')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#invite-role')).toBeTruthy();
  });

  it('should render the invitation help text by default', () => {
    const { fixture } = createFixture();
    expect(fixture.nativeElement.textContent).toContain("We'll email them a secure link to join.");
  });

  it('emits the email with the chosen role', () => {
    const { component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.email.setValue('member@example.com');
    component.form.controls.roleId.setValue('role-1');
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith({ email: 'member@example.com', roleIds: ['role-1'] });
  });

  it('emits an empty role list when no role is chosen', () => {
    const { component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.email.setValue('member@example.com');
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith({ email: 'member@example.com', roleIds: [] });
  });

  it('does not emit when the email is invalid', () => {
    const { component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.email.setValue('not-an-email');
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('resets the email after a successful submit', () => {
    const { component } = createFixture();
    component.form.controls.email.setValue('member@example.com');
    component.submit();

    expect(component.form.controls.email.value).toBe('');
  });

  it('surfaces a validation message once the email is touched and empty', () => {
    const { fixture, component } = createFixture();
    (component.form.controls.email as unknown as { markAsTouched(): void }).markAsTouched();
    fixture.detectChanges();

    expect(component.form.controls.email.touched).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
    expect(fixture.nativeElement.textContent).not.toContain(
      "We'll email them a secure link to join.",
    );
  });

  it('surfaces a validation message for a malformed, touched email', () => {
    const { fixture, component } = createFixture();
    component.form.controls.email.setValue('not-an-email');
    (component.form.controls.email as unknown as { markAsTouched(): void }).markAsTouched();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Enter a valid email address.');
  });

  it('does not submit an invalid form via the native submit event', () => {
    const { fixture, component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('disables the form and the submit button while loading', () => {
    const fixture = TestBed.createComponent(OrganizationInvitationForm);
    fixture.componentRef.setInput('roles', ROLES);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as InvitationFormTestApi;
    expect(component.form.disabled).toBe(true);

    const submitButton = fixture.nativeElement.querySelector(
      'p-button[type="submit"] button',
    ) as HTMLButtonElement | null;
    expect(submitButton?.disabled).toBe(true);
  });

  it('emits cancelled when the cancel button is clicked', () => {
    const { fixture, component } = createFixture();
    const emitSpy = vi.spyOn(component.cancelled, 'emit');

    const cancelButton = fixture.nativeElement.querySelector(
      'p-button[type="button"] button',
    ) as HTMLButtonElement;
    cancelButton.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalled();
  });
});
