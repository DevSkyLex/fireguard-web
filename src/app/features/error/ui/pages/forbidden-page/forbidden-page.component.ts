import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Component ForbiddenPage
 * @class ForbiddenPage
 *
 * @description
 * Displayed when the user lacks permission to access a resource (HTTP 403).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-forbidden-page',
  imports: [RouterLink],
  templateUrl: './forbidden-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}
