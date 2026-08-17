import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component PageHeading
 * @class PageHeading
 *
 * @description
 * The in-page `<h1>` primitive for pages outside the dashboard shell — auth,
 * onboarding, and the 404 page own their own heading rather than relying on a
 * chrome-provided title (`DESIGN.md` "The shell contract"). Renders the
 * heading and an optional plain-text lead; a caller whose lead needs
 * interpolated markup (a resend destination in bold, for example) skips the
 * `description` input and projects its own paragraph instead — it lands in
 * the same header, after the plain lead. Generic by design: it names no
 * domain and takes only scalars plus projected content (`ARCHITECTURE.md`
 * §6.4). Translated strings are the caller's responsibility; this component
 * receives them already resolved.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-page-heading
 *   heading="Sign in"
 *   description="Access your FireGuard workspace."
 * />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-page-heading',
  host: { class: 'block' },
  templateUrl: './page-heading.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeading {
  //#region Inputs
  /**
   * Property heading
   * @readonly
   *
   * @description
   * The page's own `<h1>` text.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly heading: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional plain-text lead rendered under the heading. For a lead that
   * needs interpolated markup, omit this and project a paragraph instead.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly description: InputSignal<string | null> = input<string | null>(null);
  //#endregion
}
