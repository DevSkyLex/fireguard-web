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
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import type { RequestOptions } from '@core/api';
import { QUOTA_LIMIT_REACHED_TOOLTIP } from '@features/organization/constants';
import type { InspectionOutput } from '@features/organization/features/inspections/models';
import { InspectionStore } from '@features/organization/features/inspections/state';
import { InspectionTable } from '@features/organization/features/inspections/ui/tables';
import { ORGANIZATION_QUOTA_RESOURCE } from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';

/**
 * Component InspectionListPage
 * @class InspectionListPage
 *
 * @description
 * Page that displays all inspections belonging to the current
 * organization. Supports pagination.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-list',
  imports: [InspectionTable, ButtonModule, MessageModule],
  providers: [InspectionStore],
  templateUrl: './inspection-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionListPage {
  //#region Inputs
  /**
   * Input page
   * @readonly
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
   * PrimeNG confirmation service used before cancelling a draft inspection.
   */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);

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
   * @type {InspectionStore}
   */
  protected readonly store: InspectionStore = inject<InspectionStore>(InspectionStore);

  /** Root-provided quota store exposing whether the inspections limit is reached. */
  private readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

  /** Whether inspection creation is blocked by the current plan limit. */
  protected readonly atInspectionLimit: Signal<boolean> = computed<boolean>(() =>
    this.quotaStore.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.INSPECTIONS),
  );

  /** Tooltip explaining why inspection creation is disabled. */
  protected readonly quotaLimitTooltip: string = QUOTA_LIMIT_REACHED_TOOLTIP;

  /**
   * Property lastLoadOptions
   * @readonly
   *
   * @description
   * Most recent pagination and filter params requested by the table, retained
   * so the error banner's Retry action can replay the same load.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {RequestOptions}
   */
  private lastLoadOptions: RequestOptions = {};

  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the initial page of inspections.
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
   * Navigates to the selected inspection detail page.
   */
  public onView(inspectionId: string): void {
    this.router.navigate([inspectionId], { relativeTo: this.route });
  }

  /**
   * Confirms and cancels a selected draft inspection.
   */
  public onCancel(inspection: InspectionOutput): void {
    if (inspection.status !== 'draft') return;

    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (!organizationId) return;

    this.confirmationService.confirm({
      header: $localize`:@@inspection.cancel.header:Cancel inspection`,
      message: $localize`:@@inspection.cancel.message:Cancel this draft inspection?`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: {
        label: $localize`:@@inspection.cancel.accept:Cancel inspection`,
        severity: 'danger',
      },
      rejectButtonProps: {
        label: $localize`:@@inspection.cancel.reject:Keep draft`,
        severity: 'secondary',
        outlined: true,
      },
      accept: () => this.store.cancel({ organizationId, inspectionId: inspection.id }),
    });
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
    this.lastLoadOptions = options;
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.load({ organizationId, options });
    }
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Replays the last inspection list load for the current organization after a
   * failed fetch (the error banner's Retry action).
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected retry(): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.load({ organizationId, options: this.lastLoadOptions });
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
