import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import type { OverviewQuickAction } from '../../organization-overview.types';

/**
 * Component OrganizationOverviewQuickActionsComponent
 * @class OrganizationOverviewQuickActionsComponent
 *
 * @description
 * Presentational action card exposing shortcut buttons toward the
 * organization sub-features.
 *
 * The parent page decides the available routes and handles the
 * actual navigation when an action is selected.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview-quick-actions',
  host: {
    style: 'display: block',
  },
  imports: [
    ButtonModule,
    CardModule,
  ],
  templateUrl: './organization-overview-quick-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewQuickActionsComponent {
  //#region Inputs
  /**
   * Input actions
   * @readonly
   *
   * @description
   * List of quick actions displayed by the card.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly OverviewQuickAction[]>}
   */
  public readonly actions: InputSignal<readonly OverviewQuickAction[]> =
    input.required<readonly OverviewQuickAction[]>();
  //#endregion

  //#region Outputs
  /**
   * Output routeSelected
   * @readonly
   *
   * @description
   * Emitted with the route fragment associated with the selected
   * quick action.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {OutputEmitterRef<string>}
   */
  public readonly routeSelected: OutputEmitterRef<string> =
    output<string>();
  //#endregion
}
