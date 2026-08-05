import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

/**
 * Component ErrorState
 * @class ErrorState
 *
 * @description
 * The something-broke surface: a glyph, a heading, a sentence, and whatever the
 * caller projects as the retry. Distinct from {@link EmptyState} because it
 * carries `role="alert"` and a destructive tone — an empty list and a failed
 * one must not read the same. Generic by design (`ARCHITECTURE.md` §6.4).
 *
 * The icon is a name, not a component: the caller registers it with
 * `provideIcons()` so this concept pulls in no icon set of its own.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-error-state icon="lucideTriangleAlert" title="Couldn't load your queues">
 *   <button hlmBtn (click)="retry()">Retry</button>
 * </app-error-state>
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-error-state',
  imports: [NgIcon],
  templateUrl: './error-state.component.html',
  host: { role: 'alert' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  //#region Inputs
  /**
   * Property title
   * @readonly
   *
   * @description
   * The heading naming what failed.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly title: InputSignal<string> = input.required<string>();

  /**
   * Property description
   * @readonly
   *
   * @description
   * Optional sentence explaining the consequence.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly description: InputSignal<string | null> = input<string | null>(null);

  /**
   * Property icon
   * @readonly
   *
   * @description
   * Optional registered icon name, rendered decoratively above the heading.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string | null>}
   */
  public readonly icon: InputSignal<string | null> = input<string | null>(null);
  //#endregion
}
