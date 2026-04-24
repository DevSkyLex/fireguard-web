import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Component NotFoundPage
 * @class NotFoundPage
 *
 * @description
 * Displayed when a route cannot be matched (HTTP 404).
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
