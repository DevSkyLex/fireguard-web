import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { SkeletonModule } from 'primeng/skeleton';

/**
 * One cell of the strip.
 *
 * `sub` is optional because only some figures have a second fact worth
 * carrying — the mockup makes the sub-line conditional for the same reason.
 *
 * @since 1.0.0
 */
export interface FacilityKpi {
  readonly label: string;
  readonly value: string;
  readonly sub?: string | null;
}

/**
 * Component FacilityKpiStrip
 * @class FacilityKpiStrip
 *
 * @description
 * The four-figure band under a facility's header: one flat bordered card
 * divided into cells, each showing a label, a large tabular figure and an
 * optional qualifier.
 *
 * Purely presentational — it receives already-formatted strings, so the
 * pluralisation and the "—" for absent data stay with the feature that owns
 * the numbers.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-facility-kpi-strip [kpis]="kpis()" [loading]="isLoading()" />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-kpi-strip',
  imports: [SkeletonModule],
  templateUrl: './facility-kpi-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityKpiStrip {
  //#region Inputs
  /**
   * Property kpis
   * @readonly
   *
   * @description
   * The figures to render, in display order.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<readonly FacilityKpi[]>}
   */
  public readonly kpis: InputSignal<readonly FacilityKpi[]> = input<readonly FacilityKpi[]>([]);

  /**
   * Property loading
   * @readonly
   *
   * @description
   * Renders one skeleton per expected cell rather than an empty band: the
   * strip sits directly under the header, and collapsing it on load would
   * shift everything below.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input<boolean>(false);
  //#endregion
}
