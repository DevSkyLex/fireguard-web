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
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import { FacilityStore } from '@features/organization/features/facilities/state';
import {
  FacilityActiveMetric,
  FacilityArchivedMetric,
  FacilitySitesMetric,
  FacilitySubSitesMetric,
} from '@features/organization/features/facilities/ui/components';
import { FacilityDataview } from '@features/organization/features/facilities/ui/dataviews';
import { ActiveOrganizationStore } from '@features/organization/state';

/**
 * Component FacilityListPage
 * @class FacilityListPage
 *
 * @description
 * Page that displays all facilities belonging to the current
 * organization. Each row links to the facility's detail page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-list',
  imports: [
    RouterModule,
    ButtonModule,
    FacilityDataview,
    FacilitySitesMetric,
    FacilityActiveMetric,
    FacilityArchivedMetric,
    FacilitySubSitesMetric,
  ],
  providers: [FacilityStore],
  templateUrl: './facility-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityListPage {
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
   * @since 1.0.0
   *
   * @type {InputSignalWithTransform<number, unknown>}
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
   * @since 1.0.0
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
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Root-scoped store providing the current organization context.
   * Used to obtain the organizationId for API calls.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped FacilityStore that manages the facility list.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly store: FacilityStore = inject<FacilityStore>(FacilityStore);

  //#endregion

  //#region Methods
  /**
   * Method onView
   * @method onView
   *
   * @description
   * Navigates to the facility detail page.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility - The selected facility.
   *
   * @returns {void}
   */
  public onView(facility: FacilityOutput): void {
    this.router.navigate([facility.id], { relativeTo: this.route });
  }

  /**
   * Method onEdit
   * @method onEdit
   *
   * @description
   * Navigates to the facility edit page (placeholder for future implementation).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility - The selected facility.
   *
   * @returns {void}
   */
  public onEdit(facility: FacilityOutput): void {
    this.router.navigate([facility.id, 'edit'], { relativeTo: this.route });
  }

  /**
   * Method onAdd
   * @method onAdd
   *
   * @description
   * Placeholder for creating a new facility (will be implemented in CRUD phase).
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public onAdd(): void {
    this.router.navigate(['create'], { relativeTo: this.route });
  }

  /**
   * Method onArchive
   * @method onArchive
   *
   * @description
   * Archives the selected facility via the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility - The selected facility.
   *
   * @returns {void}
   */
  public onArchive(facility: FacilityOutput): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.archive({ organizationId, facilityId: facility.id });
    }
  }

  /**
   * Method onLoad
   * @method onLoad
   *
   * @description
   * Forwards the dataview lazy-load params to the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {RequestOptions} options - Pagination and filter params.
   *
   * @returns {void}
   */
  public onLoad(options: RequestOptions): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.loadRootFacilities({ organizationId, options });
    }
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
   * @since 1.0.0
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
