import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';
import type { OrganizationRoleOutput } from '@features/organization/models';
import { EmptyState } from '@shared/components';

/**
 * Selectable role-card list presenting the organization roles: icon, name,
 * description and permission count per card. Selecting a card lets the parent
 * page display the role's permission matrix.
 */
@Component({
  selector: 'app-organization-role-table',
  imports: [EmptyState, SkeletonModule],
  templateUrl: './organization-role-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationRoleTable {
  /** Localized placeholder shown when a role has no description. */
  protected readonly noDescriptionLabel: string = $localize`:@@org.roleTable.noDescription:No description`;
  /** Organization roles to display. */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();
  /** Whether roles are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether the active member can manage roles. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Identifier of the role currently highlighted as selected. */
  public readonly selectedRoleId: InputSignal<string | null> = input<string | null>(null);
  /** Emits a role selected for consultation. */
  public readonly select: OutputEmitterRef<OrganizationRoleOutput> = output();
  /** Placeholder cards displayed while loading. */
  protected readonly skeletonItems: undefined[] = Array(3);

  /** Resolves the decorative card icon for a role (system vs custom). */
  protected roleIcon(role: OrganizationRoleOutput): string {
    return role.isSystem ? 'pi-shield' : 'pi-id-card';
  }

  /**
   * Method permissionAreas
   *
   * @description
   * The distinct resources a role can act on, derived from the `resource.verb`
   * shape of each permission name.
   *
   * Not one chip per permission: the catalogue holds 39, and a card wearing 39
   * chips is less readable than the bare count it replaced. Grouping answers
   * the question the count could not — *what kind of role is this* — in at
   * most a handful of words.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {OrganizationRoleOutput} role - Role whose permissions to summarise.
   *
   * @returns {readonly string[]} Distinct resource names, in first-seen order.
   */
  protected permissionAreas(role: OrganizationRoleOutput): readonly string[] {
    const areas: string[] = [];

    for (const permission of role.permissions) {
      const area: string = permission.name.split('.')[0] ?? permission.name;
      if (!areas.includes(area)) areas.push(area);
    }

    return areas;
  }
}
