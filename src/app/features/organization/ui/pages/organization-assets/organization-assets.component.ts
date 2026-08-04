import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import type { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import {
  TreeModule,
  type TreeNodeExpandEvent,
  type TreeNodeSelectEvent,
  type TreePassThroughOptions,
} from 'primeng/tree';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  FacilityTreeStore,
  type FacilityTreeStoreType,
} from '@features/organization/features/facilities/state';
import {
  FacilityEquipmentTab,
  FacilityInspectionTab,
} from '@features/organization/features/facilities/ui/components';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { PageHeader } from '@shared/page-header';

/**
 * Component OrganizationAssetsPage
 * @class OrganizationAssetsPage
 *
 * @description
 * The organization's estate, browsed rather than catalogued.
 *
 * `PRODUCT.md` claims one business chain and one workspace: sites, equipment
 * and inspections are links in a chain, not three independent tools. Two
 * navigation entries presented them as exactly that. This page takes the claim
 * at its word — the site hierarchy on the left, what the selected site holds on
 * the right.
 *
 * Nothing here is a new endpoint. The tree is the roots-then-children pair the
 * API already exposes; the panes are the very tab components the facility
 * record already uses, put back into a browsing context.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-assets',
  templateUrl: './organization-assets.component.html',
  imports: [
    ButtonModule,
    TabsModule,
    TreeModule,
    PageHeader,
    EmptyState,
    ErrorState,
    FacilityEquipmentTab,
    FacilityInspectionTab,
  ],
  providers: [FacilityTreeStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAssetsPage {
  //#region Properties
  /**
   * Property tree
   * @readonly
   *
   * @description
   * Component-scoped store owning the lazily loaded site hierarchy.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityTreeStoreType}
   */
  protected readonly tree: FacilityTreeStoreType = inject<FacilityTreeStoreType>(FacilityTreeStore);

  /**
   * Property activeOrganizationStore
   * @readonly
   *
   * @description
   * Source of the organization the estate belongs to.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActiveOrganizationStore}
   */
  private readonly activeOrganizationStore: ActiveOrganizationStore =
    inject<ActiveOrganizationStore>(ActiveOrganizationStore);

  /**
   * Property organizationPermissionService
   * @readonly
   *
   * @description
   * Organization-owned helper exposing reactive permission checks.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {OrganizationPermissionService}
   */
  private readonly organizationPermissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Router used to open a site's own record.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property selected
   * @readonly
   *
   * @description
   * The site whose contents fill the right pane, or null while none is chosen.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<FacilityOutput | null>}
   */
  protected readonly selected: WritableSignal<FacilityOutput | null> =
    signal<FacilityOutput | null>(null);

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Identifier of the active organization, undefined until it resolves.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | undefined>}
   */
  protected readonly organizationId: Signal<string | undefined> = computed<string | undefined>(
    () => this.activeOrganizationStore.selectedOrganizationId() ?? undefined,
  );

  /**
   * Property canReadEquipment
   * @readonly
   *
   * @description
   * Whether the equipment pane may be offered.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadEquipment: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );

  /**
   * Property canReadInspections
   * @readonly
   *
   * @description
   * Whether the inspection pane may be offered.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInspections: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
  );

  /**
   * Property nodes
   * @readonly
   *
   * @description
   * The hierarchy as PrimeNG's tree wants it.
   *
   * Deliberately a writable signal patched in place rather than a `computed`
   * that rebuilds. PrimeNG mutates `node.expanded` on the very object instance
   * it holds; a computed that returns fresh objects on every branch load threw
   * that away, so the first expansion of any branch fetched its children and
   * then rendered collapsed anyway — and, because the row's DOM was recreated,
   * dropped keyboard focus to the document body. Keeping node identity stable
   * fixes both.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<TreeNode<FacilityOutput>[]>}
   */
  protected readonly nodes: WritableSignal<TreeNode<FacilityOutput>[]> = signal<
    TreeNode<FacilityOutput>[]
  >([]);

  /**
   * Property nodesById
   *
   * @description
   * Every node currently in the tree, so a resolved branch can be attached to
   * its parent without walking the hierarchy.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Map<string, TreeNode<FacilityOutput>>}
   */
  private readonly nodesById = new Map<string, TreeNode<FacilityOutput>>();

  /**
   * Property treePt
   * @readonly
   *
   * @description
   * Raises the tree's row and toggle to the application's 44px touch floor on
   * small screens. PrimeNG's own 36px row and 28px toggle are comfortable with
   * a pointer and below the floor for a thumb.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {TreePassThroughOptions}
   */
  protected readonly treePt: TreePassThroughOptions = {
    nodeContent: { class: 'max-sm:min-h-11' },
    nodeToggleButton: { class: 'max-sm:size-11' },
  };

  /**
   * Property isEmpty
   * @readonly
   *
   * @description
   * Whether the organization has no site at all — a first-run state, not a
   * failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isEmpty: Signal<boolean> = computed<boolean>(
    () =>
      !this.tree.isLoadingRoots() && !this.tree.hasRootsError() && this.tree.roots().length === 0,
  );
  //#endregion

  //#region Lifecycle
  /**
   * Method constructor
   *
   * @description
   * Loads the roots for the active organization. The load runs inside
   * `untracked` so re-entering depends on the organization alone, never on the
   * state the load writes.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string | undefined = this.organizationId();
      if (!organizationId) return;

      untracked((): void => {
        this.selected.set(null);
        this.nodesById.clear();
        this.nodes.set([]);
        this.tree.loadRoots(organizationId);
      });
    });

    effect((): void => {
      const roots: readonly FacilityOutput[] = this.tree.roots();

      untracked((): void => {
        if (this.nodes().length === 0 && roots.length > 0) {
          this.nodes.set(roots.map((facility) => this.nodeFor(facility)));
        }
      });
    });

    effect((): void => {
      const childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>> =
        this.tree.childrenByParent();

      untracked((): void => this.attachBranches(childrenByParent));
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onNodeExpand
   *
   * @description
   * Fetches a branch the first time its node is opened, and never again.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TreeNodeExpandEvent} event - Expansion emitted by the tree.
   * @returns {void}
   */
  protected onNodeExpand(event: TreeNodeExpandEvent): void {
    const facility: FacilityOutput | undefined = event.node.data;
    const organizationId: string | undefined = this.organizationId();

    if (!facility || !organizationId) return;
    if (this.tree.hasLoadedChildren(facility.id)) return;

    this.tree.loadChildren({ organizationId, facilityId: facility.id });
  }

  /**
   * Method nodeFor
   *
   * @description
   * Builds one tree node and registers it, so a branch resolving later can be
   * attached to the same object PrimeNG is holding.
   *
   * `expanded` starts explicitly `false` rather than absent: the tree only
   * renders `aria-expanded` on a node whose state it knows, and a branch the
   * operator has not opened yet must still announce that it can be.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility - Site the node stands for.
   * @returns {TreeNode<FacilityOutput>} The registered node.
   */
  private nodeFor(facility: FacilityOutput): TreeNode<FacilityOutput> {
    const node: TreeNode<FacilityOutput> = {
      key: facility.id,
      label: facility.name,
      data: facility,
      icon: 'pi pi-map-marker',
      // No child count on the collection, so the arrow is offered until a
      // fetched branch proves the node is a leaf.
      leaf: false,
      expanded: false,
    };

    this.nodesById.set(facility.id, node);

    return node;
  }

  /**
   * Method attachBranches
   *
   * @description
   * Hangs every resolved branch off the node that asked for it, mutating that
   * node rather than replacing it. A new array reference is then published so
   * change detection runs while every node keeps its identity — and with it its
   * expansion state and its focused DOM row.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {Readonly<Record<string, readonly FacilityOutput[]>>} childrenByParent - Branches fetched so far.
   * @returns {void}
   */
  private attachBranches(
    childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>>,
  ): void {
    let attached = false;

    for (const [parentId, children] of Object.entries(childrenByParent)) {
      const parent: TreeNode<FacilityOutput> | undefined = this.nodesById.get(parentId);
      if (!parent || parent.children) continue;

      parent.children = children.map((facility) => this.nodeFor(facility));
      parent.leaf = children.length === 0;
      attached = true;
    }

    if (attached) this.nodes.set([...this.nodes()]);
  }

  /**
   * Method onNodeSelect
   *
   * @description
   * Fills the right pane with the chosen site's contents.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TreeNodeSelectEvent} event - Selection emitted by the tree.
   * @returns {void}
   */
  protected onNodeSelect(event: TreeNodeSelectEvent): void {
    this.selected.set(event.node.data ?? null);
  }

  /**
   * Method openFacility
   *
   * @description
   * Opens the selected site's own record, where it can be edited.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected openFacility(): void {
    const organizationId: string | undefined = this.organizationId();
    const facility: FacilityOutput | null = this.selected();

    if (!organizationId || !facility) return;

    void this.router.navigate(['/organizations', organizationId, 'facilities', facility.id]);
  }

  /**
   * Method createFacility
   *
   * @description
   * Opens the site creation form.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected createFacility(): void {
    const organizationId: string | undefined = this.organizationId();
    if (!organizationId) return;

    void this.router.navigate(['/organizations', organizationId, 'facilities', 'create']);
  }

  /**
   * Method retryRoots
   *
   * @description
   * Re-runs the roots query after a failure.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryRoots(): void {
    this.tree.loadRoots(this.organizationId());
  }
  //#endregion
}
