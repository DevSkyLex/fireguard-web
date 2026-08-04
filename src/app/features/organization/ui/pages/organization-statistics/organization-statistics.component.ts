import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OrganizationStatisticsPanel } from '@features/organization/ui/components';
import { PageHeader } from '@shared/page-header';

/**
 * Component OrganizationStatisticsPage
 * @class OrganizationStatisticsPage
 *
 * @description
 * Route entry for the organization's activity statistics: facility, member,
 * equipment, and inspection KPIs and trend charts, split out of the
 * dashboard so the landing page can become a work queue instead.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-statistics',
  imports: [PageHeader, OrganizationStatisticsPanel],
  templateUrl: './organization-statistics.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationStatisticsPage {
  //#region Properties
  //#endregion
}
