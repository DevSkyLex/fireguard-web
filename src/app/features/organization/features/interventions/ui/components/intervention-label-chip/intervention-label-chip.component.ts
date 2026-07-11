import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import type { InterventionLabelSummary } from '@features/organization/features/interventions/models';

/**
 * Component InterventionLabelChip
 * @class InterventionLabelChip
 *
 * @description
 * Small pill rendering one intervention label: a colour dot for quick visual
 * scanning next to the label name, which always carries the meaning — the
 * colour is never the sole cue.
 *
 * @example
 * ```html
 * @for (label of intervention.labels; track label.id) {
 *   <app-intervention-label-chip [label]="label" />
 * }
 * ```
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-intervention-label-chip',
  templateUrl: './intervention-label-chip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InterventionLabelChip {
  //#region Inputs
  /**
   * Property label
   * @readonly
   *
   * @description
   * Label to render (id, name, hex colour).
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<InterventionLabelSummary>}
   */
  public readonly label: InputSignal<InterventionLabelSummary> =
    input.required<InterventionLabelSummary>();
  //#endregion
}
