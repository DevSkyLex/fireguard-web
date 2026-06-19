import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { AvatarModule, type AvatarPassThroughOptions } from 'primeng/avatar';
import { RippleModule } from 'primeng/ripple';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Component OrganizationSwitcherNav
 * @class OrganizationSwitcherNav
 *
 * @description
 * Section of the organization selector popover that highlights the
 * currently active organization and provides quick-access navigation
 * links to organization management pages (members, settings, billing).
 *
 * Emits {@link navigate} when a link is clicked so the parent can
 * close the popover without this component being coupled to it.
 *
 * @since 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-switcher-nav',
  imports: [RouterModule, AvatarModule, RippleModule],
  templateUrl: './organization-switcher-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationSwitcherNav {
  //#region Inputs
  /**
   * Input organization
   * @readonly
   *
   * @description
   * The currently active organization to display and build links from.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<OrganizationOutput | null>}
   */
  public readonly organization: InputSignal<OrganizationOutput | null> =
    input<OrganizationOutput | null>(null);
  //#endregion

  //#region Outputs
  /**
   * Output navigate
   * @readonly
   *
   * @description
   * Emitted when the user clicks any navigation link.
   * The parent uses it to close the popover.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {OutputEmitterRef<void>}
   */
  public readonly navigate: OutputEmitterRef<void> = output<void>();
  //#endregion

  //#region Methods
  /**
   * Method avatarPt
   *
   * @description
   * Returns PrimeNG passthrough options for the organization avatar.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {OrganizationOutput} org - Organization to derive the color from.
   * @returns {AvatarPassThroughOptions}
   */
  protected avatarPt(org: OrganizationOutput): AvatarPassThroughOptions {
    return {
      root: {
        class: [this.orgColor(org.id), 'shrink-0 size-7 overflow-hidden rounded text-white'],
      },
      label: { class: 'text-[11px] font-bold leading-none' },
    };
  }

  /**
   * Method orgInitials
   *
   * @description
   * Returns 1-2 uppercase initials from the organization name.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {string} name - Organization name.
   * @returns {string}
   */
  protected orgInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join('');
  }

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
