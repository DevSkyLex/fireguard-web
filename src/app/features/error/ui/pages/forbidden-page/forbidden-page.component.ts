import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { AUTH_LOGOUT_PORT, type AuthLogoutPort } from '@features/auth/ports';
import { ErrorContent } from '../../components/error-content';

/**
 * Component ForbiddenPage
 * @class ForbiddenPage
 *
 * @description
 * Displayed when the member has no organization they are allowed to open
 * (HTTP 403). This is the only situation that routes here: a missing permission
 * on a single page redirects to the organization's landing with a named
 * refusal, it does not land the member on this page.
 *
 * The exits are chosen so none of them loops. "Back to home" did: it resolves
 * to `/organizations`, which is the very guard that sent the member here, and
 * which sends them straight back.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink, ButtonModule, ErrorContent],
  templateUrl: './forbidden-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {
  //#region Properties
  /** Session termination, published by the auth feature. */
  private readonly logoutPort: AuthLogoutPort = inject<AuthLogoutPort>(AUTH_LOGOUT_PORT);
  //#endregion

  //#region Methods
  /**
   * Method signOut
   *
   * @description
   * Ends the session so the member can sign in with an account that has an
   * organization. Offered because the alternative — waiting for an
   * administrator to grant access — leaves them on a page with nothing to do.
   *
   * @access protected
   * @returns {void}
   */
  protected signOut(): void {
    this.logoutPort.logout();
  }
  //#endregion
}
