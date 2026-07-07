import { TestBed } from '@angular/core/testing';
import { OrganizationInvitationForm } from '../organization-invitation-form.component';

type InvitationFormTestApi = OrganizationInvitationForm & {
  form: {
    controls: {
      email: { setValue(value: string): void; value: string };
      roleId: { setValue(value: string): void };
    };
  };
  submit(): void;
};

describe('OrganizationInvitationForm', () => {
  let component: InvitationFormTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(
      () => new OrganizationInvitationForm() as unknown as InvitationFormTestApi,
    );
  });

  it('emits the email with the chosen role', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.email.setValue('member@example.com');
    component.form.controls.roleId.setValue('role-1');
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith({ email: 'member@example.com', roleIds: ['role-1'] });
  });

  it('emits an empty role list when no role is chosen', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.email.setValue('member@example.com');
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith({ email: 'member@example.com', roleIds: [] });
  });

  it('does not emit when the email is invalid', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.email.setValue('not-an-email');
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('resets the email after a successful submit', () => {
    component.form.controls.email.setValue('member@example.com');
    component.submit();

    expect(component.form.controls.email.value).toBe('');
  });
});
