import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import type {
  OrganizationMemberOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { EmptyState } from '@shared/components';

/** Describes a role removal requested for an organization member. */
export interface OrganizationMemberRoleRemoval {
  /**
   * Property member
   * @readonly
   *
   * @description
   * Provides the member value.
   *
   * @type {OrganizationMemberOutput}
   */
  readonly member: OrganizationMemberOutput;

  /**
   * Property roleId
   * @readonly
   *
   * @description
   * Provides the role id value.
   *
   * @type {string}
   */
  readonly roleId: string;
}

/**
 * Table presenting organization members and member management actions.
 */
@Component({
  selector: 'app-organization-member-table',
  imports: [
    ButtonModule,
    CardModule,
    ChipModule,
    DatePipe,
    EmptyState,
    SkeletonModule,
    TableModule,
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

  /** Whether the active member can remove members. */
  public readonly canRemoveMember: InputSignal<boolean> = input(false);

  /** Whether the active member can manage role assignments. */
  public readonly canManageRoles: InputSignal<boolean> = input(false);

  /** Emits a member selected for removal. */
  public readonly remove: OutputEmitterRef<OrganizationMemberOutput> = output();

  /** Emits an assigned role selected for removal. */
  public readonly removeRole: OutputEmitterRef<OrganizationMemberRoleRemoval> = output();

  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);

  /** Resolves a role display name from its identifier. */
  protected roleName(roleId: string): string {
    return this.roles().find((role) => role.id === roleId)?.name ?? roleId;
  }
}
