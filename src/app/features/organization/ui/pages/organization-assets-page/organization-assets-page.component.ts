import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideClipboardList,
  lucideEllipsis,
  lucideLayoutGrid,
  lucideNetwork,
  lucideSquareArrowOutUpRight,
  lucideWrench,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import type { FacilityOutput } from '@features/organization/features/facilities/models';
import {
  FacilityTreeStore,
  type FacilityTreeStoreType,
} from '@features/organization/features/facilities/state';
import { facilityToTreeNode } from '@features/organization/features/facilities/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationAssetsPaneStore,
  type OrganizationAssetsPaneStoreType,
} from '@features/organization/state/organization-assets-pane';
import { Tree, type TreeNode } from '@shared/tree';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTabsImports } from '@shared/ui/tabs';

/** The explorer's two first-level axes (`organization/FEATURE.md` "Assets"). */
type OrganizationAssetsAxis = 'site' | 'everything';

/**
 * Component OrganizationAssetsPage
 * @class OrganizationAssetsPage
 *
 * @description
 * Route entry page for the estate explorer
 * (`/organizations/:organizationId/assets`): the facility hierarchy on the
 * left (`shared/tree`'s `Tree`, backed by the facilities subfeature's
 * component-scoped `FacilityTreeStore`), and the selected facility's
 * equipment and inspections on the right. The "Everything" tab drops the
 * tree and renders the same two lists unscoped, so an operator holding a
 * serial number and no site can still find it.
 *
 * The right pane is this page's own `OrganizationAssetsPaneStore` rather
 * than the equipments/inspections subfeatures' own stores: it is a
 * read-only preview, not the management surface those subfeatures own, and
 * it reuses their `EquipmentService`/`InspectionService` transport through
 * the public `data-access` barrels instead of duplicating it.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-assets-page',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    Tree,
    HlmBadge,
    HlmButton,
    ...HlmDropdownMenuImports,
    ...HlmEmptyImports,
    ...HlmTableImports,
    ...HlmTabsImports,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideClipboardList,
      lucideEllipsis,
      lucideLayoutGrid,
      lucideNetwork,
      lucideSquareArrowOutUpRight,
      lucideWrench,
    }),
  ],
  templateUrl: './organization-assets-page.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganizationAssetsPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace whose estate is explored, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The site hierarchy. */
  protected readonly tree: FacilityTreeStoreType = inject<FacilityTreeStoreType>(FacilityTreeStore);

  /** The selected (or unscoped) facility's equipment and inspections. */
  protected readonly pane: OrganizationAssetsPaneStoreType =
    inject<OrganizationAssetsPaneStoreType>(OrganizationAssetsPaneStore);

  /** Organization permission checks gating the equipment pane. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Which first-level axis is active. */
  protected readonly axis: WritableSignal<OrganizationAssetsAxis> =
    signal<OrganizationAssetsAxis>('site');

  /** The facility currently scoping the right pane, on the "By site" axis. */
  protected readonly selectedFacilityId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /** The tree roots, mapped onto the shared `Tree` primitive's generic shape. */
  protected readonly treeNodes: Signal<readonly TreeNode<FacilityOutput>[]> = computed(() =>
    this.tree.roots().map(facilityToTreeNode),
  );

  /** Already-loaded branches, mapped onto the shared `Tree` primitive's generic shape. */
  protected readonly childrenByParent: Signal<
    Readonly<Record<string, readonly TreeNode<FacilityOutput>[]>>
  > = computed(() => {
    const result: Record<string, readonly TreeNode<FacilityOutput>[]> = {};
    const entries: ReadonlyArray<[string, readonly FacilityOutput[]]> = Object.entries(
      this.tree.childrenByParent(),
    );
    for (const [parentId, children] of entries) {
      result[parentId] = children.map(facilityToTreeNode);
    }
    return result;
  });

  /** Branches currently being fetched. */
  protected readonly loadingIds: Signal<ReadonlySet<string>> = computed(
    () => new Set(this.tree.expandingParentIds()),
  );

  /** Branches whose last fetch failed. */
  protected readonly failedIds: Signal<ReadonlySet<string>> = computed(
    () => new Set(this.tree.failedParentIds()),
  );

  /** Whether the member may read equipment, gating the equipment pane. */
  protected readonly canReadEquipment: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );

  /** Whether the member may read inspections, gating the inspections pane. */
  protected readonly canReadInspections: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Loads the site roots once, and reloads the right pane whenever the axis,
   * the selected facility, or the organization changes. The "By site" axis
   * with no facility selected loads nothing — the pane's empty state prompts
   * a selection instead.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const organizationId: string = this.organizationId();
      untracked((): void => {
        this.tree.loadRoots(organizationId);
      });
    });

    effect((): void => {
      const organizationId: string = this.organizationId();
      const axis: OrganizationAssetsAxis = this.axis();
      const facilityId: string | null = this.selectedFacilityId();
      const canReadEquipment: boolean = this.canReadEquipment();
      const canReadInspections: boolean = this.canReadInspections();

      untracked((): void => {
        if (axis === 'site' && facilityId === null) return;

        const scope = axis === 'site' && facilityId !== null ? { facilityId } : {};

        if (canReadEquipment) this.pane.loadEquipment({ organizationId, ...scope });
        if (canReadInspections) this.pane.loadInspections({ organizationId, ...scope });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onAxisActivated
   * @description Switches the active axis from the tab bar.
   * @access protected
   * @since 1.0.0
   * @param {string} tab - The activated tab id.
   * @returns {void}
   */
  protected onAxisActivated(tab: string): void {
    this.axis.set(tab === 'everything' ? 'everything' : 'site');
  }

  /**
   * Method onNodeSelected
   * @description Scopes the right pane to the selected facility.
   * @access protected
   * @since 1.0.0
   * @param {TreeNode<FacilityOutput>} node - The selected tree node.
   * @returns {void}
   */
  protected onNodeSelected(node: TreeNode<FacilityOutput>): void {
    this.selectedFacilityId.set(node.id);
  }

  /**
   * Method onExpandRequested
   * @description Loads a node's branch, guarded against a duplicate request.
   * @access protected
   * @since 1.0.0
   * @param {TreeNode<FacilityOutput>} node - The node being expanded.
   * @returns {void}
   */
  protected onExpandRequested(node: TreeNode<FacilityOutput>): void {
    this.tree.ensureChildrenLoaded({ organizationId: this.organizationId(), facilityId: node.id });
  }
  //#endregion
}
