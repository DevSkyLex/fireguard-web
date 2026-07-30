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
import { EmptyState } from '@shared/empty-state';

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
}
