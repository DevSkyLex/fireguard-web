import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { InterventionReadinessCheck } from './models';

/**
 * Component InterventionReadinessChecklist
 * @class InterventionReadinessChecklist
 *
 * @description
 * Presentational, read-only checklist rendering a workflow phase's readiness
 * conditions. Each condition pairs a shape-distinct icon (a filled check when
 * satisfied, a hollow exclamation when not) with its label, so status is never
 * conveyed by colour alone. Unifies the prepare, execute and review phases so
 * every "Ready to …" list looks and reads identically. It owns no state and
 * emits no events — the parent panel derives and passes the conditions.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-intervention-readiness-checklist [checks]="readinessChecks()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-readiness-checklist',
  templateUrl: './intervention-readiness-checklist.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionReadinessChecklist {
  //#region Inputs
  /**
   * Property checks
   * @readonly
   *
   * @description
   * Ordered readiness conditions to render.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly InterventionReadinessCheck[]>}
   */
  public readonly checks: InputSignal<readonly InterventionReadinessCheck[]> =
    input.required<readonly InterventionReadinessCheck[]>();
  //#endregion
}
