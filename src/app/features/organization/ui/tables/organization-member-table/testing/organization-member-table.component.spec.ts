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
  clearSelection(): void;
  memberName(member: OrganizationMemberOutput): string;
};

const member = (id: string, displayName: string): OrganizationMemberOutput =>
  ({
    id,
    userId: `u-${id}`,
    displayName,
    isActive: true,
    joinedAt: '2026-01-01',
    roleIds: [],
  }) as unknown as OrganizationMemberOutput;

describe('OrganizationMemberTable', () => {
  let fixture: ComponentFixture<OrganizationMemberTable>;
  let component: MemberTableTestApi;
  const alice = member('1', 'Alice');
  const bob = member('2', 'Bob');

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrganizationMemberTable] });
    fixture = TestBed.createComponent(OrganizationMemberTable);
    fixture.componentRef.setInput('members', [alice, bob]);
    fixture.componentRef.setInput('roles', [] as OrganizationRoleOutput[]);
    fixture.componentRef.setInput('canRemoveMember', true);
    fixture.detectChanges();
    component = fixture.componentInstance as unknown as MemberTableTestApi;
  });

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
    const nameless = member('3', '');
    expect(component.memberName(nameless)).toBe('u-3');
  });
});
