import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import type { TabListPassThrough, TabPanelsPassThrough, TabsPassThrough } from 'primeng/types/tabs';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  AddOrganizationMemberInput,
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationTeamStore } from '@features/organization/state';
import {
  OrganizationInvitationForm,
  OrganizationMemberForm,
  OrganizationRoleAssignmentForm,
  OrganizationRoleForm,
  type OrganizationRoleAssignmentValues,
  type OrganizationRoleFormValues,
} from '@features/organization/ui/forms';
import {
  OrganizationInvitationTable,
  OrganizationMemberTable,
  OrganizationRoleTable,
  type OrganizationMemberRoleRemoval,
} from '@features/organization/ui/tables';

/**
 * Page OrganizationTeamPage
 *
 * @description
 * Coordinates organization members, invitations, roles and role assignments
 * according to the active member's management permissions.
 *
 * @since 1.0.0
 */
@Component({
  selector: 'app-organization-team',
  imports: [
    CardModule,
    ButtonModule,
    MessageModule,
    OrganizationInvitationForm,
    OrganizationInvitationTable,
    OrganizationMemberForm,
    OrganizationMemberTable,
    OrganizationRoleAssignmentForm,
    OrganizationRoleForm,
    OrganizationRoleTable,
    TabsModule,
  ],
  providers: [OrganizationTeamStore],
  templateUrl: './organization-team.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationTeamPage {
  /** PrimeNG confirmation service for destructive team operations. */
  private readonly confirmationService: ConfirmationService = inject(ConfirmationService);
  /** Active organization context store. */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject(ActiveOrganizationStore);
  /** Organization permission evaluator. */
  private readonly permissionService: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Page-scoped team workflow store. */
  protected readonly store: OrganizationTeamStore = inject(OrganizationTeamStore);
  /** Role currently selected for editing. */
  protected readonly selectedRole: WritableSignal<OrganizationRoleOutput | null> = signal(null);
  /** Whether the active member can view the member workflow. */
  protected readonly canViewMembers: Signal<boolean> = computed(() =>
    this.permissionService.hasAnyPermission([
      ORGANIZATION_PERMISSION.MEMBERS_READ,
      ORGANIZATION_PERMISSION.MEMBERS_MANAGE,
    ]),
  );
  /** Whether the active member can view the role workflow. */
  protected readonly canViewRoles: Signal<boolean> = computed(() =>
    this.permissionService.hasAnyPermission([
      ORGANIZATION_PERMISSION.ROLES_READ,
      ORGANIZATION_PERMISSION.ROLES_MANAGE,
    ]),
  );
  /** Whether the active member can manage members and invitations. */
  protected readonly canManageMembers: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.MEMBERS_MANAGE),
  );
  /** Whether the active member can manage organization roles. */
  protected readonly canManageRoles: Signal<boolean> = computed(() =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.ROLES_MANAGE),
  );
  /** First visible team tab for the active member. */
  protected readonly defaultTab: Signal<'members' | 'roles'> = computed(() =>
    this.canViewMembers() ? 'members' : 'roles',
  );
  /** PrimeNG pass-through configuration for the tab container. */
  protected readonly tabsPt: TabsPassThrough = {
    root: { class: 'flex min-h-0 flex-1 flex-col' },
  };
  /** PrimeNG pass-through configuration for the tab list. */
  protected readonly tabListPt: TabListPassThrough = {
    content: { class: 'rounded-t-md' },
    tabList: { class: 'px-4' },
  };
  /** PrimeNG pass-through configuration for the tab panels. */
  protected readonly tabPanelsPt: TabPanelsPassThrough = {
    root: { class: 'min-h-0 flex-1 overflow-y-auto px-0 pt-6' },
  };

  /** Initializes the team resources visible to the active member. */
  public constructor() {
    this.reload();
  }

  /** Reloads only the team resources allowed by current permissions. */
  protected reload(): void {
    const organizationId = this.organizationId();
    if (!organizationId) return;

    this.store.load({
      organizationId,
      includeMembers: this.canViewMembers(),
      includeRoles: this.canViewRoles(),
      includeInvitations: this.canViewMembers(),
      includePermissions: this.canManageRoles(),
    });
  }

  /** Adds an existing user to the active organization. */
  protected addMember(input: AddOrganizationMemberInput): void {
    const organizationId = this.organizationId();
    if (organizationId) this.store.addMember({ organizationId, input });
  }

  /** Confirms and removes a member from the active organization. */
  protected removeMember(member: OrganizationMemberOutput): void {
    this.confirmationService.confirm({
      header: 'Remove member',
      message: `Remove member ${member.userId} from this organization?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Remove', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        const organizationId = this.organizationId();
        if (organizationId) this.store.removeMember({ organizationId, memberId: member.id });
      },
    });
  }

  /** Sends an invitation for the active organization. */
  protected invite(input: InviteOrganizationMemberInput): void {
    const organizationId = this.organizationId();
    if (organizationId) this.store.invite({ organizationId, input });
  }

  /** Confirms and revokes an organization invitation. */
  protected revokeInvitation(invitation: OrganizationInvitationOutput): void {
    this.confirmationService.confirm({
      header: 'Revoke invitation',
      message: `Revoke the invitation sent to ${invitation.email}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Revoke', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        const organizationId = this.organizationId();
        if (organizationId)
          this.store.revokeInvitation({ organizationId, invitationId: invitation.id });
      },
    });
  }

  /** Creates a role or updates the currently selected role. */
  protected saveRole(values: OrganizationRoleFormValues): void {
    const organizationId = this.organizationId();
    if (!organizationId) return;
    const role = this.selectedRole();
    if (role) {
      this.store.updateRole({
        organizationId,
        roleId: role.id,
        input: { description: values.description || null, permissions: values.permissions },
      });
      this.selectedRole.set(null);
    } else {
      this.store.createRole({
        organizationId,
        input: {
          name: values.name,
          description: values.description,
          permissions: values.permissions,
        },
      });
    }
  }

  /** Confirms and removes a non-system organization role. */
  protected removeRole(role: OrganizationRoleOutput): void {
    if (role.isSystem) return;
    this.confirmationService.confirm({
      header: 'Delete role',
      message: `Delete role "${role.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: 'Delete', severity: 'danger' },
      rejectButtonProps: { label: 'Cancel', severity: 'secondary', outlined: true },
      accept: () => {
        const organizationId = this.organizationId();
        if (organizationId) this.store.removeRole({ organizationId, roleId: role.id });
      },
    });
  }

  /** Assigns a role to an organization member. */
  protected assignRole(values: OrganizationRoleAssignmentValues): void {
    const organizationId = this.organizationId();
    if (organizationId)
      this.store.assignRole({
        organizationId,
        memberId: values.memberId,
        input: { roleId: values.roleId },
      });
  }

  /** Removes an assigned role from an organization member. */
  protected removeRoleFromMember(removal: OrganizationMemberRoleRemoval): void {
    const organizationId = this.organizationId();
    if (organizationId)
      this.store.removeRoleFromMember({
        organizationId,
        memberId: removal.member.id,
        roleId: removal.roleId,
      });
  }

  /** Returns the active organization identifier when available. */
  private organizationId(): string | undefined {
    return this.activeOrganizationStore.selectedOrganization()?.id;
  }
}
