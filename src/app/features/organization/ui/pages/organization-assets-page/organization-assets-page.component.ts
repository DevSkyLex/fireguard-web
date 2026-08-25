import { DatePipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideCircleCheck,
  lucideCircleHelp,
  lucideClipboardList,
  lucideCopy,
  lucideDownload,
  lucideEllipsis,
  lucideLayoutGrid,
  lucideMove,
  lucideNetwork,
  lucidePlus,
  lucideShieldCheck,
  lucideSquareArrowOutUpRight,
  lucideTriangleAlert,
  lucideWrench,
} from '@ng-icons/lucide';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { OrganizationPermissionService } from '@features/organization/access';
import { COMPLIANCE_BUCKET_TAG_ICON_CLASS } from '@features/organization/constants';
import { EquipmentStatusTag } from '@features/organization/features/equipments/ui/components/equipment-status-tag';
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
import { InspectionStatusTag } from '@features/organization/features/inspections/ui/components/inspection-status-tag';
import {
  ORGANIZATION_PERMISSION,
  resolveComplianceBucketTag,
  type ComplianceFacilityTreeNodeOutput,
} from '@features/organization/models';
import {
  ComplianceExplorerStore,
  type ComplianceExplorerStoreType,
} from '@features/organization/state/compliance-explorer';
import {
  OrganizationAssetsPaneStore,
  type OrganizationAssetsPaneStoreType,
} from '@features/organization/state/organization-assets-pane';
import { resolveComplianceBucket } from '@features/organization/utils';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { Tree, type TreeDropEvent, type TreeNode } from '@shared/tree';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTabsImports } from '@shared/ui/tabs';

