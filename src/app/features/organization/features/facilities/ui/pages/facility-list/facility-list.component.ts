import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  numberAttribute,
  type InputSignal,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { SelectButtonModule } from 'primeng/selectbutton';
import type { RequestOptions } from '@core/api';
import { OrganizationPermissionService } from '@features/organization/access';
import { QUOTA_LIMIT_REACHED_TOOLTIP } from '@features/organization/constants';
import type {
  FacilityListView,
  FacilityOutput,
  FacilityTreeNode,
} from '@features/organization/features/facilities/models';
import {
  FacilityStore,
  FacilityTreeStore,
  type FacilityTreeStoreType,
} from '@features/organization/features/facilities/state';
import {
  FacilityTable,
  FacilityTreeTable,
} from '@features/organization/features/facilities/ui/tables';
import {
  ORGANIZATION_PERMISSION,
  ORGANIZATION_QUOTA_RESOURCE,
} from '@features/organization/models';
import { ActiveOrganizationStore, OrganizationQuotaStore } from '@features/organization/state';
import {
  summariseFacilityTree,
  type FacilityTreeSummary,
} from './utils/facility-tree-summary.utils';

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
    MessageModule,
    SelectButtonModule,
    FormsModule,
    FacilityTable,
    FacilityTreeTable,
  ],
  providers: [FacilityStore, FacilityTreeStore],
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
  /**
   * Input view
   * @readonly
   *
   * @description
   * Which surface to render, bound from the `?view=` query param. `'list'` is
   * the default: it is paginated and needs only `facilities.read`, while the
   * hierarchy loads every node at once and needs `compliance.read`.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<FacilityListView>}
   */
  public readonly view: InputSignal<FacilityListView> = input<FacilityListView>('list');
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

  /**
   * Property treeStore
   * @readonly
   *
   * @description
   * Component-scoped store for the hierarchy surface.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {FacilityTreeStoreType}
   */
  protected readonly treeStore: FacilityTreeStoreType =
    inject<FacilityTreeStoreType>(FacilityTreeStore);

  /**
   * Property permissionService
   * @readonly
   *
   * @access private
   * @since 2.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property canViewTree
   * @readonly
   *
   * @description
   * The hierarchy endpoint is owned by the backend's Compliance module and
   * gated on `compliance.read`, which a member holding only `facilities.read`
   * does not have.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canViewTree: Signal<boolean> = computed((): boolean =>
    this.permissionService.hasPermission(ORGANIZATION_PERMISSION.COMPLIANCE_READ),
  );

  /**
   * Property activeView
   * @readonly
   *
   * @description
   * The surface actually rendered. A `?view=tree` URL from a member without
   * `compliance.read` falls back to the list rather than showing a 403 — the
   * link is shareable and the reader may not hold the same permissions.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<FacilityListView>}
   */
  protected readonly activeView: Signal<FacilityListView> = computed(
    (): FacilityListView => (this.view() === 'tree' && this.canViewTree() ? 'tree' : 'list'),
  );

  /**
   * Property treeSummary
   * @readonly
   *
   * @description
   * Estate totals shown above the hierarchy. The tree answers "how is this
   * site doing"; nothing answered "how is the estate doing" without expanding
   * every branch and adding it up by hand.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<FacilityTreeSummary>}
   */
  protected readonly treeSummary: Signal<FacilityTreeSummary> = computed(
    (): FacilityTreeSummary => summariseFacilityTree(this.treeStore.nodes()),
  );

  /**
   * Property treeLoadTarget
   * @readonly
   *
   * @description
   * The organization whose hierarchy should be loaded, or `null` while the
   * hierarchy is not on screen — so entering the page on the list costs no
   * extra request.
   *
   * Fed straight into `rxMethod` rather than an `effect`: the store writes its
   * own query state, and a tracked effect that reads it back would re-trigger
   * itself.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Signal<string | null>}
   */
  private readonly treeLoadTarget: Signal<string | null> = computed((): string | null =>
    this.activeView() === 'tree'
      ? (this.activeOrganizationStore.selectedOrganization()?.id ?? null)
      : null,
  );

  /**
   * Property viewOptions
   * @readonly
   *
   * @description
   * Surface switcher entries.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Array<{ label: string; value: FacilityListView; icon: string }>}
   */
  protected readonly viewOptions: Array<{
    label: string;
    value: FacilityListView;
    icon: string;
  }> = [
    { label: $localize`:@@facility.view.list:List`, value: 'list', icon: 'pi pi-list' },
    { label: $localize`:@@facility.view.tree:Hierarchy`, value: 'tree', icon: 'pi pi-sitemap' },
  ];

  /**
   * Property quotaStore
   * @readonly
   *
   * @description
   * Root-provided quota store exposing whether the facilities limit is reached.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationQuotaStore}
   */
  private readonly quotaStore: OrganizationQuotaStore =
    inject<OrganizationQuotaStore>(OrganizationQuotaStore);

  /** Whether facility creation is blocked by the current plan limit. */
  protected readonly atFacilityLimit: Signal<boolean> = computed<boolean>(() =>
    this.quotaStore.isAtLimit(ORGANIZATION_QUOTA_RESOURCE.FACILITIES),
  );

  /** Tooltip explaining why facility creation is disabled. */
  protected readonly quotaLimitTooltip: string = QUOTA_LIMIT_REACHED_TOOLTIP;

  /**
   * Property lastLoadOptions
   *
   * @description
   * Pagination and filter params from the most recent dataview lazy-load,
   * retained so {@link retry} can re-dispatch the same root-facility page
   * after a failed load.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {RequestOptions | undefined}
   */
  private lastLoadOptions: RequestOptions | undefined;

  //#endregion

  //#region Lifecycle
  /**
   * Wires the hierarchy query to {@link treeLoadTarget}: it runs when the user
   * switches to the tree and stays idle otherwise.
   *
   * @since 2.0.0
   */
  public constructor() {
    this.treeStore.load(this.treeLoadTarget);
  }
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
   * Restores an archived facility via the store.
   */
  public onRestore(facility: FacilityOutput): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.restore({ organizationId, facilityId: facility.id });
    }
  }

  /**
   * Method onBulkArchive
   * @method onBulkArchive
   *
   * @description
   * Archives the selected facilities via the store.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {readonly FacilityOutput[]} facilities - Selected facilities.
   *
   * @returns {void}
   */
  public onBulkArchive(facilities: readonly FacilityOutput[]): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;

    if (!organizationId) {
      return;
    }

    for (const facility of facilities) {
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
    this.lastLoadOptions = options;
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.loadRootFacilities({ organizationId, options });
    }
  }

  /**
   * Method retry
   * @method retry
   *
   * @description
   * Re-dispatches the root-facility load for the active organization using the
   * most recent lazy-load params after a failed load (the error banner's Retry
   * action).
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {void}
   */
  public retry(): void {
    const organizationId: string | undefined =
      this.activeOrganizationStore.selectedOrganization()?.id;
    if (organizationId) {
      this.store.loadRootFacilities({ organizationId, options: this.lastLoadOptions });
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

  /**
   * Method onViewChange
   * @method onViewChange
   *
   * @description
   * Switches surface through the `?view=` query param. `?page=` is dropped on
   * the way into the hierarchy — it has no paginator, and a stale page cursor
   * would reappear on the way back out.
   *
   * @access public
   * @since 2.0.0
   *
   * @param {FacilityListView} view - The surface to show.
   *
   * @returns {void}
   */
  public onViewChange(view: FacilityListView): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { view: view === 'list' ? null : view, page: null },
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Method onViewTreeNode
   * @method onViewTreeNode
   *
   * @description
   * Opens a facility picked from the hierarchy.
   *
   * @access public
   * @since 2.0.0
   *
   * @param {FacilityTreeNode} node - The selected node.
   *
   * @returns {void}
   */
  public onViewTreeNode(node: FacilityTreeNode): void {
    this.router.navigate([node.id], { relativeTo: this.route });
  }

  /**
   * Method reloadTree
   * @method reloadTree
   *
   * @description
   * Re-runs the hierarchy query after a failure.
   *
   * @access public
   * @since 2.0.0
   *
   * @returns {void}
   */
  public reloadTree(): void {
    this.treeStore.load(this.activeOrganizationStore.selectedOrganization()?.id ?? null);
  }
  //#endregion
}
