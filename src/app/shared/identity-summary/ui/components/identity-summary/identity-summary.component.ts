import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { HlmAvatar, HlmAvatarFallback, HlmAvatarImage } from '@shared/ui/avatar';

/**
 * Component IdentitySummary
 * @class IdentitySummary
 *
 * @description
 * A person at a glance: their picture, their name, and one secondary line.
 *
 * Generic by design — every input is a primitive, it injects nothing and names
 * no business concept, so it reads the same whether the person is the signed-in
 * user or a colleague (`ARCHITECTURE.md` §6.4). That sameness is the point:
 * a profile should not look like a different thing depending on whose it is.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-identity-summary [name]="displayName()" [secondary]="email()" [initials]="initials()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-identity-summary',
  imports: [HlmAvatar, HlmAvatarFallback, HlmAvatarImage],
  templateUrl: './identity-summary.component.html',
  host: { class: 'block min-w-0' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentitySummary {
  //#region Inputs
  /**
   * Property name
   * @readonly
   *
   * @description
   * What to call the person.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly name: InputSignal<string> = input.required<string>();

  /**
   * Property initials
   * @readonly
   *
   * @description
   * Avatar fallback, shown whenever no picture resolves.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly initials: InputSignal<string> = input<string>('');

  /**
   * Property avatarUrl
   * @readonly
   *
   * @description
   * The picture, or `null` to fall back to the initials.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly avatarUrl: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property secondary
   * @readonly
   *
   * @description
   * One line under the name — an address for your own profile, a role for
   * someone else's. Omitted when empty rather than reserving blank space.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly secondary: InputSignal<string | null> = input<string | null>(null);
  //#endregion
}
