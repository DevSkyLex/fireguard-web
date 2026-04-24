import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component MaintenancePage
 * @class MaintenancePage
 *
 * @description
 * Displayed when the application is in maintenance mode or the API
 * returns a 503 Service Unavailable response.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-maintenance-page',
  templateUrl: './maintenance-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaintenancePage {}
