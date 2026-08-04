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
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import type { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TabsModule } from 'primeng/tabs';
import {
  TreeModule,
  type TreeNodeCollapseEvent,
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
  AssetEquipmentTab,
  AssetInspectionTab,
} from '@features/organization/features/facilities/ui/components';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { ActiveOrganizationStore } from '@features/organization/state';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { PageHeader } from '@shared/page-header';

/**
 * Type AssetExplorerAxis
 *
 * @description
 * The two ways into the estate: down the site hierarchy, or flat across the
 * whole organization.
 *
 * @since 1.1.0
 */
type AssetExplorerAxis = 'hierarchy' | 'flat';

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
    FormsModule,
    SelectButtonModule,
    TabsModule,
    TreeModule,
    PageHeader,
    EmptyState,
    ErrorState,
    AssetEquipmentTab,
    AssetInspectionTab,
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
   * Property axis
   * @readonly
   *
   * @description
   * Which of the two ways into the estate is open: down the site hierarchy, or
   * flat across the whole organization.
   *
   * Two first-level axes rather than a tree with a search box tucked inside it.
   * Merging the two former navigation entries put a real risk on the table —
   * the operator who knows a serial number and not a site — and the answer is
   * that searching everything is not a fallback, it is the other half of the
   * destination.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {WritableSignal<AssetExplorerAxis>}
   */
  protected readonly axis: WritableSignal<AssetExplorerAxis> =
    signal<AssetExplorerAxis>('hierarchy');

  /**
   * Property axisOptions
   * @readonly
   *
   * @description
   * The two axes, as the segmented control renders them.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {{ label: string; value: AssetExplorerAxis; icon: string }[]}
   */
  protected readonly axisOptions: { label: string; value: AssetExplorerAxis; icon: string }[] = [
    {
      label: $localize`:@@org.assets.axisHierarchy:By site`,
      value: 'hierarchy',
      icon: 'pi pi-sitemap',
    },
    {
      label: $localize`:@@org.assets.axisFlat:Everything`,
      value: 'flat',
      icon: 'pi pi-list',
    },
  ];

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
   * Property expandedKeys
   * @readonly
   *
   * @description
   * Identifiers of the branches the operator has opened.
   *
   * Expansion is tracked here rather than left on the node objects, because the
   * tree is rebuilt whenever a branch resolves and would otherwise forget which
   * branches were open.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  private readonly expandedKeys: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Property nodes
   * @readonly
   *
   * @description
   * The hierarchy as PrimeNG's tree wants it, rebuilt whenever a branch
   * resolves or a node opens.
   *
   * Rebuilding matters: PrimeNG renders each row through an `OnPush`
   * component that receives its node by reference, so attaching children to an
   * existing node object never marks that row dirty and the branch stays
   * visually empty however many times it is clicked. New objects are what make
   * the children appear — and `expanded`, replayed from
   * {@link expandedKeys}, is what keeps the branch open across the rebuild.
   *
   * `leaf` stays false until a fetched branch proves otherwise: the collection
   * carries no child count, so the arrow has to be offered before the answer is
   * known, and an empty branch simply opens onto nothing.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {Signal<TreeNode<FacilityOutput>[]>}
   */
  protected readonly nodes: Signal<TreeNode<FacilityOutput>[]> = computed<
    TreeNode<FacilityOutput>[]
  >(() => {
    const childrenByParent: Readonly<Record<string, readonly FacilityOutput[]>> =
      this.tree.childrenByParent();
    const expanded: ReadonlySet<string> = this.expandedKeys();

    const toNode = (facility: FacilityOutput): TreeNode<FacilityOutput> => {
      const children: readonly FacilityOutput[] | undefined = childrenByParent[facility.id];

      return {
        key: facility.id,
        label: facility.name,
        data: facility,
        icon: 'pi pi-map-marker',
        leaf: children ? children.length === 0 : false,
        expanded: expanded.has(facility.id),
        children: children?.map(toNode),
      };
    };

    return this.tree.roots().map(toNode);
  });

  /**
   * Property trackNode
   * @readonly
   *
   * @description
   * Identifies a tree row by its site rather than by object identity.
   *
   * PrimeNG tracks nodes by reference by default, and this page rebuilds every
   * node whenever a branch resolves — which is what makes the children appear
   * at all. Without a key, that rebuild reads as "every row changed": Angular
   * destroys and recreates the whole subtree, taking the focused row with it
   * and dropping keyboard focus to the document body.
   *
   * @access protected
   * @since 1.2.0
   *
   * @type {(index: number, node: TreeNode<FacilityOutput>) => string}
   */
  protected readonly trackNode = (_index: number, node: TreeNode<FacilityOutput>): string =>
    node.key ?? '';

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
      this.axis() === 'hierarchy' &&
      !this.tree.isLoadingRoots() &&
      !this.tree.hasRootsError() &&
      this.tree.roots().length === 0,
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
        this.expandedKeys.set(new Set<string>());
        this.tree.loadRoots(organizationId);
      });
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

    this.expandedKeys.set(new Set<string>([...this.expandedKeys(), facility.id]));

    if (this.tree.hasLoadedChildren(facility.id)) return;

    this.tree.loadChildren({ organizationId, facilityId: facility.id });
  }

  /**
   * Method onNodeCollapse
   *
   * @description
   * Forgets a branch's expansion, keeping its already-fetched children: closing
   * a node is a navigation gesture, not a reason to ask the server again.
   *
   * @access protected
   * @since 1.2.0
   *
   * @param {TreeNodeCollapseEvent} event - Collapse emitted by the tree.
   * @returns {void}
   */
  protected onNodeCollapse(event: TreeNodeCollapseEvent): void {
    const facility: FacilityOutput | undefined = event.node.data;
    if (!facility) return;

    const next = new Set<string>(this.expandedKeys());
    next.delete(facility.id);
    this.expandedKeys.set(next);
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
