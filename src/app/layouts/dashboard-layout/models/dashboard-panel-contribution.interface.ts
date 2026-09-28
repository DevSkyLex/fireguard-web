import type { Signal } from '@angular/core';
import type { ExclusiveSlotContribution } from '@shared/layout-slot';

/**
 * Interface DashboardPanelContribution
 * @interface DashboardPanelContribution
 *
 * @description A labeled, exclusive contribution to the dashboard's right column.
 * @since 1.0.0
 */
export interface DashboardPanelContribution extends ExclusiveSlotContribution {
  /**
   * Property label
   * @readonly
   * @description Accessible name of the complementary region; a signal supports page-owned labels.
   * @access public
   * @since 1.0.0
   * @type {string | Signal<string>}
   */
  readonly label: string | Signal<string>;
}
