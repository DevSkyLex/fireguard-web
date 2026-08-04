import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import type { RequestOptions } from '@core/api';
import { isCallError } from '@core/request-state';
import { EquipmentStore } from '@features/organization/features/equipments/state';
import { EquipmentTable } from '@features/organization/features/equipments/ui/tables';
import {
  ORGANIZATION_QUOTA_RESOURCE,
  type OrganizationQuotaResource,
} from '@features/organization/models';
import { OrganizationQuotaStore } from '@features/organization/state';
import { OrganizationQuotaUpgradeDialog } from '@features/organization/ui/dialogs';
import { ErrorBanner } from '@shared/error-state';

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
  imports: [EquipmentTable, ErrorBanner, OrganizationQuotaUpgradeDialog],
  providers: [EquipmentStore],
  templateUrl: './equipment-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentListPage {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization, bound from `:organizationId` by the router. The
   * parameter — not the store — is the source of truth: a page rendered under
   * this segment is, by construction, scoped to that organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

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

  /**
   * Property quotaDialogVisible
   * @readonly
   *
   * @description
   * Whether the plan-limit dialog is open. The list used to disable its create
   * control and explain the cap in a tooltip, with no way forward from there.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly quotaDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property quotaResource
   * @readonly
   *
   * @description
   * Resource the dialog names.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {OrganizationQuotaResource}
   */
  protected readonly quotaResource: OrganizationQuotaResource =
    ORGANIZATION_QUOTA_RESOURCE.EQUIPMENT;

  /**
   * Property quotaSubscriptionLink
   * @readonly
   *
   * @description
   * Where the dialog sends an operator who wants a larger plan.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<readonly string[]>}
   */
  protected readonly quotaSubscriptionLink: Signal<readonly string[]> = computed<readonly string[]>(
    () => {
      const organizationId: string | null = this.organizationId();

      return organizationId ? ['/organizations', organizationId, 'settings'] : ['/organizations'];
    },
  );

  /** Localized message shown in the load-error banner for the equipment list. */
  protected readonly listErrorMessage: string = $localize`:@@equipment.list.errorText:The equipment could not be loaded. Check your connection and try again.`;

  /**
   * Property hasListError
   * @readonly
   *
   * @description
   * True when the last equipment list load failed, derived from the store's
   * `listCallState`. Drives the page-level error/offline banner.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly hasListError: Signal<boolean> = computed<boolean>(() =>
    isCallError(this.store.listCallState()),
  );

  /**
   * Property lastLoadOptions
   *
   * @description
   * Most recent lazy-load options emitted by the table, replayed by
   * {@link retry} so a failed load retries the exact same page, filters, and
   * sort.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {RequestOptions | undefined}
   */
  private lastLoadOptions: RequestOptions | undefined = undefined;

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
    // At the cap the control stops being a dead end and becomes the way out:
    // the same upgrade dialog the create page shows on a 409, reached before
    // the operator fills a form that cannot be submitted.
    if (this.atEquipmentLimit()) {
      this.quotaStore.reload();
      this.quotaDialogVisible.set(true);

      return;
    }

    void this.router.navigate(['create'], { relativeTo: this.route });
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
    this.lastLoadOptions = options;
    this.store.load({ organizationId: this.organizationId(), options });
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-dispatches the equipment list load with the active organization and the
   * most recent request options after a failed load (the error banner's Retry
   * action).
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {void}
   */
  public retry(): void {
    this.store.load({ organizationId: this.organizationId(), options: this.lastLoadOptions });
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
