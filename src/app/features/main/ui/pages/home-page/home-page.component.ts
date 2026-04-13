import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component HomePage
 * @class HomePage
 *
 * @description
 * Application home page displayed after authentication.
 * Serves as the main landing page / dashboard entry point.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {}
