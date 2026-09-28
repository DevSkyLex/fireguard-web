import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

/**
 * Component ErrorScene
 * @class ErrorScene
 *
 * @description
 * The decorative status illustration shared by the error pages (forbidden,
 * not found, server error): a dashed ellipse, three rotated lucide icons, a
 * one-shot bounce, and the big mono status code. Purely presentational and
 * `aria-hidden` beyond the code text itself — the icon set stays the
 * caller's `provideIcons()`, matching `StatTile`'s convention, so this
 * component pulls in none of its own.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-error-scene',
  imports: [NgIcon],
  templateUrl: './error-scene.component.html',
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorScene {
  //#region Inputs
  /**
   * Property code
   * @readonly
   *
   * @description
   * The status code rendered large behind the icons (`"403"`, `"404"`,
   * `"500"`). Not `$localize`d: a status code is a numeral, not
   * language-dependent text.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly code: InputSignal<string> = input.required<string>();

  /**
   * Property primaryIcon
   * @readonly
   *
   * @description
   * Registered lucide icon name for the larger, top-left figure, animated
   * with a single 4s bounce. The caller registers it with `provideIcons()`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly primaryIcon: InputSignal<string> = input.required<string>();

  /**
   * Property secondaryIcon
   * @readonly
   *
   * @description
   * Registered lucide icon name for the larger, bottom-right figure,
   * animated with a single 3s bounce. The caller registers it with
   * `provideIcons()`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly secondaryIcon: InputSignal<string> = input.required<string>();

  /**
   * Property accentIcon
   * @readonly
   *
   * @description
   * Registered lucide icon name for the small, static, low-opacity figure.
   * The caller registers it with `provideIcons()`.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly accentIcon: InputSignal<string> = input.required<string>();
  //#endregion
}
