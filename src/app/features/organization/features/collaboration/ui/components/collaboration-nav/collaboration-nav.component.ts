import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMessagesSquare, lucideUsersRound } from '@ng-icons/lucide';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { matchesOrganizationPermission } from '@features/organization/navigation';
import {
  ORGANIZATION_CONTEXT_PORT,
  ORGANIZATION_MEMBER_ACCESS_PORT,
  type OrganizationContextPort,
  type OrganizationMemberAccessPort,
} from '@features/organization/ports';
import {
  HlmSidebarGroup,
  HlmSidebarMenu,
  HlmSidebarMenuButton,
  HlmSidebarMenuItem,
} from '@shared/ui/sidebar';

/**
 * Component CollaborationNav
 * @class CollaborationNav
 *
 * @description
 * Messages and Collaboration destinations in the sidebar footer above Support.
 * Both require messaging read access; their lists belong to the sidebar extension.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-collaboration-nav',
  imports: [
    RouterLink,
    RouterLinkActive,
    NgIcon,
    HlmSidebarGroup,
    HlmSidebarMenu,
    HlmSidebarMenuButton,
    HlmSidebarMenuItem,
  ],
  providers: [provideIcons({ lucideMessagesSquare, lucideUsersRound })],
  templateUrl: './collaboration-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollaborationNav {
  //#region Dependencies
  /**
   * Property organizationContext
   * @readonly
   *
   * @description
   * Selected organization owning the messaging destination.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationContextPort}
   */
  private readonly organizationContext: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property memberAccess
   * @readonly
   *
   * @description
   * Organization access boundary for the messaging entry point.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationMemberAccessPort}
   */
  private readonly memberAccess: OrganizationMemberAccessPort = inject(
    ORGANIZATION_MEMBER_ACCESS_PORT,
  );
  //#endregion

  //#region Properties
  /**
   * Property isVisible
   * @readonly
   *
   * @description
   * Shows both destinations for a selected organization with messaging read access.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isVisible: Signal<boolean> = computed(
    () =>
      this.organizationContext.selectedOrganizationId() !== null &&
      this.memberAccess
        .permissions()
        .some((grant) =>
          matchesOrganizationPermission(grant, ORGANIZATION_PERMISSION.MESSAGING_READ),
        ),
  );

  /**
   * Property messagesRouteBase
   * @readonly
   *
   * @description
   * Absolute messaging index URL for the selected organization.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly messagesRouteBase: Signal<string> = computed(
    () => `/organizations/${this.organizationContext.selectedOrganizationId() ?? ''}/messages`,
  );

  /**
   * Property channelsRouteBase
   * @readonly
   *
   * @description
   * Absolute channel workspace URL behind the Collaboration destination.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly channelsRouteBase: Signal<string> = computed(
    () => `/organizations/${this.organizationContext.selectedOrganizationId() ?? ''}/channels`,
  );
  //#endregion
}
