import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ErrorContent } from '../../components/error-content';

/**
 * Component ServerErrorPage
 * @class ServerErrorPage
 *
 * @description
 * Displayed when an unhandled server-side or application error occurs (HTTP 500).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-server-error-page',
  imports: [RouterLink, ButtonModule, ErrorContent],
  templateUrl: './server-error-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorPage {
  /**
   * Method refresh
   * @method refresh
   *
   * @description
   * Reloads the current document so the user can retry after a server error.
   *
   * @access public
   * @returns {void}
   */
  public refresh(): void {
    window.location.reload();
  }
}
