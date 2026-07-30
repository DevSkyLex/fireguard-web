import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { ButtonModule } from 'primeng/button';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { ChipModule } from 'primeng/chip';
import { Menu, MenuModule } from 'primeng/menu';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { resolveInvitationTag } from '@features/organization/models';
import type {
  OrganizationInvitationOutput,
  OrganizationRoleOutput,
} from '@features/organization/models';
import { EmptyState } from '@shared/empty-state';
import { TABLE_CARD_SHELL_PT, TABLE_CARD_SHELL_STYLE_CLASS } from '@shared/table-card-shell';
import { type TagDescriptor } from '@shared/tag';
import { invitationExpiryBucket } from './utils';

/**
 * Table presenting pending organization invitations and their lifecycle
 * actions (copy link, resend, revoke), styled to match the application's
 * standard entity tables.
 */
@Component({
  selector: 'app-organization-invitation-table',
  imports: [
    ButtonModule,
    CardModule,
    ChipModule,
    DatePipe,
    EmptyState,
    MenuModule,
    SkeletonModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './organization-invitation-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationInvitationTable {
  /** Shared bordered card shell `styleClass`, identical across entity tables. */
  protected readonly cardStyleClass: string = TABLE_CARD_SHELL_STYLE_CLASS;

  /** Shared card shell pass-through options (flush body/content). */
  protected readonly cardPt: CardPassThroughOptions = TABLE_CARD_SHELL_PT;

  /** Pending invitations to display. */
  public readonly invitations: InputSignal<readonly OrganizationInvitationOutput[]> =
    input.required();
  /** Organization roles used to resolve role names. */
  public readonly roles: InputSignal<readonly OrganizationRoleOutput[]> = input.required();
  /** Whether invitations are loading. */
  public readonly loading: InputSignal<boolean> = input(false);
  /** Whether the active member can manage invitations. */
  public readonly canManage: InputSignal<boolean> = input(false);
  /** Emits an invitation selected for revocation. */
  public readonly revoke: OutputEmitterRef<OrganizationInvitationOutput> = output();
  /** Emits an invitation selected for resending. */
  public readonly resend: OutputEmitterRef<OrganizationInvitationOutput> = output();
  /** Emits an invitation whose accept link should be copied. */
  public readonly copyLink: OutputEmitterRef<OrganizationInvitationOutput> = output();

  /** Shared popup menu used by invitation rows for contextual actions. */
  private readonly rowMenu: Signal<Menu> = viewChild.required<Menu>('rowMenu');
  /** Invitation currently targeted by the row menu. */
  private readonly selectedInvitation: WritableSignal<OrganizationInvitationOutput | null> =
    signal(null);

  /** Placeholder rows displayed while loading. */
  protected readonly skeletonItems: undefined[] = Array(4);

  /** Contextual row actions for the selected invitation. */
  protected readonly rowMenuItems: Signal<MenuItem[]> = computed((): MenuItem[] => {
    const invitation = this.selectedInvitation();
    if (!invitation || !this.canManage()) return [];
    return [
      ...(this.isPending(invitation)
        ? [
            {
              label: $localize`:@@org.invTable.copyLink:Copy link`,
              icon: PrimeIcons.LINK,
              command: (): void => this.copyLink.emit(invitation),
            },
          ]
        : []),
      ...(this.canResend(invitation)
        ? [
            {
              label: $localize`:@@org.invTable.resend:Resend`,
              icon: PrimeIcons.REFRESH,
              command: (): void => this.resend.emit(invitation),
            },
          ]
        : []),
      ...(this.isPending(invitation)
        ? [
            { separator: true },
            {
              label: $localize`:@@org.members.revoke:Revoke`,
              icon: PrimeIcons.TIMES,
              styleClass: 'text-red-500',
              command: (): void => this.revoke.emit(invitation),
            },
          ]
        : []),
    ];
  });

  /** Resolves a role display name from its identifier. */
  protected roleName(roleId: string): string {
    return this.roles().find((role) => role.id === roleId)?.name ?? roleId;
  }

  /** Resolves the status badge descriptor for an invitation. */
  protected statusDescriptor(status: string): TagDescriptor {
    return resolveInvitationTag('invitationStatus', status);
  }

  /**
   * Scannable relative label for the urgent expiry window (expired / today /
   * tomorrow). Returns an empty string further out, so the template falls back
   * to the absolute date.
   */
  protected expiresLabel(iso: string): string {
    switch (invitationExpiryBucket(iso)) {
      case 'expired':
        return $localize`:@@org.invTable.expired:Expired`;
      case 'today':
        return $localize`:@@org.invTable.expiresToday:Today`;
      case 'tomorrow':
        return $localize`:@@org.invTable.expiresTomorrow:Tomorrow`;
      default:
        return '';
    }
  }

  /** Whether an invitation is still actionable (pending). */
  protected isPending(invitation: OrganizationInvitationOutput): boolean {
    return invitation.status === 'pending';
  }

  /** Whether an invitation can be resent (pending or expired). */
  protected canResend(invitation: OrganizationInvitationOutput): boolean {
    return invitation.status === 'pending' || invitation.status === 'expired';
  }

  /** Whether the selected invitation exposes any row action. */
  protected hasRowActions(invitation: OrganizationInvitationOutput): boolean {
    return this.canManage() && (this.isPending(invitation) || this.canResend(invitation));
  }

  /** Stores the targeted invitation and toggles the shared row menu. */
  protected onRowMenuToggle(event: MouseEvent, invitation: OrganizationInvitationOutput): void {
    this.selectedInvitation.set(invitation);
    this.rowMenu().toggle(event);
  }
}
