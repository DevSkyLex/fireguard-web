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
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { EmptyState } from '@shared/components';

/**
 * Table presenting organization roles and role management actions.
 */
@Component({
  selector: 'app-organization-role-table',
  imports: [ButtonModule, CardModule, EmptyState, SkeletonModule, TableModule],
  templateUrl: './organization-role-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleTable {
  /** Localized placeholder shown when a role has no description. */
  protected readonly noDescriptionLabel: string = $localize`:@@org.roleTable.noDescription:No description`;
  /** Localized placeholder shown when a role has no permissions. */
  protected readonly noPermissionsLabel: string = $localize`:@@org.roleTable.noPermissions:No permissions`;
  /** Organization roles to display. */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();
  /** Whether roles are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether the active member can manage roles. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Emits a role selected for editing. */
  public readonly edit: OutputEmitterRef<OrganizationRoleOutput> = output();
  /** Emits a role selected for removal. */
  public readonly remove: OutputEmitterRef<OrganizationRoleOutput> = output();
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);
}
