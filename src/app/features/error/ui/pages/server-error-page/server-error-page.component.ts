import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  imports: [RouterLink],
  templateUrl: './server-error-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorPage {}
