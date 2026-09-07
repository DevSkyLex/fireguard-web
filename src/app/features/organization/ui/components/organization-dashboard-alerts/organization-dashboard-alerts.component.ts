import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, type InputSignal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBellRing,
  lucideOctagonAlert,
  lucideTriangleAlert,
  lucideMailWarning,
  lucideWrench,
  lucideChevronRight,
  lucideCircleCheck,
} from '@ng-icons/lucide';
import { HlmCardImports } from '@shared/ui/card';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmItemImports } from '@shared/ui/item';
import { HlmSkeleton } from '@shared/ui/skeleton';
import type { OrganizationDashboardAlertRow } from './models/organization-dashboard-alert-row.interface';
/**
 * Component OrganizationDashboardAlerts
 * @class OrganizationDashboardAlerts
 * @description Ordered backend attention items. Rows never sum overlapping populations or invent deep filters.
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-dashboard-alerts',
  imports: [
    DecimalPipe,
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    HlmSkeleton,
    ...HlmItemImports,
    ...HlmCardImports,
    ...HlmEmptyImports,
  ],
  providers: [
    provideIcons({
      lucideBellRing,
      lucideOctagonAlert,
      lucideTriangleAlert,
      lucideMailWarning,
      lucideWrench,
      lucideChevronRight,
      lucideCircleCheck,
    }),
  ],
  templateUrl: './organization-dashboard-alerts.component.html',
  host: { class: 'block min-w-0 h-full' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationDashboardAlerts {
  /**
   * Property rows
   * @readonly
   * @description Alerts from a loaded aggregate, or null when unavailable.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<readonly OrganizationDashboardAlertRow[] | null>}
   */
  public readonly rows: InputSignal<readonly OrganizationDashboardAlertRow[] | null> =
    input.required<readonly OrganizationDashboardAlertRow[] | null>();

  /**
   * Property loading
   * @readonly
   * @description Initial loading state.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<boolean>}
   */
  public readonly loading: InputSignal<boolean> = input(false);
}
