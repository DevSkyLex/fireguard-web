import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { OrganizationOutput } from '@core/models/organization';
import { OrganizationDataview } from '@features/organization/dataviews/organization-dataview';

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
  imports: [RouterModule, ButtonModule, OrganizationDataview],
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
   * Method onDelete
   * @method onDelete
   *
   * @description
   * No action is needed here since deletion is
   * handled within the table component.
   *
   * @access public
   * @since 1.2.0
   *
   * @param {OrganizationOutput} organization - The selected organization.
   *
   * @returns {void} No return value.
   */
  public onDelete(organization: OrganizationOutput): void {
    // The table's OrganizationStore handles the HTTP call and list update.
    // Hook here for post-deletion navigation or notifications if needed.
  }

  /**
   * Method onDeleteMany
   * @method onDeleteMany
   *
   * @description
   * Called after the table has dispatched a bulk-delete request to its
   * store. Hook here for post-deletion navigation or notifications.
   *
   * @access public
   * @since 1.8.0
   *
   * @param {OrganizationOutput[]} organizations - The deleted organizations.
   *
   * @returns {void}
   */
  public onDeleteMany(organizations: OrganizationOutput[]): void {
    // The table's OrganizationStore handles the HTTP call and list update.
    // Hook here for post-deletion navigation or notifications if needed.
  }
  //#endregion
}
