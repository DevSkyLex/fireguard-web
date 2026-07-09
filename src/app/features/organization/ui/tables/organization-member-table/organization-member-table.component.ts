import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MenuItem, PrimeIcons } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { Menu, MenuModule } from 'primeng/menu';
import { PaginatorModule } from 'primeng/paginator';
import { SelectModule } from 'primeng/select';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { resolveInvitationTag } from '@features/organization/models';
import type {
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { EmptyState, Tag, type TagDescriptor } from '@shared/components';
import type { OrganizationMemberBulkRoleAssignment, OrganizationMemberRoleRemoval } from './models';

/**
 * Table presenting organization members and member management actions, styled
 * to match the application's standard entity tables.
 */
@Component({
  selector: 'app-organization-member-table',
  imports: [
    AvatarModule,
    ButtonModule,
    CardModule,
    ChipModule,
    DatePipe,
    EmptyState,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MenuModule,
    PaginatorModule,
    SelectModule,
    SkeletonModule,
    TableModule,
    Tag,
  ],
  templateUrl: './organization-member-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationMemberTable {
  /** Organization members to display. */
  public readonly members: InputSignal<readonly OrganizationMemberOutput[]> = input.required();

  /** Organization roles used to resolve role names. */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();

  /** Whether members are loading. */
  public readonly loading: InputSignal<boolean> = input(false);

  /** Whether the active member can invite and add members. */
  public readonly canManageMembers: InputSignal<boolean> = input(false);

  /** Whether the active member can remove members. */
  public readonly canRemoveMember: InputSignal<boolean> = input(false);

  /** Whether the active member can manage role assignments. */
  public readonly canManageRoles: InputSignal<boolean> = input(false);

  /** Total members matching the current server-side query (for pagination). */
  public readonly total: InputSignal<number> = input(0);

  /** One-based current page. */
  public readonly page: InputSignal<number> = input(1);

  /** Server-side page size. */
  public readonly pageSize: InputSignal<number> = input(20);

  /** Requests sending an invitation. */
  public readonly invite: OutputEmitterRef<void> = output();

  /** Requests assigning a role to a member. */
  public readonly assignRole: OutputEmitterRef<void> = output();

  /** Emits a member selected for removal. */
  public readonly remove: OutputEmitterRef<OrganizationMemberOutput> = output();

  /** Emits the set of members selected for bulk removal. */
  public readonly bulkRemove: OutputEmitterRef<readonly OrganizationMemberOutput[]> = output();

  /** Emits a bulk role assignment for the current selection. */
  public readonly bulkAssignRole: OutputEmitterRef<OrganizationMemberBulkRoleAssignment> = output();

  /** Emits an assigned role selected for removal. */
  public readonly removeRole: OutputEmitterRef<OrganizationMemberRoleRemoval> = output();

  /** Emits the requested one-based page. */
  public readonly pageChange: OutputEmitterRef<number> = output();

  /** Emits the requested server-side search term. */
  public readonly searchChange: OutputEmitterRef<string> = output();

  /** Shared popup menu used by member rows for contextual actions. */
  private readonly rowMenu: Signal<Menu> = viewChild.required<Menu>('rowMenu');

  /** Member currently targeted by the row menu. */
  private readonly selectedMember: WritableSignal<OrganizationMemberOutput | null> = signal(null);

  /** Members currently checked for a bulk action. */
  protected readonly selection: WritableSignal<OrganizationMemberOutput[]> = signal([]);

  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems: undefined[] = Array(6);

  /** Number of members currently checked. */
  protected readonly selectedCount: Signal<number> = computed(() => this.selection().length);

  /** Contextual row actions for the selected member. */
  protected readonly rowMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const member = this.selectedMember();
    if (!member || !this.canRemoveMember()) return [];
    return [
      {
        label: $localize`:@@org.members.remove:Remove`,
        icon: PrimeIcons.TRASH,
        styleClass: 'text-red-500',
        command: (): void => this.remove.emit(member),
      },
    ];
  });

  /** Prunes the selection to members still present after a list change. */
  public constructor() {
    effect(() => {
      const presentIds = new Set(this.members().map((member) => member.id));
      const current = this.selection();
      const pruned = current.filter((member) => presentIds.has(member.id));
      if (pruned.length !== current.length) this.selection.set(pruned);
    });
  }

  /** Resolves a role display name from its identifier. */
  protected roleName(roleId: string): string {
    return this.roles().find((role) => role.id === roleId)?.name ?? roleId;
  }

  /** Resolves the best available display name for a member. */
  protected memberName(member: OrganizationMemberOutput): string {
    const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ').trim();
    return member.displayName?.trim() || fullName || member.userId;
  }

  /** Builds avatar initials from a member's resolved display name. */
  protected memberInitials(member: OrganizationMemberOutput): string {
    const parts = this.memberName(member).split(/\s+/).filter(Boolean);
    const initials = parts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('');
    return initials.toUpperCase() || '?';
  }

  /** Resolves the status badge descriptor for a member. */
  protected memberStatusDescriptor(member: OrganizationMemberOutput): TagDescriptor {
    return resolveInvitationTag('memberStatus', member.isActive ? 'active' : 'inactive');
  }

  /** Whether the row menu exposes any action for the current permissions. */
  protected hasRowActions(): boolean {
    return this.canRemoveMember();
  }

  /** Emits the current selection for bulk removal. */
  protected emitBulkRemove(): void {
    if (this.selection().length > 0) this.bulkRemove.emit([...this.selection()]);
  }

  /** Emits a bulk role assignment for the current selection. */
  protected emitBulkAssignRole(roleId: string): void {
    if (roleId && this.selection().length > 0) {
      this.bulkAssignRole.emit({ members: [...this.selection()], roleId });
      this.selection.set([]);
    }
  }

  /** Clears the current bulk selection. */
  protected clearSelection(): void {
    this.selection.set([]);
  }

  /**
   * Requests a server-side search, clearing any selection so a bulk action can
   * never act on members outside the new result set.
   */
  protected onSearch(term: string): void {
    this.selection.set([]);
    this.searchChange.emit(term.trim());
  }

  /** Stores the targeted member and toggles the shared row menu. */
  protected onRowMenuToggle(event: MouseEvent, member: OrganizationMemberOutput): void {
    this.selectedMember.set(member);
    this.rowMenu().toggle(event);
  }
}
