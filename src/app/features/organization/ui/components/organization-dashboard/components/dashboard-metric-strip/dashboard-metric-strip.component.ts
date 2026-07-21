import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  type Signal,
} from '@angular/core';
import { DashboardMetricCell } from './components';

/**
 * Component DashboardMetricStrip
 * @class DashboardMetricStrip
 *
 * @description
 * Row of detached dashboard KPI tiles: each projected {@link DashboardMetricCell}
 * renders its own bordered card, laid out on a gapped grid whose column count
 * adapts to how many cells survive their permission gates so no track is ever
 * left empty.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-metric-strip',
  templateUrl: './dashboard-metric-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardMetricStrip {
  //#region Properties

  /**
   * Property cells
   * @readonly
   *
   * @description
   * Reactive query over the projected metric cells, used to derive the
   * grid column layout from the number of visible cells.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<readonly DashboardMetricCell[]>}
   */
  protected readonly cells: Signal<readonly DashboardMetricCell[]> =
    contentChildren<DashboardMetricCell>(DashboardMetricCell);

  /**
   * Property gridClass
   * @readonly
   *
   * @description
   * Column classes keeping every grid row fully occupied for the actual
   * cell count, so a permission-gated absence never leaves a half-empty row.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly gridClass: Signal<string> = computed<string>(() => {
    switch (this.cells().length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-1 sm:grid-cols-3';
      case 5:
        // Five never divides into two or four, so any intermediate breakpoint
        // would leave a half-empty last row.
        // One column, then five.
        return 'grid-cols-1 xl:grid-cols-5';
      default:
        return 'grid-cols-2 xl:grid-cols-4';
    }
  });

  //#endregion
}
