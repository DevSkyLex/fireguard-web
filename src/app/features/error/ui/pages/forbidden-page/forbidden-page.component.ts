import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut, lucideShieldX } from '@ng-icons/lucide';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth/ports';
import { HlmButton } from '@shared/ui/button';

/**
 * Component ForbiddenPage
 * @class ForbiddenPage
 *
 * @description
 * Where `organizationGuard` sends a member whose every organization is
 * excluded — access exists nowhere, so any workspace link loops back here.
 * Signing out is the one exit that cannot loop, which is why it is the
 * primary action and why this page consumes `AUTH_LOGOUT_PORT` (an approved
 * consumer per `features/auth/FEATURE.md`) instead of a dead-end message.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink, NgIcon, HlmButton],
  providers: [provideIcons({ lucideLogOut, lucideShieldX })],
  templateUrl: './forbidden-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  //#region Properties
  /**
   * Property logoutPort
   * @readonly
   *
   * @description
   * Auth-owned logout contract: the primary exit from a workspace the
   * member cannot enter.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {AuthLogoutPort}
   */
  protected readonly logoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);
  //#endregion
}
