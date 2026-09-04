import { NgTemplateOutlet } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArchive,
  lucideArrowLeft,
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
  lucideQrCode,
  lucideShieldCheck,
  lucideSquareArrowOutUpRight,
  lucideTriangleAlert,
  lucideWrench,
} from '@ng-icons/lucide';
import { take } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import type { CallState, StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { COMPLIANCE_BUCKET_TAG_ICON_CLASS } from '@features/organization/constants';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import { EquipmentStatusTag } from '@features/organization/features/equipments/ui/components/equipment-status-tag';
import type {
  FacilityOption,
  FacilityMoveRequest,
  FacilityMoveSubmittedEvent,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import {
  FacilityTreeStore,
  type FacilityTreeStoreType,
} from '@features/organization/features/facilities/state';
import { FacilityMoveDialog } from '@features/organization/features/facilities/ui/dialogs';
import {
  facilityToTreeNode,
  toFacilityOption,
} from '@features/organization/features/facilities/utils';
import { InspectionStatusTag } from '@features/organization/features/inspections/ui/components/inspection-status-tag';
import {
  ORGANIZATION_PERMISSION,
  resolveComplianceBucketTag,
  type ComplianceFacilityTreeNodeOutput,
} from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import {
  ComplianceExplorerStore,
  type ComplianceExplorerStoreType,
} from '@features/organization/state/compliance-explorer';
import {
  OrganizationAssetsPaneStore,
  type OrganizationAssetsPaneStoreType,
} from '@features/organization/state/organization-assets-pane';
import { resolveComplianceBucket, resolveCsvExportErrorDetail } from '@features/organization/utils';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { Tree, type TreeDropEvent, type TreeNode } from '@shared/tree';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
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
    NgIcon,
    ...HlmEmptyImports,
    OrgDatePipe,
    NgTemplateOutlet,
    RouterLink,
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
      lucideArchive,
      lucideArrowLeft,
      lucideCopy,
      lucideDownload,
      lucideEllipsis,
      lucideLayoutGrid,
      lucideMove,
      lucideNetwork,
      lucidePlus,
      lucideQrCode,
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
  /** The active organization's regional formatting context port. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone, read by `appOrgDate` bindings and forwarded to date-rendering children.
   * @access protected
   * @since 1.0.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /** App-wide toast feedback for the archive and snapshot-download flows. */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /** Transport used directly for the selected node's one-shot QR label sheet — a download, not pane state. */
  private readonly equipmentService: EquipmentService = inject(EquipmentService);

  /** Hands the label sheet blob to the browser as a file download. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Unsubscribes an in-flight label sheet download when the page is destroyed. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Whether a QR label sheet download is currently in flight. */
  protected readonly labelsBusy: WritableSignal<boolean> = signal<boolean>(false);

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

  //#region Routing
  /** Writes the explorer's own state into the URL, so a view can be shared and restored. */
  private readonly router: Router = inject(Router);

  /** The activated route the query params are written relative to. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  //#endregion

  /**
   * Property axisParam
   * @readonly
   * @description The `?axis=` the URL arrived with, restoring the active axis on reload.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly axisParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    {
      alias: 'axis',
    },
  );

  /**
   * Property facilityParam
   * @readonly
   * @description The `?facility=` the URL arrived with, restoring the selected site on reload.
   * @access public
   * @since 2.0.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly facilityParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    { alias: 'facility' },
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
   * @type {Signal<readonly FacilityOption[]>}
   */
  protected readonly moveOptions: Signal<readonly FacilityOption[]> = computed(() => {
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
      .map(toFacilityOption);
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
    /*
     * Restores the axis and the selected site from the URL on arrival, so a
     * reload or a shared link lands where it was sent rather than on the
     * default "By site" axis with nothing selected. It runs on every change of
     * the bound params, which also makes the back button clear a selection
     * instead of leaving the page.
     */
    effect((): void => {
      const axis: string | undefined = this.axisParam();
      const facilityId: string | undefined = this.facilityParam();

      untracked((): void => {
        const restored: OrganizationAssetsAxis =
          axis === 'everything' || axis === 'compliance' ? axis : 'site';

        if (this.axis() !== restored) {
          this.axis.set(restored);

          if (restored === 'compliance' && !this.hasRequestedComplianceTree()) {
            this.hasRequestedComplianceTree.set(true);
            this.compliance.loadTree(this.organizationId());
            if (this.canExportCompliance()) this.compliance.loadSnapshots(this.organizationId());
          }
        }

        const selected: string | null = facilityId ?? null;
        if (restored === 'site' && this.selectedFacilityId() !== selected) {
          this.selectedFacilityId.set(selected);
        }
      });
    });

    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);

    effect((): void => {
      const organizationId: string = this.organizationId();
      untracked((): void => {
        this.tree.loadRoots(organizationId);
      });
    });

    effect((): void => {
      const callState: CallState = this.compliance.archiveCallState();

      untracked((): void => {
        if (callState.status === 'success') {
          this.feedback.success(
            $localize`:@@org.assets.compliance.archiveSuccess:Safety register archived.`,
          );
          this.compliance.loadSnapshots(this.organizationId());
          return;
        }

        if (callState.status === 'error') {
          const storeError: StoreError | null = callState.error;
          this.feedback.error(
            storeError?.message ??
              $localize`:@@org.assets.compliance.archiveFailed:Couldn't archive the safety register.`,
          );
        }
      });
    });

    effect((): void => {
      const callState: CallState = this.compliance.downloadCallState();

      untracked((): void => {
        if (callState.status !== 'error') return;

        this.feedback.error(
          $localize`:@@org.assets.compliance.snapshotDownloadFailed:Couldn't download the archived register.`,
        );
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
    this.writeUrlState();

    if (axis === 'compliance' && !this.hasRequestedComplianceTree()) {
      this.hasRequestedComplianceTree.set(true);
      this.compliance.loadTree(this.organizationId());
      if (this.canExportCompliance()) this.compliance.loadSnapshots(this.organizationId());
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
    this.writeUrlState();
    this.compliance.loadSummary({ organizationId: this.organizationId(), facilityId: node.id });
  }

  /**
   * Method onPrintLabels
   *
   * @description
   * Downloads the selected facility subtree's printable QR label sheet as
   * PDF (`EquipmentService.exportLabels`, `facilityId` scope) and saves it
   * to the visitor's device. Only reachable on the "By site" axis once a
   * facility is selected. A selection past 500 labels is refused
   * server-side with a `422` whose RFC 7807 `detail` surfaces as an error
   * toast. A no-op while a sheet is already in flight — the button stays
   * focusable (`aria-disabled`, not `disabled`), so this guard is what
   * prevents a double request.
   *
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected onPrintLabels(): void {
    if (this.labelsBusy()) return;

    const facilityId: string | null = this.selectedFacilityId();
    if (facilityId === null) return;

    this.labelsBusy.set(true);

    this.equipmentService
      .exportLabels(this.organizationId(), { facilityId })
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.labelsBusy.set(false);
          this.browserDownload.trigger(blob, `equipment-labels-${facilityId}.pdf`);
        },
        error: (error: HttpErrorResponse): void => {
          this.labelsBusy.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ?? $localize`:@@org.assets.labelsFailed:Couldn't print the QR labels.`,
            );
          });
        },
      });
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
   * Method onArchiveRegister
   *
   * @description
   * Archives the safety register as a dated snapshot, scoped to the
   * selected facility when one is selected — the axis's existing selection
   * — organization-wide otherwise. A no-op while an archive is already
   * running — the button stays focusable (`aria-disabled`, not `disabled`)
   * so this guard is what prevents a double request. Success and failure
   * both surface as toasts through the constructor effect.
   *
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onArchiveRegister(): void {
    if (this.compliance.isArchiving()) return;

    const facilityId: string | null = this.selectedComplianceFacilityId();

    this.compliance.archiveRegister({
      organizationId: this.organizationId(),
      ...(facilityId !== null ? { facilityId } : {}),
    });
  }

  /**
   * Method onDownloadSnapshot
   *
   * @description
   * Fetches one archived snapshot's PDF and saves it to the visitor's
   * device, stamped with the snapshot's generation date. A no-op while a
   * snapshot download is already running.
   *
   * @access protected
   * @since 1.1.0
   * @param {string} snapshotId - The snapshot row to download.
   * @param {string} generatedAt - The snapshot's ISO 8601 generation instant.
   * @returns {void}
   */
  protected onDownloadSnapshot(snapshotId: string, generatedAt: string): void {
    if (this.compliance.downloadingSnapshotId() !== null) return;

    this.compliance.downloadSnapshot({
      organizationId: this.organizationId(),
      snapshotId,
      fileName: `safety-register-${generatedAt.slice(0, 10)}.pdf`,
    });
  }

  /**
   * Method retrySnapshots
   * @description Re-requests the archived-snapshot list after a failed load.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected retrySnapshots(): void {
    this.compliance.loadSnapshots(this.organizationId());
  }

  /**
   * Method truncateHash
   * @description The snapshot's SHA-256 content hash shortened to its first 12 characters for display.
   * @access protected
   * @since 1.1.0
   * @param {string} hash - The full content hash.
   * @returns {string} The truncated hash.
   */
  protected truncateHash(hash: string): string {
    return hash.slice(0, 12);
  }

  /**
   * Method formatSnapshotSize
   * @description The stored PDF's size rendered human-readable — KB below one megabyte, MB above.
   * @access protected
   * @since 1.1.0
   * @param {number} sizeBytes - The stored PDF's size in bytes.
   * @returns {string} The formatted size.
   */
  protected formatSnapshotSize(sizeBytes: number): string {
    if (sizeBytes >= 1_048_576) return `${(sizeBytes / 1_048_576).toFixed(1)} MB`;

    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
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
    this.writeUrlState();
  }

  /**
   * Method clearFacilitySelection
   *
   * @description
   * Drops the selection, which below `lg` is what returns the operator from
   * the panes to the hierarchy: the two share one column at that width, and
   * the selection decides which of them is shown. From `lg` up they sit side
   * by side and the control that calls this is hidden.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected clearFacilitySelection(): void {
    this.selectedFacilityId.set(null);
    this.writeUrlState();
  }

  /**
   * Method createScopeParams
   * @method createScopeParams
   *
   * @description
   * The query params a creation link carries: `create=1` opens the list's
   * creation sheet on arrival, and the selected site scopes it so the new
   * record lands where the operator is looking.
   *
   * The two creation forms name the site differently — equipment owns a
   * `facility`, a site owns a `parent` — so the caller states which key it
   * needs rather than the explorer guessing from the button.
   *
   * @access protected
   * @since 2.0.0
   * @param {'facility' | 'parent'} key - The param name the target form reads.
   * @returns {Record<string, string>} The params, or an empty object.
   */
  protected createScopeParams(key: 'facility' | 'parent'): Record<string, string> {
    const facilityId: string | null = this.selectedFacilityId();

    return facilityId === null ? { create: '1' } : { create: '1', [key]: facilityId };
  }

  /**
   * Method writeUrlState
   * @method writeUrlState
   *
   * @description
   * Mirrors the axis and the selected site into the query string.
   *
   * The explorer replaced two routed list pages that both wrote their own
   * state to the URL, and inherited neither: a reload came back on "By site"
   * with nothing selected, the back button left the page instead of clearing
   * the selection, and "the equipment of Bâtiment C" could not be sent to a
   * colleague. `replaceUrl` keeps browsing the tree from filling the history
   * with one entry per click — the shareable address is the point, not a
   * navigation trail.
   *
   * @access private
   * @since 2.0.0
   * @returns {void}
   */
  private writeUrlState(): void {
    const axis: OrganizationAssetsAxis = this.axis();

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        axis: axis === 'site' ? null : axis,
        facility: axis === 'site' ? this.selectedFacilityId() : null,
        compliance: axis === 'compliance' ? this.selectedComplianceFacilityId() : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
