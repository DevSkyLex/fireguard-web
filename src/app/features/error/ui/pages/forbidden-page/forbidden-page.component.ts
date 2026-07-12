import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ErrorContent } from '../../components/error-content';

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
  imports: [RouterLink, ButtonModule, ErrorContent],
  templateUrl: './forbidden-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}