/** The explorer's first-level axes (`organization/FEATURE.md` "Assets"). */
type OrganizationAssetsAxis = 'site' | 'everything' | 'compliance';

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
 * A third "Compliance" axis renders the same `Tree` primitive over the
 * Compliance module's own enriched hierarchy (`ComplianceExplorerStore`,
 * eager — the whole tree arrives nested in one call, so `childrenByParent`
 * is fully populated up front and `Tree`'s lazy `expandRequested` never
 * fires). It loads only on first activation, per the secondary-UI loading
 * rule (`ARCHITECTURE.md` §12). Selecting a node loads that facility's
 * compliance summary into the right pane; "Export safety register" streams
 * the register PDF through `BrowserDownloadService`.
 *
 * @version 1.2.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-assets-page',
  imports: [
    DatePipe,
    NgTemplateOutlet,
    RouterLink,
    NgIcon,
    EmptyState,
    ErrorState,
    Tree,
    FacilityMoveDialog,
    EquipmentStatusTag,
    InspectionStatusTag,
    HlmBadge,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertImports,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
    ...HlmTabsImports,
  ],
  providers: [
    provideIcons({
      lucideCircleAlert,
      lucideCircleCheck,
      lucideCircleHelp,
      lucideClipboardList,
      lucideCopy,
      lucideDownload,
      lucideEllipsis,
      lucideLayoutGrid,
      lucideMove,
      lucideNetwork,
      lucidePlus,
      lucideShieldCheck,
      lucideSquareArrowOutUpRight,
      lucideTriangleAlert,
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

  /** The compliance hierarchy, selected facility summary and safety-register export. */
  protected readonly compliance: ComplianceExplorerStoreType =
    inject<ComplianceExplorerStoreType>(ComplianceExplorerStore);

  /** Resolves a compliance rate into its severity bucket. */
  protected readonly resolveComplianceBucket: typeof resolveComplianceBucket =
    resolveComplianceBucket;

  /** Resolves a severity bucket into its badge label/severity/icon. */
  protected readonly resolveComplianceBucketTag: typeof resolveComplianceBucketTag =
    resolveComplianceBucketTag;

  /** The colour each badge severity puts on the icon alone. */
  protected readonly complianceBucketIconClass: typeof COMPLIANCE_BUCKET_TAG_ICON_CLASS =
    COMPLIANCE_BUCKET_TAG_ICON_CLASS;

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The "New facility" and "New equipment" buttons, rendered in the shell header. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /** Organization permission checks gating the creation actions and the equipment pane. */
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

  /** The facility currently scoping the compliance summary, on the "Compliance" axis. */
  protected readonly selectedComplianceFacilityId: WritableSignal<string | null> = signal<
    string | null
  >(null);

  /** Whether the compliance tree has been requested at least once — first-activation gate. */
  private readonly hasRequestedComplianceTree: WritableSignal<boolean> = signal(false);

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

  /**
   * Whether the member may create facilities. This explorer replaced the
   * facilities list in the sidebar, so it has to carry the entry point the
   * list used to hold — otherwise creating a site is reachable only by typing
   * the URL.
   */
  protected readonly canCreateFacilities: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /** Whether the member may create equipment. Same reason as {@link canCreateFacilities}. */
  protected readonly canCreateEquipment: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /** Whether the member may read equipment, gating the equipment pane. */
  protected readonly canReadEquipment: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );

  /** Whether the member may read inspections, gating the inspections pane. */
  protected readonly canReadInspections: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
  );

  /**
   * Whether the member may read compliance data, gating the compliance axis —
   * the same `organization.compliance.read` the backend asserts on the tree
   * and summary endpoints (held by the system member role and by admins
   * through `organization.*`).
   */
  protected readonly canReadCompliance: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.COMPLIANCE_READ),
  );

  /**
   * Whether the member may export the safety register, gating the export
   * button — the same `organization.compliance.export` the backend asserts.
   * The backend additionally gates the export on the organization's plan
   * tier; that refusal is backend-owned and surfaces through the export
   * error state rather than being re-derived here.
   */
  protected readonly canExportCompliance: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.COMPLIANCE_EXPORT),
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
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

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
        if (axis === 'compliance') return;
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
   * Method retryPane
   *
   * @description
   * Re-issues the right pane's equipment and inspections loads after a failed
   * one, from the same scope its effect derives — the "site" axis narrows to
   * the selected facility, every other axis loads organization-wide.
   *
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected retryPane(): void {
    const organizationId: string = this.organizationId();
    const facilityId: string | null = this.selectedFacilityId();
    const scope = this.axis() === 'site' && facilityId !== null ? { facilityId } : {};

    if (this.canReadEquipment()) this.pane.loadEquipment({ organizationId, ...scope });
    if (this.canReadInspections()) this.pane.loadInspections({ organizationId, ...scope });
  }

  /**
   * Method retryComplianceTree
   * @description Re-requests the compliance hierarchy after a failed load.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected retryComplianceTree(): void {
    this.compliance.loadTree(this.organizationId());
  }

  /**
   * Method retryComplianceSummary
   * @description Re-requests the selected facility's compliance summary after a failed load. A no-op while no facility is selected, since the summary pane does not render then.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected retryComplianceSummary(): void {
    const facilityId: string | null = this.selectedComplianceFacilityId();

    if (facilityId === null) return;

    this.compliance.loadSummary({ organizationId: this.organizationId(), facilityId });
  }

  /**
   * Method onAxisActivated
   *
   * @description
   * Switches the active axis from the tab bar. Requests the compliance tree
   * once, on the axis's first activation — a hidden tab loads browser-only,
   * on user action (`ARCHITECTURE.md` §12).
   *
   * @access protected
   * @since 1.0.0
   * @param {string} tab - The activated tab id.
   * @returns {void}
   */
  protected onAxisActivated(tab: string): void {
    const axis: OrganizationAssetsAxis =
      tab === 'everything' ? 'everything' : tab === 'compliance' ? 'compliance' : 'site';
    this.axis.set(axis);

    if (axis === 'compliance' && !this.hasRequestedComplianceTree()) {
      this.hasRequestedComplianceTree.set(true);
      this.compliance.loadTree(this.organizationId());
    }
  }

  /**
   * Method onComplianceNodeSelected
   * @description Scopes the compliance summary to the selected facility.
   * @access protected
   * @since 1.0.0
   * @param {TreeNode<ComplianceFacilityTreeNodeOutput>} node - The selected tree node.
   * @returns {void}
   */
  protected onComplianceNodeSelected(node: TreeNode<ComplianceFacilityTreeNodeOutput>): void {
    this.selectedComplianceFacilityId.set(node.id);
    this.compliance.loadSummary({ organizationId: this.organizationId(), facilityId: node.id });
  }

  /**
   * Method onExportSafetyRegister
   *
   * @description
   * Exports the selected facility's safety-register PDF and saves it to the
   * visitor's device. Only reachable once a facility is selected. A no-op
   * while an export is already running — the button stays focusable
   * (`aria-disabled`, not `disabled`) so this guard is what prevents a
   * double request.
   *
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onExportSafetyRegister(): void {
    if (this.compliance.isExporting()) return;

    const facilityId: string | null = this.selectedComplianceFacilityId();
    if (facilityId === null) return;

    this.compliance.exportSafetyRegister({
      organizationId: this.organizationId(),
      facilityId,
      fileName: 'safety-register.pdf',
    });
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
   * Method onComplianceExpandRequested
   *
   * @description
   * No-op: the compliance tree arrives fully nested in one call, so
   * `childrenByParent` is already populated for the whole tree and this
   * never fires in practice — mirrored from
   * `FacilityHierarchyChart`'s own eager-tree wiring.
   *
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onComplianceExpandRequested(): void {}

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

  /**
   * Method onDuplicateRequested
   * @description Duplicates a node's subtree — the tree row menu's "Duplicate" action. No confirmation dialog: the action is not destructive.
   * @access protected
   * @since 1.3.0
   * @param {TreeNode<FacilityOutput>} node - The node to duplicate.
   * @returns {void}
   */
  protected onDuplicateRequested(node: TreeNode<FacilityOutput>): void {
    this.tree.duplicate({ organizationId: this.organizationId(), facilityId: node.id });
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
