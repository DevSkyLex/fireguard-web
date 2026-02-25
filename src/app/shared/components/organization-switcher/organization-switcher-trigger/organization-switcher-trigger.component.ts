import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import type { OrganizationOutput } from '@core/models/organization';

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
  imports: [
    AvatarModule,
    ButtonModule,
    SkeletonModule,
  ],
  templateUrl: './organization-switcher-trigger.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherTrigger {
  //#region Properties
  /**
   * Property organization
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
   * Property isLoading
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

  /**
   * Property isSwitching
   * @readonly
   *
   * @description
   * Whether an organization switch is in progress (i.e. the newly selected
   * organization's data is currently loading). When true, the trigger button
   * is disabled and shows a spinner in place of the chevron.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly isSwitching: InputSignal<boolean> = input<boolean>(false);

  /**
   * Property toggleMenu
   * @readonly
   *
   * @description
   * Emitted when the trigger button is clicked.
   * The parent uses the event to toggle the popover.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<MouseEvent>}
   */
  public readonly toggleMenu: OutputEmitterRef<MouseEvent> =
    output<MouseEvent>();
  //#endregion

  //#region Methods
  /**
   * Method onButtonClick
   * @method onButtonClick
   *
   * @description
   * Forwards the native click event to the parent so it can
   * toggle the popover.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {MouseEvent} event - The native click event from `p-button`.
   * @returns {void}
   */
  protected onButtonClick(event: MouseEvent): void {
    this.toggleMenu.emit(event);
  }

  /**
   * Method avatarPt
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
      root: { class: [this.orgColor(org.id), 'shrink-0 size-4 rounded text-white'] },
      label: { class: 'text-[9px] font-bold leading-none' },
    };
  }

  /**
   * Method orgInitials
   * @method orgInitials
   *
   * @description
   * Derives a 1-2 letter initials string from the organization name, to be
   * shown in the avatar when no image is available.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} name - The organization name to extract the initials from.
   *
   * @return {string} The derived initials, in uppercase.
   */
  protected orgInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');
  }

  /**
   * Method orgColor
   * @method orgColor
   *
   * @description
   * Derives a deterministic Tailwind background-color class from the
   * organization id so each org has a stable, distinct
   * color in its avatar.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} id - The organization identifier to derive the color from.
   *
   * @return {string} A Tailwind bg-* class string.
   */
  private orgColor(id: string): string {
    const palette: string[] = [
      'bg-violet-500',
      'bg-blue-500',
      'bg-cyan-500',
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-pink-500',
      'bg-indigo-500',
    ];
    const index: number = [...id].reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length;
    return palette[index];
  }
  //#endregion
}
