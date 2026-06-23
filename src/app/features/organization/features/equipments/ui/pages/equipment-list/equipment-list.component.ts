import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { RequestOptions } from '@core/api';
import { QUOTA_LIMIT_REACHED_TOOLTIP } from '@features/organization/constants';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import {
  EquipmentCommissionedMetric,
  EquipmentCountMetric,
  EquipmentInStockMetric,
  EquipmentMaintenanceMetric,
} from '@features/organization/features/equipments/ui/components';
import { EquipmentTable } from '@features/organization/features/equipments/ui/tables';
import { ORGANIZATION_QUOTA_RESOURCE } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';

/**
 * Component EquipmentListPage
 * @class EquipmentListPage
 *
 * @description
 * Page that displays all equipment belonging to the current
 * organization. Each row links to the equipment's detail page.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-list',
  imports: [
    EquipmentTable,
    EquipmentCountMetric,
    EquipmentCommissionedMetric,
    EquipmentMaintenanceMetric,
    EquipmentInStockMetric,
  ],
  providers: [EquipmentStore],
  templateUrl: './equipment-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentListPage {
  //#region Inputs
  /**
   * Input page
   * @readonly
   *
   * @description
   * Current page number bound from the `?page=` query param.
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
   * @access protected
   * @since 1.0.0
   *
   * @type {EquipmentStore}
   */
  protected readonly store: EquipmentStore = inject<EquipmentStore>(EquipmentStore);

  /** Root-provided quota store exposing whether the equipment limit is reached. */
  private readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

  /** Whether equipment creation is blocked by the current plan limit. */
  protected readonly atEquipmentLimit: Signal<boolean> = computed<boolean>(() =>
    this.quotaStore.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.EQUIPMENT),
  );

  /** Tooltip explaining why equipment creation is disabled. */
  protected readonly quotaLimitTooltip: string = QUOTA_LIMIT_REACHED_TOOLTIP;

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the initial page of equipment.
   *
   * @since 1.0.0
   */

  //#endregion

  //#region Methods
  /**
   * Method onAdd
   * @method onAdd
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
   * Navigates to the selected equipment detail page.
   */
  public onView(equipmentId: string): void {
    this.router.navigate([equipmentId], { relativeTo: this.route });
  }

  /**
   * Method onLoad
   * @method onLoad
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
      this.store.load({ organizationId, options });
    }
  }

  /**
   * Method onPageChange
   * @method onPageChange
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
