import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Component Logo
 * @class Logo
 *
 * @description
 * The Fireguard brand mark — three parallel, upward-rising strokes evoking
 * growth and momentum. Symbol only (no wordmark); pair it with a separate text
 * label where a lockup is needed. Scales to its host box: apply a sizing class
 * (e.g. `class="size-7"`) to `<app-logo>` and the SVG fills it.
 *
 * The strokes are painted with the shared amber→ember gradient; the gradient
 * id is a document-wide constant, and because every instance embeds an
 * identical `<defs>`, duplicate ids resolve to the same paint with no
 * collision and no SSR/hydration id drift.
 *
 * @example ```html
 * <app-logo class="size-7" />
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-logo',
  templateUrl: './logo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block' },
})
export class Logo {
  //#region Properties
  /**
   * Property gradientId
   * @readonly
   *
   * @description
   * Stable document-wide id for the brand gradient. Constant (not per-instance)
   * so it is deterministic across SSR and hydration; every instance embeds an
   * identical gradient definition, so `url(#…)` resolves to the same paint
   * regardless of how many logos are on the page.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {string}
   */
  protected readonly gradientId: string = 'fireguard-logo-gradient';
  //#endregion
}
