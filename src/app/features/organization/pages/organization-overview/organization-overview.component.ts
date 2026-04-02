import { ChangeDetectionStrategy, Component } from '@angular/core';
import { OrganizationDashboard } from '@features/organization/components';

/**
 * Component OrganizationOverviewPage
 * @class OrganizationOverviewPage
 *
 * @description
 * Page that displays an overview of the organization, including its name,
 * description, creation date, and other relevant information. It also
 * provides links to the organization's settings and members management.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-overview',
  imports: [OrganizationDashboard],
  templateUrl: './organization-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationOverviewPage {
  //#region Properties
  //#endregion
}
