import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';

/**
 * Component ErrorContent
 * @class ErrorContent
 *
 * @description
 * Presentational shell shared by the full-screen error pages (403, 404, 500).
 * Renders the muted numeric code, a title, a description and a projected action
 * row so every error surface stays visually consistent. Content-only: the owning
 * page provides the copy and the action buttons through inputs and `ng-content`.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-error-content',
  templateUrl: './error-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorContent {
  /**
   * Property code
   *
   * @description
   * HTTP status code rendered as the large muted glyph (e.g. `404`).
   *
   * @access public
   * @type {InputSignal<string>}
   */
  public readonly code: InputSignal<string> = input.required<string>();

  /**
   * Property title
   *
   * @description
   * Short, human-readable error title.
   *
   * @access public
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   *
   * @description
   * One-sentence explanation of the error and the recommended next step.
   *
   * @access public
   * @type {InputSignal<string>}
   */
  public readonly description: InputSignal<string> = input.required<string>();
}
