import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  type InputSignal,
  type Signal,
} from '@angular/core';
import {
  resolveInterventionTag,
  type InterventionPriority,
} from '@features/organization/features/interventions/models';
import { tagSeverityIconClass } from '@shared/tag-severity';

/**
 * Component InterventionPriorityIcon
 * @class InterventionPriorityIcon
 *
 * @description
 * Standalone 4-bar priority meter (low → urgent) filled proportionally to the
 * level and coloured through the shared severity mapping so it always matches
 * `InterventionTag`/`InterventionOption`. `urgent` fills the tallest fourth
 * bar, so it reads as a distinct, more severe step rather than relying on
 * colour alone over `high`. The accessible name comes from the same
 * intervention tag registry as every other priority rendering.
 *
 * @example
 * ```html
 * <app-intervention-priority-icon priority="urgent" />
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-priority-icon',
  templateUrl: './intervention-priority-icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionPriorityIcon {
  //#region Inputs
  /**
   * Property priority
   * @readonly
   *
   * @description
   * Priority level to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionPriority>}
   */
  public readonly priority: InputSignal<InterventionPriority> =
    input.required<InterventionPriority>();
  //#endregion

  //#region Properties
  /**
   * Property filledBars
   * @readonly
   *
   * @description
   * Number of bars filled solid for the current priority (1 for `low`, 2 for
   * `normal`, 3 for `high`, 4 for `urgent`).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  protected readonly filledBars: Signal<number> = computed<number>(() => {
    switch (this.priority()) {
      case 'low':
        return 1;
      case 'normal':
        return 2;
      case 'high':
        return 3;
      default:
        return 4;
    }
  });

  /**
   * Property colorClass
   * @readonly
   *
   * @description
   * Severity colour class resolved from the shared intervention priority
   * registry, applied to the SVG root so filled bars pick it up via
   * `currentColor`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly colorClass: Signal<string> = computed<string>(() =>
    tagSeverityIconClass(resolveInterventionTag('priority', this.priority()).severity),
  );

  /**
   * Property ariaLabel
   * @readonly
   *
   * @description
   * Accessible label for the glyph, e.g. `"Urgent"`, resolved from the same
   * registry as the badge and select-option renderings.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly ariaLabel: Signal<string> = computed<string>(
    () => resolveInterventionTag('priority', this.priority()).label,
  );
  //#endregion
}
