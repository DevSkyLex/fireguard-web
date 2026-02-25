import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { RippleModule } from 'primeng/ripple';
import type { OrganizationOutput } from '@core/models/organization';
import { orgColor, orgInitials } from '../organization-switcher.utils';

/**
 * Component OrganizationSwitcherList
 * @class OrganizationSwitcherList
 *
 * @description
 * Scrollable list of organizations inside the organization selector
 * popover. Renders one row per workspace with a color-coded avatar,
 * the organization name, and a checkmark on the currently active one.
 * Emits {@link organizationChange} when the user clicks a row.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher-list',
  imports: [AvatarModule, RippleModule],
  templateUrl: './organization-switcher-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherList {
  //#region Inputs
  /**
   * Input organizations
   * @readonly
   *
   * @description
   * Full list of organizations available to the user.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<OrganizationOutput[]>}
   */
  public readonly organizations: InputSignal<OrganizationOutput[]> =
    input<OrganizationOutput[]>([]);

  /**
   * Input selectedOrganization
   * @readonly
   *
   * @description
   * The currently active organization. Used to highlight the active
   * row and show the checkmark indicator.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<OrganizationOutput | null>}
   */
  public readonly selectedOrganization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Output organizationChange
   * @readonly
   *
   * @description
   * Emitted when the user clicks an organization row.
   * The parent navigates to the selected organization's dashboard.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<OrganizationOutput>}
   */
  public readonly organizationChange: OutputEmitterRef<OrganizationOutput> =
    output<OrganizationOutput>();
  //#endregion

  //#region Methods
  /**
   * Method avatarPt
   * @method avatarPt
   *
   * @description
   * Returns PrimeNG passthrough options for a list row avatar.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {OrganizationOutput} org - Organization to derive the color from.
   * @returns {AvatarPassThroughOptions}
   */
  protected avatarPt(org: OrganizationOutput): AvatarPassThroughOptions {
    return {
      root: { class: [orgColor(org.id), 'shrink-0 size-6 rounded text-white'] },
      label: { class: 'text-[11px] font-bold leading-none' },
    };
  }

  protected readonly orgInitials = orgInitials;
  //#endregion
}
