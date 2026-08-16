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
  lucideMove,
  lucideNetwork,
  lucideSquareArrowOutUpRight,
  lucideWrench,
} from '@ng-icons/lucide';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityMoveRequest,
  FacilityMoveSubmittedEvent,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import {
  FacilityTreeStore,
  type FacilityTreeStoreType,
} from '@features/organization/features/facilities/state';
import { FacilityMoveDialog } from '@features/organization/features/facilities/ui/dialogs';
import { facilityToTreeNode } from '@features/organization/features/facilities/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  OrganizationAssetsPaneStore,
  type OrganizationAssetsPaneStoreType,
} from '@features/organization/state/organization-assets-pane';
import { Tree, type TreeDropEvent, type TreeNode } from '@shared/tree';
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
 * Operators holding `FACILITIES_WRITE` can drag a site onto another to
 * re-parent it — an enhancement over the tree node menu's "Move" action,
 * never a replacement: both call `FacilityTreeStore.move`, and the menu
 * action is what keeps the operation reachable without a pointer
 * (`ARCHITECTURE.md` §10.3, `shared/tree`'s `Tree` a11y contract).
 *
 * @version 1.1.0
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
    FacilityMoveDialog,
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
      lucideMove,
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

  /** The facility pending a move via the dialog, or `null` while it is closed. */
  protected readonly moveTarget: WritableSignal<FacilityMoveRequest | null> =
    signal<FacilityMoveRequest | null>(null);

  /**
   * Property moveOptions
   *
   * @description
   * Candidate parents for {@link moveTarget}: every currently loaded
   * facility except the one being moved and its already-loaded descendants
   * — the same client-side guard `Tree`'s drag-drop applies from
   * `childrenByParent`, so both paths reject the same invalid targets.
   *
   * @readonly
   * @access protected
   * @since 1.1.0
   * @type {Signal<ReadonlyArray<{ readonly value: string; readonly label: string }>>}
   */
  protected readonly moveOptions: Signal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = computed(() => {
    const target: FacilityMoveRequest | null = this.moveTarget();
    if (target === null) return [];

    const byId: Map<string, FacilityOutput> = new Map(
      [...this.tree.roots(), ...Object.values(this.tree.childrenByParent()).flat()].map(
        (facility) => [facility.id, facility],
      ),
    );

    return [...byId.values()]
      .filter(
        (facility) =>
          facility.id !== target.facilityId &&
          !this.isLoadedDescendant(target.facilityId, facility.id),
      )
      .map((facility) => ({ value: facility.id, label: facility.name }));
  });

  /** Whether the member may re-parent facilities — gates both drag-drop and the "Move to…" menu action. */
  protected readonly canMoveFacilities: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
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

  /**
   * Method onNodeDropped
   * @description Re-parents a facility dragged onto another — the tree's pointer enhancement over the "Move to…" menu action.
   * @access protected
   * @since 1.1.0
   * @param {TreeDropEvent<FacilityOutput>} event - The completed drag-drop.
   * @returns {void}
   */
  protected onNodeDropped(event: TreeDropEvent<FacilityOutput>): void {
    this.tree.move({
      organizationId: this.organizationId(),
      facilityId: event.dragged.id,
      parentFacilityId: event.target.id,
    });
  }

  /**
   * Method onMoveRequested
   * @description Opens the "Move to…" dialog for a node, from the tree row's menu.
   * @access protected
   * @since 1.1.0
   * @param {TreeNode<FacilityOutput>} node - The node to move.
   * @returns {void}
   */
  protected onMoveRequested(node: TreeNode<FacilityOutput>): void {
    this.moveTarget.set({ facilityId: node.id, facilityName: node.label });
  }

  /**
   * Method onMoveSubmitted
   * @description Calls the same re-parent flow as pointer drag-drop, then closes the dialog.
   * @access protected
   * @since 1.1.0
   * @param {FacilityMoveSubmittedEvent} event - The picked target.
   * @returns {void}
   */
  protected onMoveSubmitted(event: FacilityMoveSubmittedEvent): void {
    this.tree.move({
      organizationId: this.organizationId(),
      facilityId: event.facilityId,
      parentFacilityId: event.parentFacilityId,
    });
    this.moveTarget.set(null);
  }

  /**
   * Method onMoveDismissed
   * @description Closes the "Move to…" dialog without moving anything.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onMoveDismissed(): void {
    this.moveTarget.set(null);
  }
  //#endregion

  //#region Private methods
  /**
   * Method isLoadedDescendant
   * @description Whether `id` sits under `ancestorId` in the currently loaded part of the tree.
   * @access private
   * @since 1.1.0
   * @param {string} ancestorId - The candidate ancestor's id.
   * @param {string} id - The id being searched for.
   * @returns {boolean} Whether `id` is a loaded descendant of `ancestorId`.
   */
  private isLoadedDescendant(ancestorId: string, id: string): boolean {
    const children: readonly FacilityOutput[] = this.tree.childrenByParent()[ancestorId] ?? [];

    return children.some((child) => child.id === id || this.isLoadedDescendant(child.id, id));
  }
  //#endregion
}
