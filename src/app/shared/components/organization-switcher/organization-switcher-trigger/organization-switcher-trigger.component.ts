import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import type { OrganizationOutput } from '@core/models/organization';
import { orgColor, orgInitials } from '../organization-switcher.utils';

/**
 * Component OrganizationSwitcherTrigger
 * @class OrganizationSwitcherTrigger
 *
 * @description
 * Trigger button for the organization selector popover.
 * Shows a skeleton while organizations are loading, the active
 * organization's avatar + name once loaded, or a placeholder
 * when no organization is selected.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher-trigger',
  imports: [AvatarModule, ButtonModule, SkeletonModule],
  templateUrl: './organization-switcher-trigger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherTrigger {
  //#region Inputs
  /**
   * Input organization
   * @readonly
   *
   * @description
   * The currently selected organization, or null when none is active.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<OrganizationOutput | null>}
   */
  public readonly organization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);

  /**
   * Input isLoading
   * @readonly
   *
   * @description
   * Whether the organizations list is currently being fetched.
   * When true, a skeleton placeholder is rendered instead of the button.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isLoading: InputSignal<boolean> = input<boolean>(false);
  //#endregion

  //#region Outputs
  /**
   * Output toggleMenu
   * @readonly
   *
   * @description
   * Emitted when the trigger button is clicked.
   * The parent uses the event to toggle the popover.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<Event>}
   */
  public readonly toggleMenu: OutputEmitterRef<Event> = output<Event>();
  //#endregion

  //#region Methods
  /**
   * Method avatarPt
   * @method avatarPt
   *
   * @description
   * Returns PrimeNG passthrough options for the trigger avatar,
   * sized to fit inside the small p-button.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {OrganizationOutput} org - Organization to derive the color from.
   * @returns {AvatarPassThroughOptions}
   */
  protected avatarPt(org: OrganizationOutput): AvatarPassThroughOptions {
    return {
      root: { class: [orgColor(org.id), 'shrink-0 size-4 rounded text-white'] },
      label: { class: 'text-[9px] font-bold leading-none' },
    };
  }

  protected readonly orgInitials = orgInitials;
  //#endregion
}
