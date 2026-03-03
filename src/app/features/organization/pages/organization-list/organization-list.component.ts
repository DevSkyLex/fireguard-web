import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { OrganizationOutput } from '@core/models/organization';
import { OrganizationTable } from '@features/organization/tables/organization-table';

/**
 * Component OrganizationListPage
 * @class OrganizationListPage
 *
 * @description
 * Page that displays all organizations the authenticated user
 * belongs to. Each card links to the organization's dashboard.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-list',
  imports: [RouterModule, ButtonModule, OrganizationTable],
  templateUrl: './organization-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationListPage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate on table actions.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);
  //#endregion

  //#region Methods
  /**
   * Method onView
   * @method onView
   *
   * @description
   * Navigates to the organization overview page.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {OrganizationOutput} organization - The selected organization.
   *
   * @returns {void}
   */
  public onView(organization: OrganizationOutput): void {
    this.router.navigate(['/organizations', organization.id]);
  }

  /**
   * Method onEdit
   * @method onEdit
   *
   * @description
   * Navigates to the organization edit page.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {OrganizationOutput} organization - The selected organization.
   *
   * @returns {void}
   */
  public onEdit(organization: OrganizationOutput): void {
    this.router.navigate(['/organizations', organization.id, 'edit']);
  }

  /**
   * Method onAdd
   * @method onAdd
   *
   * @description
   * Navigates to the onboarding page to create a new organization.
   *
   * @access public
   * @since 1.4.0
   *
   * @returns {void}
   */
  public onAdd(): void {
    this.router.navigate(['/onboarding']);
  }

  /**
   * Method onDeleteSelected
   * @method onDeleteSelected
   *
   * @description
   * Handles bulk delete of the selected organizations.
   *
   * @access public
   * @since 1.7.0
   *
   * @param {OrganizationOutput[]} organizations - The selected organizations.
   *
   * @returns {void}
   */
  public onDeleteSelected(organizations: OrganizationOutput[]): void {
    // TODO: implement bulk delete via store
    console.warn('Bulk delete requested for', organizations.map((o) => o.id));
  }
  //#endregion
}
