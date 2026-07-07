import { TestBed } from '@angular/core/testing';
import { OrganizationRoleAssignmentForm } from '../organization-role-assignment-form.component';

type RoleAssignmentFormTestApi = OrganizationRoleAssignmentForm & {
  form: {
    controls: {
      memberId: { setValue(value: string): void; value: string };
      roleId: { setValue(value: string): void };
    };
  };
  submit(): void;
};

describe('OrganizationRoleAssignmentForm', () => {
  let component: RoleAssignmentFormTestApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(
      () => new OrganizationRoleAssignmentForm() as unknown as RoleAssignmentFormTestApi,
    );
  });

  it('emits the member and role when both are chosen', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.memberId.setValue('member-1');
    component.form.controls.roleId.setValue('role-1');
    component.submit();

    expect(emitSpy).toHaveBeenCalledWith({ memberId: 'member-1', roleId: 'role-1' });
  });

  it('does not emit when the member is missing', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.roleId.setValue('role-1');
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('does not emit when the role is missing', () => {
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.memberId.setValue('member-1');
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('resets after a successful submit', () => {
    component.form.controls.memberId.setValue('member-1');
    component.form.controls.roleId.setValue('role-1');
    component.submit();

    expect(component.form.controls.memberId.value).toBe('');
  });
});
