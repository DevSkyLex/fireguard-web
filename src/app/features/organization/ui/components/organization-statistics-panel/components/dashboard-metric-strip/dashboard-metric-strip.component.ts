import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  type Signal,
} from '@angular/core';
import { CardModule, type CardPassThroughOptions } from 'primeng/card';
import { DashboardMetricCell } from './components';

/**
 * Component DashboardMetricStrip
 * @class DashboardMetricStrip
 *
 * @description
 * Single elevated panel hosting the dashboard KPI cells as one divided
 * grid instead of separate cards. Projected {@link DashboardMetricCell}
 * children become grid cells separated by 1px tinted gaps; the column
 * count adapts to how many cells survive their permission gates so no
 * empty tinted track is ever shown.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-metric-strip',
  templateUrl: './dashboard-metric-strip.component.html',
  imports: [CardModule],
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
   * cell count, so the divider background never bleeds into empty tracks.
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
      default:
        return 'grid-cols-2 xl:grid-cols-4';
    }
  });

  /**
   * Property cardPt
   * @readonly
   *
   * @description
   * Pass-through options for the PrimeNG Card shell: bordered, clipped
   * root (radius and elevation come from the preset) and flush
   * body/content so the divider grid bleeds edge to edge.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {CardPassThroughOptions}
   */
  protected readonly cardPt: CardPassThroughOptions = {
    root: { class: 'overflow-hidden border border-surface-200 dark:border-surface-800' },
    body: { class: 'p-0' },
    content: { class: 'p-0' },
  };

  //#endregion
}
