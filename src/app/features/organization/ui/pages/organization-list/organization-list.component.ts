import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  numberAttribute,
  type InputSignalWithTransform,
} from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import type { RequestOptions } from '@core/services/hydra-api';
import type { OrganizationOutput } from '@features/organization/models';
import { OrganizationStore } from '@features/organization/state';
import {
  OrganizationActiveMetric,
  OrganizationCountMetric,
  OrganizationMembersMetric,
} from '@features/organization/ui/components';
import { OrganizationDataview } from '@features/organization/ui/dataviews';

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
  imports: [
    RouterModule,
    ButtonModule,
    OrganizationDataview,
    OrganizationCountMetric,
    OrganizationActiveMetric,
    OrganizationMembersMetric,
  ],
  providers: [OrganizationStore],
  templateUrl: './organization-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationListPage {
  //#region Inputs
  /**
   * Input page
   * @readonly
   *
   * @description
   * Current page number bound from the `?page=` query param via
   * `withComponentInputBinding`. Passed down to the dataview as
   * `initialPage` so the paginator opens on the correct page.
   * Defaults to 1.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<number>}
   */
  public readonly page: InputSignalWithTransform<number, unknown> = input<number, unknown>(1, {
    transform: (v: unknown): number => Math.max(1, numberAttribute(v, 1)),
  });
  //#endregion

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
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current activated route, used to update the `?page=` query
   * param while preserving other query params.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped OrganizationStore that manages the organization list.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationStore}
   */
  protected readonly store: OrganizationStore = inject<OrganizationStore>(OrganizationStore);

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
   * Method onLoad
   * @method onLoad
   *
   * @description
   * Forwards the dataview lazy-load params to the store.
   *
   * @access public
   * @since 2.0.0
   *
   * @param {RequestOptions} options - Pagination and filter params.
   *
   * @returns {void}
   */
  public onLoad(options: RequestOptions): void {
    this.store.loadOrganizations(options);
  }

  /**
   * Method onPageChange
   * @method onPageChange
   *
   * @description
   * Updates the `?page=` query param in the URL when the user
   * navigates to a different page in the dataview. Page 1 is
   * omitted from the URL to keep the default URL clean.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {number} page - The new 1-indexed page number.
   *
   * @returns {void}
   */
  public onPageChange(page: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }
  //#endregion
}
