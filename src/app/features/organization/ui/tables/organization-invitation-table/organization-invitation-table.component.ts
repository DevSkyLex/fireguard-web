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
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import type { OrganizationInvitationOutput } from '@features/organization/models';
import { EmptyState } from '@shared/components';

/**
 * Table presenting pending organization invitations.
 */
@Component({
  selector: 'app-organization-invitation-table',
  imports: [ButtonModule, CardModule, DatePipe, EmptyState, SkeletonModule, TableModule],
  templateUrl: './organization-invitation-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationTable {
  /** Pending invitations to display. */
  public readonly invitations: InputSignal<readonly OrganizationInvitationOutput[]> =
    input.required();
  /** Whether invitations are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether the active member can revoke invitations. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Emits an invitation selected for revocation. */
  public readonly revoke: OutputEmitterRef<OrganizationInvitationOutput> = output();
  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems = Array(5);
}
