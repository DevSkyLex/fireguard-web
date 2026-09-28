import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLogOut, lucideShieldX, lucideLockKeyhole, lucideKeyRound } from '@ng-icons/lucide';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth/ports';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';
import { HlmMuted } from '@shared/ui/typography';
import { ErrorScene } from '../../components/error-scene';

/**
 * Component ForbiddenPage
 * @class ForbiddenPage
 *
 * @description
 * Where `organizationGuard` sends a member whose every organization is
 * excluded — access exists nowhere, so any workspace link loops back here.
 * Signing out is the one exit that cannot loop, which is why it is the
 * primary action and why this page consumes `AUTH_LOGOUT_PORT` (an approved
 * consumer per `features/auth/FEATURE.md`) instead of a dead-end message. It
 * also names the signed-in account through `USER_IDENTITY_PORT`, since the
 * blocked account is not always the one the member expects to be using.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink, NgIcon, ErrorScene, PageHeading, HlmButton, HlmMuted],
  providers: [provideIcons({ lucideLockKeyhole, lucideKeyRound, lucideLogOut, lucideShieldX })],
  templateUrl: './forbidden-page.component.html',
  host: { class: 'my-auto block min-w-0 w-full max-w-full shrink-0 sm:max-w-xl' },
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

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Account-owned identity contract, read only to name the signed-in
   * account below the heading.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject<UserIdentityPort>(USER_IDENTITY_PORT);

  /**
   * Property signedInAs
   * @readonly
   *
   * @description
   * Name and, when distinct from it, email of the blocked account, or an
   * empty string while the identity has not resolved yet. Combines the two
   * only when they differ, so a profile with no display name does not read
   * as `"jane@example.com (jane@example.com)"`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly signedInAs: Signal<string> = computed((): string => {
    const email: string | null = this.identity.profile()?.email ?? null;
    const name: string | null = this.identity.displayName();

    if (name !== null && email !== null && name !== email) {
      return `${name} (${email})`;
    }

    return name ?? email ?? '';
  });
  //#endregion
}
