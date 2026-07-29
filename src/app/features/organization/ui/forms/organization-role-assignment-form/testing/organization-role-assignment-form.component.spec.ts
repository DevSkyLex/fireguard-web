import { TestBed } from '@angular/core/testing';
import type {
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import type { OrganizationRoleAssignmentValues } from '../models';
import { OrganizationRoleAssignmentForm } from '../organization-role-assignment-form.component';

type RoleAssignmentFormTestApi = OrganizationRoleAssignmentForm & {
  form: {
    controls: {
      memberId: { setValue(value: string): void; value: string; touched: boolean };
      roleId: { setValue(value: string): void; touched: boolean };
    };
    disabled: boolean;
  };
  memberOptions(): readonly { id: string; label: string }[];
  submit(): void;
};

const MEMBERS: readonly OrganizationMemberOutput[] = [
  {
    '@id': '/api/organizations/org-1/members/member-1',
    '@type': 'OrganizationMember',
    id: 'member-1',
    organizationId: 'org-1',
    userId: 'user-1',
    displayName: 'Alice Martin',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00.000Z',
    roleIds: [],
  },
  {
    '@id': '/api/organizations/org-1/members/member-2',
    '@type': 'OrganizationMember',
    id: 'member-2',
    organizationId: 'org-1',
    userId: 'user-2',
    firstName: 'Bob',
    lastName: 'Smith',
    isActive: true,
    joinedAt: '2026-01-01T00:00:00.000Z',
    roleIds: [],
  },
];

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

describe('OrganizationRoleAssignmentForm', () => {
  function createFixture(): {
    fixture: ReturnType<typeof TestBed.createComponent<OrganizationRoleAssignmentForm>>;
    component: RoleAssignmentFormTestApi;
  } {
    const fixture = TestBed.createComponent(OrganizationRoleAssignmentForm);
    fixture.componentRef.setInput('members', MEMBERS);
    fixture.componentRef.setInput('roles', ROLES);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance as unknown as RoleAssignmentFormTestApi,
    };
  }

  it('should create and render both selects', () => {
    const { fixture } = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#assign-member')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#assign-role')).toBeTruthy();
  });

  it('should render the resolved member labels and role names as select options', () => {
    const { component } = createFixture();
    expect(component.memberOptions()).toEqual([
      { id: 'member-1', label: 'Alice Martin' },
      { id: 'member-2', label: 'Bob Smith' },
    ]);
  });

  it('falls back to the user id when a member has no display name or full name', () => {
    const fixture = TestBed.createComponent(OrganizationRoleAssignmentForm);
    fixture.componentRef.setInput('members', [
      {
        '@id': '/api/organizations/org-1/members/member-3',
        '@type': 'OrganizationMember',
        id: 'member-3',
        organizationId: 'org-1',
        userId: 'user-3',
        isActive: true,
        joinedAt: '2026-01-01T00:00:00.000Z',
        roleIds: [],
      },
    ] satisfies readonly OrganizationMemberOutput[]);
    fixture.componentRef.setInput('roles', ROLES);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as RoleAssignmentFormTestApi;
    expect(component.memberOptions()).toEqual([{ id: 'member-3', label: 'user-3' }]);
  });

  it('emits the member and role when both are chosen', () => {
    const { fixture, component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.memberId.setValue('member-1');
    component.form.controls.roleId.setValue('role-1');
    component.submit();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith({
      memberId: 'member-1',
      roleId: 'role-1',
    } satisfies OrganizationRoleAssignmentValues);
  });

  it('does not emit when the member is missing', () => {
    const { component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.roleId.setValue('role-1');
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('does not emit when the role is missing', () => {
    const { component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    component.form.controls.memberId.setValue('member-1');
    component.submit();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('keeps the selection after submitting, so a rejection does not discard it', () => {
    const { component } = createFixture();
    component.form.controls.memberId.setValue('member-1');
    component.form.controls.roleId.setValue('role-1');
    component.submit();

    // The parent closes this surface once the server confirms; until then the
    // selection has to survive so a refused assignment can be corrected.
    expect(component.form.controls.memberId.value).toBe('member-1');
    expect(component.form.controls.roleId.value).toBe('role-1');
  });

  it('surfaces validation messages once the controls are touched', () => {
    const { fixture, component } = createFixture();
    (component.form.controls.memberId as unknown as { markAsTouched(): void }).markAsTouched();
    (component.form.controls.roleId as unknown as { markAsTouched(): void }).markAsTouched();
    fixture.detectChanges();

    expect(component.form.controls.memberId.touched).toBe(true);
    expect(component.form.controls.roleId.touched).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Select a member to assign the role to.');
    expect(fixture.nativeElement.textContent).toContain('Select a role.');
  });

  it('does not submit an empty form via the native submit event', () => {
    const { fixture, component } = createFixture();
    const emitSpy = vi.spyOn(component.submitted, 'emit');
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('disables the form and the submit button while loading', () => {
    const fixture = TestBed.createComponent(OrganizationRoleAssignmentForm);
    fixture.componentRef.setInput('members', MEMBERS);
    fixture.componentRef.setInput('roles', ROLES);
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as RoleAssignmentFormTestApi;
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
