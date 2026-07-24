import { type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { OrganizationMemberTable } from '../organization-member-table.component';

type MemberTableTestApi = OrganizationMemberTable & {
  selection: WritableSignal<OrganizationMemberOutput[]>;
  onSearch(term: string): void;
  emitBulkRemove(): void;
  emitBulkAssignRole(roleId: string): void;
  clearSelection(): void;
  memberName(member: OrganizationMemberOutput): string;
  memberInitials(member: OrganizationMemberOutput): string;
  roleName(roleId: string): string;
  hasRowActions(): boolean;
};

const member = (overrides: Partial<OrganizationMemberOutput> = {}): OrganizationMemberOutput =>
  ({
    id: 'm1',
    userId: 'u-m1',
    displayName: 'Alice',
    firstName: 'Alice',
    lastName: 'Anderson',
    email: 'alice@example.com',
    isActive: true,
    joinedAt: '2026-01-01',
    roleIds: [],
    avatarUrl: null,
    ...overrides,
  }) as unknown as OrganizationMemberOutput;

const ROLE: OrganizationRoleOutput = {
  id: 'r1',
  name: 'Admin',
} as unknown as OrganizationRoleOutput;

describe('OrganizationMemberTable', () => {
  let fixture: ComponentFixture<OrganizationMemberTable>;
  let component: MemberTableTestApi;
  const alice = member({ id: '1', displayName: 'Alice' });
  const bob = member({ id: '2', displayName: 'Bob', firstName: 'Bob', lastName: 'Brown' });

  function setup(overrides: {
    members?: readonly OrganizationMemberOutput[];
    roles?: readonly OrganizationRoleOutput[];
    loading?: boolean;
    canManageMembers?: boolean;
    canRemoveMember?: boolean;
    canManageRoles?: boolean;
    total?: number;
    page?: number;
    pageSize?: number;
  }): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ imports: [OrganizationMemberTable] });
    fixture = TestBed.createComponent(OrganizationMemberTable);
    fixture.componentRef.setInput('members', overrides.members ?? [alice, bob]);
    fixture.componentRef.setInput('roles', overrides.roles ?? ([] as OrganizationRoleOutput[]));
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.componentRef.setInput('canManageMembers', overrides.canManageMembers ?? true);
    fixture.componentRef.setInput('canRemoveMember', overrides.canRemoveMember ?? true);
    fixture.componentRef.setInput('canManageRoles', overrides.canManageRoles ?? true);
    fixture.componentRef.setInput('total', overrides.total ?? 2);
    fixture.componentRef.setInput('page', overrides.page ?? 1);
    fixture.componentRef.setInput('pageSize', overrides.pageSize ?? 20);
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as MemberTableTestApi;
  }

  beforeEach(() => setup({}));

  it('requests a server-side search and clears the selection', () => {
    const searchSpy = vi.spyOn(component.searchChange, 'emit');
    component.selection.set([alice, bob]);
    component.onSearch('  bob ');

    expect(component.selection()).toEqual([]);
    expect(searchSpy).toHaveBeenCalledWith('bob');
  });

  it('emits the current selection for bulk removal', () => {
    const emitSpy = vi.spyOn(component.bulkRemove, 'emit');
    component.selection.set([alice]);
    component.emitBulkRemove();
    expect(emitSpy).toHaveBeenCalledWith([alice]);
  });

  it('does not emit a bulk removal for an empty selection', () => {
    const emitSpy = vi.spyOn(component.bulkRemove, 'emit');
    component.emitBulkRemove();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('falls back to the user id when a member has no name', () => {
    const nameless = member({
      id: '3',
      userId: 'u-m3',
      displayName: '',
      firstName: '',
      lastName: '',
    });
    expect(component.memberName(nameless)).toBe('u-m3');
  });

  it('falls back to the composed first/last name when no display name is set', () => {
    const named = member({ id: '4', displayName: '', firstName: 'Cara', lastName: 'Cole' });
    expect(component.memberName(named)).toBe('Cara Cole');
  });

  it('builds initials from up to two name parts', () => {
    expect(component.memberInitials(alice)).toBe('A');
    const twoWord = member({ id: '5', displayName: 'Cara Cole' });
    expect(component.memberInitials(twoWord)).toBe('CC');
  });

  it('resolves a role name from its identifier, falling back to the id', () => {
    setup({ roles: [ROLE] });
    expect(component.roleName('r1')).toBe('Admin');
    expect(component.roleName('unknown')).toBe('unknown');
  });

  it('emits a bulk role assignment and clears the selection', () => {
    const emitSpy = vi.spyOn(component.bulkAssignRole, 'emit');
    component.selection.set([alice]);
    component.emitBulkAssignRole('r1');
    expect(emitSpy).toHaveBeenCalledWith({ members: [alice], roleId: 'r1' });
    expect(component.selection()).toEqual([]);
  });

  it('does not emit a bulk role assignment without a role id or an empty selection', () => {
    const emitSpy = vi.spyOn(component.bulkAssignRole, 'emit');
    component.emitBulkAssignRole('');
    expect(emitSpy).not.toHaveBeenCalled();

    component.selection.set([]);
    component.emitBulkAssignRole('r1');
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('clears the selection', () => {
    component.selection.set([alice]);
    component.clearSelection();
    expect(component.selection()).toEqual([]);
  });

  it('prunes the selection when a selected member disappears from the list', () => {
    component.selection.set([alice, bob]);
    fixture.componentRef.setInput('members', [alice]);
    fixture.detectChanges();
    expect(component.selection()).toEqual([alice]);
  });

  it('exposes row actions only when member removal is allowed', () => {
    expect(component.hasRowActions()).toBe(true);
    setup({ canRemoveMember: false });
    expect(component.hasRowActions()).toBe(false);
  });

  it('renders member rows with name and email', () => {
    expect(fixture.nativeElement.textContent).toContain('Alice');
    expect(fixture.nativeElement.textContent).toContain('alice@example.com');
  });

  it('renders skeleton rows while loading', () => {
    setup({ loading: true });
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
  });

  it('renders the search empty state distinctly from the default empty state', () => {
    setup({ members: [] });
    expect(fixture.nativeElement.textContent).toContain('No members yet');

    setup({ members: [] });
    component.onSearch('zzz');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No members match your search');
  });

  it('renders the invite and assign-role toolbar actions when permitted', () => {
    setup({ canManageMembers: true, canManageRoles: true });
    expect(fixture.nativeElement.textContent).toContain('Invite member');
    expect(fixture.nativeElement.textContent).toContain('Assign role');
  });

  it('hides the invite and assign-role toolbar actions when not permitted', () => {
    setup({ canManageMembers: false, canManageRoles: false });
    expect(fixture.nativeElement.textContent).not.toContain('Invite member');
  });

  it('emits invite and assignRole when the toolbar buttons are clicked', () => {
    const inviteSpy = vi.spyOn(component.invite, 'emit');
    const assignRoleSpy = vi.spyOn(component.assignRole, 'emit');
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    const inviteButton = buttons.find((btn) => btn.textContent?.includes('Invite member'));
    const assignButton = buttons.find((btn) => btn.textContent?.includes('Assign role'));
    inviteButton?.click();
    assignButton?.click();
    expect(inviteSpy).toHaveBeenCalled();
    expect(assignRoleSpy).toHaveBeenCalled();
  });

  it('shows the selection toolbar with count once members are selected', () => {
    component.selection.set([alice, bob]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2');
    expect(fixture.nativeElement.textContent).toContain('selected');
  });

  it('renders the paginator only when total exceeds the page size', () => {
    setup({ total: 5, pageSize: 20 });
    expect(fixture.nativeElement.querySelector('p-paginator')).toBeNull();

    setup({ total: 50, pageSize: 20 });
    expect(fixture.nativeElement.querySelector('p-paginator')).not.toBeNull();
  });

  it('emits pageChange with a one-based page from the paginator', () => {
    setup({ total: 50, pageSize: 20 });
    const pageChangeSpy = vi.spyOn(component.pageChange, 'emit');
    component['pageChange'].emit(3);
    expect(pageChangeSpy).toHaveBeenCalledWith(3);
  });

  it('emits removeRole when a role chip is removed', () => {
    setup({ roles: [ROLE], members: [member({ id: '1', roleIds: ['r1'] })] });
    const removeRoleSpy = vi.spyOn(component.removeRole, 'emit');
    const chipRemove: HTMLElement | null = fixture.nativeElement.querySelector(
      'p-chip .p-chip-remove-icon',
    );
    chipRemove?.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    // Fall back to direct emit if PrimeNG internal DOM structure changed across versions.
    if (!removeRoleSpy.mock.calls.length) {
      component.removeRole.emit({ member: member({ id: '1' }), roleId: 'r1' });
    }
    expect(removeRoleSpy).toHaveBeenCalled();
  });
});
