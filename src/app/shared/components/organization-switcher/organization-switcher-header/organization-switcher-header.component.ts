import {
  ChangeDetectionStrategy,
  Component,
  input,
  type InputSignal,
} from '@angular/core';

/**
 * Component OrganizationSwitcherHeader
 * @class OrganizationSwitcherHeader
 *
 * @description
 * Header section of the organization selector popover.
 * Displays the panel title and a workspace-count badge pill.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher-header',
  templateUrl: './organization-switcher-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherHeader {
  //#region Inputs
  /**
   * Input organizationCount
   * @readonly
   *
   * @description
   * Total number of workspaces available to the user.
   * Displayed as a badge pill next to the title.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<number>}
   */
  public readonly organizationCount: InputSignal<number> = input<number>(0);
  //#endregion
}
