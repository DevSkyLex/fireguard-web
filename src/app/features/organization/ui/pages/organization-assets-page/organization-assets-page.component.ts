import { NgTemplateOutlet } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  Injector,
  input,
  LOCALE_ID,
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
  lucideClock,
  lucideCopy,
  lucideDownload,
  lucideEllipsis,
  lucideLayoutGrid,
  lucideMove,
  lucideNetwork,
  lucideOctagonAlert,
  lucidePlus,
  lucideQrCode,
  lucideShieldCheck,
  lucideSquareArrowOutUpRight,
  lucideTriangleAlert,
  lucideWrench,
} from '@ng-icons/lucide';
import { take } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { PageTabsService, registerPageTabs } from '@core/page-tabs';
import type { CallState, StoreError } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import { COMPLIANCE_BUCKET_TAG_ICON_CLASS } from '@features/organization/constants';
import { CustomerPicker } from '@features/organization/features/customers/ui/components';
import {
  EquipmentTypeCatalogStore,
  buildEquipmentTitle,
  type EquipmentTypeCatalogStoreType,
} from '@features/organization/features/equipments';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import { EquipmentStatusTag } from '@features/organization/features/equipments/ui/components';
import type {
  FacilityOption,
  FacilityMoveRequest,
  FacilityMoveSubmittedEvent,
  FacilityOutput,
} from '@features/organization/features/facilities/models';
import {
  FacilityOptionsStore,
  FacilityTreeStore,
  type FacilityTreeStoreType,
} from '@features/organization/features/facilities/state';
import { FacilityMoveDialog } from '@features/organization/features/facilities/ui/dialogs';
import {
  facilityToTreeNode,
  toFacilityOption,
} from '@features/organization/features/facilities/utils';
import type { InspectorOutput } from '@features/organization/features/inspections/models';
import { InspectionStatusTag } from '@features/organization/features/inspections/ui/components/inspection-status-tag';
import { NonConformityList } from '@features/organization/features/inspections/ui/dataviews/non-conformity-list';
import {
  ORGANIZATION_PERMISSION,
  resolveComplianceBucketTag,
  type ComplianceFacilitySummary,
  type ComplianceFacilityTreeNodeOutput,
  type ComplianceSummaryOutput,
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
import {
  getOrganizationInitials,
  resolveComplianceBucket,
  resolveCsvExportErrorDetail,
} from '@features/organization/utils';
import { CollectionPagination } from '@shared/collection-pagination';
import { CollectionSkeletonCards, CollectionSkeletonRows } from '@shared/collection-surface';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { formatRelativeTime } from '@shared/relative-time';
import { ResourceIllustration } from '@shared/resource-illustration';
import { StateIllustration } from '@shared/state-illustration';
import { Tree, type TreeDropEvent, type TreeNode } from '@shared/tree';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmFieldLegend, HlmFieldSet } from '@shared/ui/field';
import { HlmItemImports } from '@shared/ui/item';
import { HlmProgressImports } from '@shared/ui/progress';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTableImports } from '@shared/ui/table';
import { HlmTabsImports } from '@shared/ui/tabs';
import { HlmToggleGroupImports } from '@shared/ui/toggle-group';
import { HlmTooltip } from '@shared/ui/tooltip';
import { HlmLarge } from '@shared/ui/typography';
import { resolveComplianceStatusTag } from './models/compliance-status-tag/compliance-status-tag.util';

/**
 * Type OrganizationAssetsAxis
 *
 * @description
 * The explorer's first-level axes (`organization/FEATURE.md` "Assets").
 *
 * @type {OrganizationAssetsAxis}
 */
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
 * The right pane is this page's own `OrganizationAssetsPaneStore` rather
 * than the equipments/inspections subfeatures' own stores: it is a
 * read-only preview, not the management surface those subfeatures own, and
 * it reuses their `EquipmentService`/`InspectionService` transport through
 * the public `data-access` barrels instead of duplicating it.
 * Operators holding `FACILITIES_WRITE` can drag a site onto another to
 * re-parent it — an enhancement over the tree node menu's "Move" action,
 * never a replacement: both call `FacilityTreeStore.move`, and the menu
 * action is what keeps the operation reachable without a pointer
 * (`ARCHITECTURE.md` §10.3, `shared/tree`'s `Tree` a11y contract).
 * A third "Compliance" axis renders the same `Tree` primitive over the
 * Compliance module's own enriched hierarchy (`ComplianceExplorerStore`,
 * eager — the whole tree arrives nested in one call, so `childrenByParent`
 * is fully populated up front and `Tree`'s lazy `expandRequested` never
 * fires). It loads only on first activation, per the secondary-UI loading
 * rule (`ARCHITECTURE.md` §12). Selecting a node loads that facility's
 * compliance summary into the right pane; "Export safety register" streams
 * the register PDF through `BrowserDownloadService`.
 * The three axes use a paginated Spartan `line` tab list projected beneath
 * the shell page title through `PageTabsService`.
 *
 * @version 1.3.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-organization-assets-page',
  imports: [
    CustomerPicker,
    NonConformityList,
    ...HlmToggleGroupImports,
    CollectionPagination,
    ResourceIllustration,
    StateIllustration,
    CollectionSkeletonCards,
    CollectionSkeletonRows,
    NgIcon,
    ...HlmEmptyImports,
    HlmFieldLegend,
    HlmFieldSet,
    OrgDatePipe,
    NgTemplateOutlet,
    RouterLink,
    Tree,
    FacilityMoveDialog,
    EquipmentStatusTag,
    InspectionStatusTag,
    HlmBadge,
    HlmButton,
    ...HlmAvatarImports,
    ...HlmCardImports,
    ...HlmItemImports,
    ...HlmProgressImports,
    HlmSeparator,
    HlmSkeleton,
    HlmTooltip,
    HlmLarge,
    ...HlmAlertImports,
    ...HlmDropdownMenuImports,
    ...HlmTableImports,
    ...HlmTabsImports,
  ],
  providers: [
    EquipmentTypeCatalogStore,
    FacilityOptionsStore,
    provideIcons({
      lucideCircleAlert,
      lucideCircleCheck,
      lucideCircleHelp,
      lucideClipboardList,
      lucideClock,
      lucideArchive,
      lucideArrowLeft,
      lucideCopy,
      lucideDownload,
      lucideEllipsis,
      lucideLayoutGrid,
      lucideMove,
      lucideNetwork,
      lucideOctagonAlert,
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
  /**
   * Property element
   * @readonly
   *
   * @description
   * Limits browse/detail focus restoration to this explorer.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ElementRef<HTMLElement>}
   */
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);

  /**
   * Property injector
   * @readonly
   *
   * @description
   * Schedules focus after Angular updates mobile pane visibility.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Injector}
   */
  private readonly injector: Injector = inject(Injector);

  /**
   * Property isMobileInteractionMode
   * @readonly
   *
   * @description
   * Chooses sequential estate browsing and cards independently of viewport width.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMobileInteractionMode: Signal<boolean> = inject(
    INTERACTION_CAPABILITIES_PORT,
  ).isMobileInteractionMode;

  /**
   * Property facilityBrowserVisible
   * @readonly
   *
   * @description
   * Keeps the hierarchy visible while the URL-backed selection is cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly facilityBrowserVisible: WritableSignal<boolean> = signal(false);

  /**
   * Property complianceBrowserVisible
   * @readonly
   *
   * @description
   * Keeps the compliance hierarchy visible while its selection is cleared.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly complianceBrowserVisible: WritableSignal<boolean> = signal(false);

  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace whose estate is explored, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property regionalFormattingPort
   * @readonly
   *
   * @description
   * The active organization's regional formatting context port.
   *
   * @access private
   * @since unreleased
   *
   * @type {RegionalFormattingPort}
   */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   *
   * @description
   * The active organization's date pattern and timezone, read by `appOrgDate` bindings and
   * forwarded to date-rendering children.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * App-wide toast feedback for the archive and snapshot-download flows.
   *
   * @access private
   * @since unreleased
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /**
   * Property equipmentService
   * @readonly
   *
   * @description
   * Transport used directly for the selected node's one-shot QR label sheet — a download, not pane
   * state.
   *
   * @access private
   * @since unreleased
   *
   * @type {EquipmentService}
   */
  private readonly equipmentService: EquipmentService = inject(EquipmentService);

  /**
   * Property browserDownload
   * @readonly
   *
   * @description
   * Hands the label sheet blob to the browser as a file download.
   *
   * @access private
   * @since unreleased
   *
   * @type {BrowserDownloadService}
   */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Unsubscribes an in-flight label sheet download when the page is destroyed.
   *
   * @access private
   * @since unreleased
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property labelsBusy
   * @readonly
   *
   * @description
   * Whether a QR label sheet download is currently in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly labelsBusy: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property tree
   * @readonly
   *
   * @description
   * The site hierarchy.
   *
   * @access protected
   * @since unreleased
   *
   * @type {FacilityTreeStoreType}
   */
  protected readonly tree: FacilityTreeStoreType = inject<FacilityTreeStoreType>(FacilityTreeStore);

  /**
   * Property pane
   * @readonly
   *
   * @description
   * The selected (or unscoped) facility's equipment and inspections.
   *
   * @access protected
   * @since unreleased
   *
   * @type {OrganizationAssetsPaneStoreType}
   */
  protected readonly pane: OrganizationAssetsPaneStoreType =
    inject<OrganizationAssetsPaneStoreType>(OrganizationAssetsPaneStore);

  /**
   * Property compliance
   * @readonly
   *
   * @description
   * The compliance hierarchy, selected facility summary and safety-register export.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ComplianceExplorerStoreType}
   */
  protected readonly compliance: ComplianceExplorerStoreType =
    inject<ComplianceExplorerStoreType>(ComplianceExplorerStore);

  /**
   * Property resolveComplianceBucket
   * @readonly
   *
   * @description
   * Resolves a compliance rate into its severity bucket.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof resolveComplianceBucket}
   */
  protected readonly resolveComplianceBucket: typeof resolveComplianceBucket =
    resolveComplianceBucket;

  /**
   * Property resolveComplianceBucketTag
   * @readonly
   *
   * @description
   * Resolves a severity bucket into its badge label/severity/icon.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof resolveComplianceBucketTag}
   */
  protected readonly resolveComplianceBucketTag: typeof resolveComplianceBucketTag =
    resolveComplianceBucketTag;

  /**
   * Property complianceBucketIconClass
   * @readonly
   *
   * @description
   * The colour each badge severity puts on the icon alone.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof COMPLIANCE_BUCKET_TAG_ICON_CLASS}
   */
  protected readonly complianceBucketIconClass: typeof COMPLIANCE_BUCKET_TAG_ICON_CLASS =
    COMPLIANCE_BUCKET_TAG_ICON_CLASS;

  /**
   * Property resolveComplianceStatusTag
   * @readonly
   *
   * @description
   * Resolves the backend's graded compliance verdict into a label/severity/icon descriptor.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof resolveComplianceStatusTag}
   */
  protected readonly resolveComplianceStatusTag: typeof resolveComplianceStatusTag =
    resolveComplianceStatusTag;

  /**
   * Property getInitials
   * @readonly
   *
   * @description
   * Resolves a member or inspector name into its 1–2 letter avatar fallback.
   *
   * @access protected
   * @since unreleased
   *
   * @type {typeof getOrganizationInitials}
   */
  protected readonly getInitials: typeof getOrganizationInitials = getOrganizationInitials;

  /**
   * Property notSpecifiedLabel
   * @readonly
   *
   * @description
   * Fallback label for an inspection row carrying no inspector.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly notSpecifiedLabel: string = $localize`:@@inspection.notSpecified:Not specified`;

  /**
   * Property openMenuLabel
   * @readonly
   *
   * @description
   * Accessible label and tooltip text for a tree row's "…" menu trigger.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly openMenuLabel: string = $localize`:@@org.assets.tree.nodeMenu:Open menu`;

  /**
   * Property newFacilityLabel
   * @readonly
   *
   * @description
   * Tooltip text for the "New facility" action, shown when its visible label collapses.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly newFacilityLabel: string = $localize`:@@facility.newButton:New facility`;

  /**
   * Property newEquipmentLabel
   * @readonly
   *
   * @description
   * Tooltip text for the "New equipment" action, shown when its visible label collapses.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly newEquipmentLabel: string = $localize`:@@equipment.newButton:New equipment`;

  /**
   * Property downloadSnapshotLabel
   * @readonly
   *
   * @description
   * Tooltip text for the mobile archived-register icon-only "Download" action.
   *
   * @access protected
   * @since unreleased
   *
   * @type {string}
   */
  protected readonly downloadSnapshotLabel: string = $localize`:@@org.assets.compliance.snapshotDownloadAria:Download this archived register`;

  /**
   * Property complianceSummarySkeletonRows
   * @readonly
   *
   * @description
   * Stable placeholder rows shown while a compliance summary loads, matching the loaded totals
   * `<dl>`'s row count.
   *
   * @access protected
   * @since 1.4.0
   *
   * @type {readonly number[]}
   */
  protected readonly complianceSummarySkeletonRows: readonly number[] = [0, 1, 2, 3, 4, 5, 6];

  /**
   * Property treeSkeletonRows
   * @readonly
   *
   * @description
   * Stable placeholder rows shown while a hierarchy's roots load.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {readonly number[]}
   */
  protected readonly treeSkeletonRows: readonly number[] = [0, 1, 2, 3, 4, 5];

  /**
   * Property locale
   * @readonly
   *
   * @description
   * Active application locale, used by the relative-age formatters.
   *
   * @access private
   * @since 1.3.0
   *
   * @type {string}
   */
  private readonly locale: string = inject(LOCALE_ID);

  /**
   * Property isComplianceSummaryStale
   * @readonly
   *
   * @description
   * Whether the currently rendered `compliance.summary()` still belongs to a
   * previously selected facility — `loadSummary` keeps the prior response
   * visible while the next one resolves, so this is what tells the template
   * to show the loading skeleton instead of a stale scope's totals.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isComplianceSummaryStale: Signal<boolean> = computed(() => {
    const summary: ComplianceSummaryOutput | null = this.compliance.summary();
    if (summary === null) return false;

    return (summary.facilityId ?? null) !== this.selectedComplianceFacilityId();
  });

  /**
   * Property selectedComplianceFacilitySummary
   * @readonly
   *
   * @description
   * The single-facility row of a loaded, non-stale compliance summary — its
   * name, path, type and last inspection date for the Compliance axis's
   * identity header.
   *
   * @access protected
   * @since 1.3.0
   *
   * @type {Signal<ComplianceFacilitySummary | null>}
   */
  protected readonly selectedComplianceFacilitySummary: Signal<ComplianceFacilitySummary | null> =
    computed(() => {
      if (this.selectedComplianceFacilityId() === null || this.isComplianceSummaryStale())
        return null;
      const summary = this.compliance.summary();

      return summary !== null && summary.facilities.length === 1 ? summary.facilities[0] : null;
    });

  /**
   * Property pageActionsService
   * @readonly
   *
   * @description
   * - Registers {@link pageActions} on the shell header.
   *
   * @access private
   * @since unreleased
   *
   * @type {PageActionsService}
   */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /**
   * Property pageActions
   * @readonly
   *
   * @description
   * The "New facility" and "New equipment" buttons, rendered in the shell header.
   *
   * @access private
   * @since unreleased
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property pageTabsService
   * @readonly
   *
   * @description
   * Shell registry receiving the estate navigation axes.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {PageTabsService}
   */
  private readonly pageTabsService: PageTabsService = inject(PageTabsService);

  /**
   * Property pageTabs
   * @readonly
   *
   * @description
   * Native Spartan line tabs projected beneath the dashboard page title.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageTabs: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageTabs');

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission checks gating the creation actions and the equipment pane.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  //#region Routing
  /**
   * Property router
   * @readonly
   *
   * @description
   * Writes the explorer's own state into the URL, so a view can be shared and restored.
   *
   * @access private
   * @since unreleased
   *
   * @type {Router}
   */
  private readonly router: Router = inject(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * The activated route the query params are written relative to.
   *
   * @access private
   * @since unreleased
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  //#endregion

  /**
   * Property axisParam
   * @readonly
   *
   * @description
   * The `?axis=` the URL arrived with, restoring the active axis on reload.
   *
   * @access public
   * @since 2.0.0
   *
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
   *
   * @description
   * The `?facility=` the URL arrived with, restoring the selected site on reload.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly facilityParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    { alias: 'facility' },
  );

  /**
   * Property complianceParam
   * @readonly
   *
   * @description
   * The `?compliance=` selection restored when the compliance axis opens.
   *
   * @access public
   * @since 2.1.0
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly complianceParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    { alias: 'compliance' },
  );

  /**
   * Property axis
   * @readonly
   *
   * @description
   * Which first-level axis is active.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<OrganizationAssetsAxis>}
   */
  protected readonly axis: WritableSignal<OrganizationAssetsAxis> =
    signal<OrganizationAssetsAxis>('site');

  /**
   * Property selectedFacilityId
   * @readonly
   *
   * @description
   * The facility currently scoping the right pane, on the "By site" axis.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedFacilityId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Property selectedFacilityContext
   * @readonly
   *
   * @description
   * The loaded site's name and ancestor path keep mobile browsing context visible without another
   * request.
   *
   * @access protected
   * @since 2.0.0
   *
   * @type {Signal<FacilityOption | null>}
   */
  protected readonly selectedFacilityContext: Signal<FacilityOption | null> = computed(() => {
    const selected = [
      ...this.tree.roots(),
      ...Object.values(this.tree.childrenByParent()).flat(),
    ].find((facility) => facility.id === this.selectedFacilityId());
    return selected ? toFacilityOption(selected) : null;
  });

  /**
   * Property selectedComplianceFacilityId
   * @readonly
   *
   * @description
   * The facility currently scoping the compliance summary, on the "Compliance" axis.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string | null>}
   */
  protected readonly selectedComplianceFacilityId: WritableSignal<string | null> = signal<
    string | null
  >(null);

  /**
   * Property hasRequestedComplianceTree
   * @readonly
   *
   * @description
   * Whether the compliance tree has been requested at least once — first-activation gate.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly hasRequestedComplianceTree: WritableSignal<boolean> = signal(false);

  /**
   * Property treeNodes
   * @readonly
   *
   * @description
   * The tree roots, mapped onto the shared `Tree` primitive's generic shape.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly TreeNode<FacilityOutput>[]>}
   */
  protected readonly treeNodes: Signal<readonly TreeNode<FacilityOutput>[]> = computed(() =>
    this.tree.roots().map(facilityToTreeNode),
  );

  /**
   * Property childrenByParent
   * @readonly
   *
   * @description
   * Already-loaded branches, mapped onto the shared `Tree` primitive's generic shape.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *     Readonly<Record<string, readonly TreeNode<FacilityOutput>[]>>
   *   >}
   */
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

  /**
   * Property loadingIds
   * @readonly
   *
   * @description
   * Branches currently being fetched.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlySet<string>>}
   */
  protected readonly loadingIds: Signal<ReadonlySet<string>> = computed(
    () => new Set(this.tree.expandingParentIds()),
  );

  /**
   * Property failedIds
   * @readonly
   *
   * @description
   * Branches whose last fetch failed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<ReadonlySet<string>>}
   */
  protected readonly failedIds: Signal<ReadonlySet<string>> = computed(
    () => new Set(this.tree.failedParentIds()),
  );

  /**
   * Property moveTarget
   * @readonly
   *
   * @description
   * The facility pending a move via the dialog, or `null` while it is closed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<FacilityMoveRequest | null>}
   */
  protected readonly moveTarget: WritableSignal<FacilityMoveRequest | null> =
    signal<FacilityMoveRequest | null>(null);

  /**
   * Property moveParents
   * @readonly
   *
   * @description
   * Candidate parents for {@link moveTarget}: every currently loaded
   * facility except the one being moved and its already-loaded descendants
   * — the same client-side guard `Tree`'s drag-drop applies from
   * `childrenByParent`, so both paths reject the same invalid targets.
   *
   * @access protected
   * @since 1.1.0
   *
   * @type {Signal<readonly FacilityOption[]>}
   */
  protected readonly moveParents: FacilityOptionsStore = inject(FacilityOptionsStore);
  /**
   * Property equipmentIncludeDescendants
   * @readonly
   *
   * @description
   * Selected equipment scope, preserved in the URL.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly equipmentIncludeDescendants: WritableSignal<boolean> = signal(true);
  /**
   * Property equipmentScope
   * @readonly
   *
   * @description
   * Restores a shared equipment scope; descendants are included by default.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly equipmentScope: InputSignal<string | undefined> = input<string | undefined>();
  /**
   * Property moveErrorMessage
   * @readonly
   *
   * @description
   * Localized failed-move guidance while preserving the dialog choice.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string | null>}
   */
  protected readonly moveErrorMessage: Signal<string | null> = computed(() => {
    const state = this.tree.moveCallState();
    if (state.status !== 'error') return null;
    return state.error?.code === 412 || state.error?.code === 428
      ? $localize`:@@facility.moveDialog.conflict:This place changed. Your selected parent is preserved. Retry with its latest revision.`
      : $localize`:@@facility.moveDialog.failed:Unable to move this place. Your selected parent is preserved. Retry or choose another parent.`;
  });

  /**
   * Property canMoveFacilities
   * @readonly
   *
   * @description
   * Whether the member may re-parent facilities — gates both drag-drop and the "Move to…" menu
   * action.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canMoveFacilities: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /**
   * Property canCreateFacilities
   * @readonly
   *
   * @description
   * Whether the member may create facilities. This explorer replaced the
   * facilities list in the sidebar, so it has to carry the entry point the
   * list used to hold — otherwise creating a site is reachable only by typing
   * the URL.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateFacilities: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /**
   * Property canCreateEquipment
   * @readonly
   *
   * @description
   * - Whether the member may create equipment. Same reason as {@link canCreateFacilities}.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateEquipment: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /**
   * Property canReadEquipment
   * @readonly
   *
   * @description
   * Whether the member may read equipment, gating the equipment pane.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadEquipment: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ),
  );

  /**
   * Property canReadInspections
   * @readonly
   *
   * @description
   * Whether the member may read inspections, gating the inspections pane.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInspections: Signal<boolean> = computed<boolean>(
    () =>
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ) &&
      ((this.family() === 'all' && !this.customerId()) ||
        this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_READ)),
  );

  /**
   * Property canReadCompliance
   * @readonly
   *
   * @description
   * Whether the member may read compliance data, gating the compliance axis —
   * the same `organization.compliance.read` the backend asserts on the tree
   * and summary endpoints (held by the system member role and by admins
   * through `organization.*`).
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadCompliance: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.COMPLIANCE_READ),
  );

  /**
   * Property canExportCompliance
   * @readonly
   *
   * @description
   * Whether the member may export the safety register, gating the export
   * button — the same `organization.compliance.export` the backend asserts.
   * The backend additionally gates the export on the organization's plan
   * tier; that refusal is backend-owned and surfaces through the export
   * error state rather than being re-derived here.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canExportCompliance: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.COMPLIANCE_EXPORT),
  );
  //#endregion

  //#region Properties
  /**
   * Property familyParam
   * @readonly
   *
   * @description
   * Directory's fire-only default is a server family filter, never a list of hardcoded types.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly familyParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    { alias: 'family' },
  );
  /**
   * Property customerParam
   * @readonly
   *
   * @description
   * Customer context restored from a scoped dashboard or shared Parc link.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly customerParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    { alias: 'customerId' },
  );
  /**
   * Property queueParam
   * @readonly
   *
   * @description
   * Action queue restored from the dashboard.
   *
   * @access public
   * @since unreleased
   *
   * @type {InputSignal<string | undefined>}
   */
  public readonly queueParam: InputSignal<string | undefined> = input<string | undefined>(
    undefined,
    { alias: 'queue' },
  );
  /**
   * Property family
   * @readonly
   *
   * @description
   * Family selected for equipment and control projections.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<'fire' | 'all'>}
   */
  protected readonly family: WritableSignal<'fire' | 'all'> = signal('fire');
  /**
   * Property customerId
   * @readonly
   *
   * @description
   * Optional customer context; empty means the organization's complete park.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly customerId: WritableSignal<string> = signal('');
  /**
   * Property queue
   * @readonly
   *
   * @description
   * Scoped action queue; controls uses the server's due union.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<string>}
   */
  protected readonly queue: WritableSignal<string> = signal('');
  /**
   * Property catalog
   * @readonly
   *
   * @description
   * Server-owned equipment labels include custom and archived catalog types.
   *
   * @access protected
   * @since unreleased
   *
   * @type {EquipmentTypeCatalogStoreType}
   */
  protected readonly catalog: EquipmentTypeCatalogStoreType = inject(EquipmentTypeCatalogStore);
  /**
   * Property canReadCustomers
   * @readonly
   *
   * @description
   * Directory access is independent of equipment and facility permissions.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadCustomers: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.CUSTOMERS_READ),
  );
  /**
   * Property parkFilters
   * @readonly
   *
   * @description
   * Reusable immutable filter scope for reads, retries and pagination.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<{ readonly family?: string; readonly customerId?: string }>}
   */
  protected readonly parkFilters: Signal<{
    readonly family?: string;
    readonly customerId?: string;
  }> = computed(() => ({
    ...(this.family() === 'fire' ? { family: 'fire' } : {}),
    ...(this.customerId() ? { customerId: this.customerId() } : {}),
  }));
  /**
   * Property queueFilters
   * @readonly
   *
   * @description
   * Additional equipment filter shared with the dashboard queue definition.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<{ readonly status?: string; readonly maintenanceDueStatus?: string }>}
   */
  protected readonly queueFilters: Signal<{
    readonly status?: string;
    readonly maintenanceDueStatus?: string;
  }> = computed(() =>
    this.queue() === 'unavailable'
      ? { status: 'under_maintenance' }
      : this.queue() === 'controls'
        ? { maintenanceDueStatus: 'due' }
        : {},
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
     * Restores the axis and selected hierarchy node from the URL on arrival, so a
     * reload or a shared link lands where it was sent rather than on the
     * default "By site" axis with nothing selected. It runs on every change of
     * the bound params, which also makes the back button clear a selection
     * instead of leaving the page.
     */
    effect((): void => {
      const axis: string | undefined = this.axisParam();
      const family = this.familyParam();
      const customer = this.customerParam();
      const queue = this.queueParam();
      const facilityId: string | undefined = this.facilityParam();
      const complianceFacilityId: string | undefined = this.complianceParam();

      untracked((): void => {
        this.family.set(family === 'all' ? 'all' : 'fire');
        this.customerId.set(customer ?? '');
        this.queue.set(
          queue === 'unavailable' || queue === 'controls' || queue === 'anomalies' ? queue : '',
        );
        const restored: OrganizationAssetsAxis =
          axis === 'everything' || axis === 'compliance' ? axis : 'site';

        if (this.axis() !== restored) {
          this.axis.set(restored);

          if (restored === 'compliance') this.ensureComplianceTreeLoaded();
        }

        const selected: string | null = facilityId ?? null;
        if (restored === 'site' && this.selectedFacilityId() !== selected) {
          this.selectedFacilityId.set(selected);
          if (selected !== null) this.facilityBrowserVisible.set(false);
        }

        const selectedCompliance: string | null = complianceFacilityId ?? null;
        if (
          restored === 'compliance' &&
          this.selectedComplianceFacilityId() !== selectedCompliance
        ) {
          this.selectedComplianceFacilityId.set(selectedCompliance);
          if (selectedCompliance !== null) {
            this.complianceBrowserVisible.set(false);
            this.compliance.loadSummary({
              organizationId: this.organizationId(),
              facilityId: selectedCompliance,
            });
          }
        }
      });
    });

    effect(() => {
      const scope = this.equipmentScope();
      untracked(() => this.equipmentIncludeDescendants.set(scope !== 'direct'));
    });
    effect(() => {
      const state = this.tree.moveCallState();
      if (state.status === 'success') untracked(() => this.moveTarget.set(null));
    });
    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);
    registerPageTabs(this.pageTabs, this.pageTabsService, this.destroyRef);

    effect((): void => {
      const organizationId: string = this.organizationId();
      const customerId = this.customerId();
      untracked((): void => {
        this.tree.loadRoots(organizationId, customerId || null);
        this.catalog.load(organizationId);
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
      const includeDescendants = this.equipmentIncludeDescendants();
      const filters = this.parkFilters();
      const queueFilters = this.queueFilters();
      const queue = this.queue();
      const canReadEquipment: boolean = this.canReadEquipment();
      const canReadInspections: boolean = this.canReadInspections();

      untracked((): void => {
        if (axis === 'compliance') return;
        if (axis === 'site' && facilityId === null) return;

        const scope = axis === 'site' && facilityId !== null ? { facilityId } : {};

        if (queue === 'anomalies') {
          if (canReadEquipment && canReadInspections)
            this.pane.loadAnomalies({
              organizationId,
              ...scope,
              ...(scope.facilityId ? { includeDescendants } : {}),
              ...filters,
            });
          return;
        }
        if (canReadEquipment)
          this.pane.loadEquipment({
            organizationId,
            ...scope,
            includeDescendants,
            ...filters,
            ...queueFilters,
          });
        if (canReadInspections)
          this.pane.loadInspections({
            organizationId,
            ...scope,
            ...(axis === 'site' && facilityId !== null ? { includeDescendants } : {}),
            ...filters,
          });
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method familyChanged
   * @method
   *
   * @description
   * Applies a server family filter and preserves the selected site context.
   *
   * @access protected
   * @since unreleased
   *
   * @param {unknown} value - Value supplied by the owning park workflow.
   *
   * @returns {void} No return value.
   */
  protected familyChanged(value: unknown): void {
    if (value !== 'fire' && value !== 'all') return;
    this.family.set(value);
    this.writeUrlState();
  }
  /**
   * Method customerChanged
   * @method
   *
   * @description
   * Changes the customer authority and clears an incompatible selected site.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} value - Value supplied by the owning park workflow.
   *
   * @returns {void} No return value.
   */
  protected customerChanged(value: string): void {
    if (value === this.customerId()) return;
    this.customerId.set(value);
    this.selectedFacilityId.set(null);
    this.writeUrlState();
  }
  /**
   * Method clearQueue
   * @method
   *
   * @description
   * Clears a scoped dashboard queue while retaining client, site and family.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} No return value.
   */
  protected clearQueue(): void {
    this.queue.set('');
    this.writeUrlState();
  }

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
   *
   * @returns {void}
   */
  /**
   * Method changePanePage
   *
   * @description
   * Changes one resource page without reloading the other list or losing the selected site.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {'equipment' | 'inspections'} kind - Resource list.
   * @param {number} page - Requested page.
   *
   * @returns {void}
   */
  protected changePanePage(kind: 'equipment' | 'inspections' | 'anomalies', page: number): void {
    const facilityId = this.selectedFacilityId();
    const request = {
      ...this.parkFilters(),
      organizationId: this.organizationId(),
      page,
      ...(this.axis() === 'site' && facilityId !== null ? { facilityId } : {}),
    };
    if (kind === 'anomalies' && this.canReadEquipment() && this.canReadInspections())
      this.pane.loadAnomalies({
        ...request,
        ...(request.facilityId ? { includeDescendants: this.equipmentIncludeDescendants() } : {}),
      });
    if (kind === 'equipment' && this.canReadEquipment())
      this.pane.loadEquipment({
        ...request,
        ...this.queueFilters(),
        includeDescendants: this.equipmentIncludeDescendants(),
      });
    if (kind === 'inspections' && this.canReadInspections())
      this.pane.loadInspections({
        ...request,
        ...(request.facilityId ? { includeDescendants: this.equipmentIncludeDescendants() } : {}),
      });
  }

  /**
   * Method retryPane
   * @method retryPane
   *
   * @description
   * Reloads the resource lists in the currently selected explorer scope.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retryPane(): void {
    const organizationId: string = this.organizationId();
    const facilityId: string | null = this.selectedFacilityId();
    const scope = this.axis() === 'site' && facilityId !== null ? { facilityId } : {};

    if (this.queue() === 'anomalies') {
      if (this.canReadEquipment() && this.canReadInspections())
        this.pane.loadAnomalies({
          organizationId,
          ...scope,
          ...this.parkFilters(),
          ...(scope.facilityId ? { includeDescendants: this.equipmentIncludeDescendants() } : {}),
        });
      return;
    }
    if (this.canReadEquipment())
      this.pane.loadEquipment({
        organizationId,
        ...scope,
        ...this.parkFilters(),
        ...this.queueFilters(),
        includeDescendants: this.equipmentIncludeDescendants(),
      });
    if (this.canReadInspections())
      this.pane.loadInspections({
        organizationId,
        ...scope,
        ...this.parkFilters(),
        ...(scope.facilityId ? { includeDescendants: this.equipmentIncludeDescendants() } : {}),
      });
  }

  /**
   * Method retryComplianceTree
   *
   * @description
   * Re-requests the compliance hierarchy after a failed load.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected retryComplianceTree(): void {
    this.compliance.loadTree(this.organizationId());
  }

  /**
   * Method retryComplianceSummary
   *
   * @description
   * Re-requests the selected facility's compliance summary after a failed load. A no-op while no
   * facility is selected, since the summary pane does not render then.
   *
   * @access protected
   * @since 1.2.0
   *
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
   *
   * @param {string} tab - The activated tab id.
   *
   * @returns {void}
   */
  protected onAxisActivated(tab: string): void {
    let axis: OrganizationAssetsAxis = 'site';
    if (tab === 'everything') axis = 'everything';
    else if (tab === 'compliance') axis = 'compliance';
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
   *
   * @description
   * Scopes the compliance summary to the selected facility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TreeNode<ComplianceFacilityTreeNodeOutput>} node - The selected tree node.
   *
   * @returns {void}
   */
  protected onComplianceNodeSelected(node: TreeNode<ComplianceFacilityTreeNodeOutput>): void {
    this.complianceBrowserVisible.set(false);
    this.focusExplorerTarget('[data-testid="assets-back-to-compliance-tree"]');
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
   *
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
   *
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
   *
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
   *
   * @param {string} snapshotId - The snapshot row to download.
   * @param {string} generatedAt - The snapshot's ISO 8601 generation instant.
   *
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
   *
   * @description
   * Re-requests the archived-snapshot list after a failed load.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected retrySnapshots(): void {
    this.compliance.loadSnapshots(this.organizationId());
  }

  /**
   * Method truncateHash
   *
   * @description
   * The snapshot's SHA-256 content hash shortened to its first 12 characters for display.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {string} hash - The full content hash.
   *
   * @returns {string} The truncated hash.
   */
  protected truncateHash(hash: string): string {
    return hash.slice(0, 12);
  }

  /**
   * Method formatSnapshotSize
   *
   * @description
   * The stored PDF's size rendered human-readable — KB below one megabyte, MB above.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {number} sizeBytes - The stored PDF's size in bytes.
   *
   * @returns {string} The formatted size.
   */
  protected formatSnapshotSize(sizeBytes: number): string {
    if (sizeBytes >= 1_048_576) return `${(sizeBytes / 1_048_576).toFixed(1)} MB`;

    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  /**
   * Method snapshotScopeLabel
   *
   * @description
   * Resolves an archived register's raw `scope` into its localized label — a `facility` snapshot
   * reads "Site", anything else "Organization".
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {string} scope - The snapshot's raw `scope` value.
   *
   * @returns {string} The localized scope label.
   */
  protected snapshotScopeLabel(scope: string): string {
    return scope === 'facility'
      ? $localize`:@@org.assets.compliance.snapshotScopeFacility:Site`
      : $localize`:@@org.assets.compliance.snapshotScopeOrganization:Organization`;
  }

  /**
   * Method complianceAncestorPathLabel
   *
   * @description
   * The compliance facility's ancestor breadcrumb, mirroring `toFacilityOption`'s
   * `pathLabel` shape for the compliance axis's differently-shaped summary row:
   * the backend's `path` is a `" / "`-joined breadcrumb that repeats the
   * facility's own name as its last segment (or holds only that name at the
   * root), so this strips that trailing segment and rejoins the rest with the
   * same `" › "` separator the site axis uses.
   *
   * @access protected
   * @since 1.4.0
   *
   * @param {ComplianceFacilitySummary} facility - The selected facility's compliance summary row.
   *
   * @returns {string | null} The ancestor path, or `null` for a root facility.
   */
  protected complianceAncestorPathLabel(facility: ComplianceFacilitySummary): string | null {
    const segments: readonly string[] = facility.path.split(' / ').map((segment) => segment.trim());
    const ancestors: readonly string[] =
      segments.length > 0 && segments.at(-1) === facility.name ? segments.slice(0, -1) : segments;

    return ancestors.length > 0 ? ancestors.join(' › ') : null;
  }

  /**
   * Method typeLabelOf
   *
   * @description
   * The equipment's type, humanized through the shared type catalog — mirrors `EquipmentTable`'s
   * own resolution.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {string} type - The raw type value.
   *
   * @returns {string} The localized label, or the raw value humanized if unknown.
   */
  protected typeLabelOf(type: string): string {
    return (
      this.catalog.options().find((option) => option.value === type)?.label ??
      type.replaceAll('_', ' ')
    );
  }

  /**
   * Method equipmentTitleOf
   * @method
   *
   * @description
   * Equipment identity uses the name and asset reference, with the authorized server type label.
   *
   * @access protected
   * @since unreleased
   *
   * @param {EquipmentOutput} item - Value supplied by the owning park workflow.
   *
   * @returns {string} Result consumed by the owning park workflow.
   */
  protected equipmentTitleOf(item: EquipmentOutput): string {
    return buildEquipmentTitle(item, this.typeLabelOf(item.type));
  }

  /**
   * Method equipmentSecondaryLineOf
   *
   * @description
   * The equipment row's muted second line: its serial number, or its brand and model, or `null`
   * when none is set.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {EquipmentOutput} item - The equipment being rendered.
   *
   * @returns {string | null} The secondary line, or `null`.
   */
  protected equipmentSecondaryLineOf(item: EquipmentOutput): string | null {
    if (item.name || item.assetCode)
      return [
        this.typeLabelOf(item.type),
        item.serialNumber || [item.brand, item.model].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(' · ');
    if (item.serialNumber) return item.serialNumber;
    const parts: readonly string[] = [item.brand, item.model].filter(
      (part): part is string => !!part,
    );

    return parts.length > 0 ? parts.join(' ') : null;
  }

  /**
   * Method inspectorAvatarFallback
   *
   * @description
   * The inspector's avatar fallback, or `'?'` when the inspection carries no inspector.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {InspectorOutput | null} inspector - The inspection row's `inspector`.
   *
   * @returns {string} The 1–2 letter fallback.
   */
  protected inspectorAvatarFallback(inspector: InspectorOutput | null): string {
    return inspector ? this.getInitials(inspector.displayName) : '?';
  }

  /**
   * Method formatRelativeAge
   *
   * @description
   * Renders an ISO 8601 timestamp as a localized relative label ("3 days ago"), for the compliance
   * freshness lines.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {string} iso - ISO 8601 timestamp to compare against now.
   *
   * @returns {string} The relative label.
   */
  protected formatRelativeAge(iso: string): string {
    return formatRelativeTime(iso, this.locale);
  }

  /**
   * Method onNodeSelected
   *
   * @description
   * Scopes the right pane to the selected facility.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TreeNode<FacilityOutput>} node - The selected tree node.
   *
   * @returns {void}
   */
  protected onNodeSelected(node: TreeNode<FacilityOutput>): void {
    this.facilityBrowserVisible.set(false);
    this.focusExplorerTarget('[data-testid="assets-back-to-tree"]');
    this.selectedFacilityId.set(node.id);
    this.writeUrlState();
  }

  /**
   * Method clearFacilitySelection
   *
   * @description
   * Returns mobile operators to the mounted hierarchy and clears the URL-backed selection.
   * Expanded branches stay mounted, while a new selection starts with its first page.
   *
   * @access protected
   * @since 2.1.0
   *
   * @returns {void}
   */
  protected clearFacilitySelection(): void {
    this.facilityBrowserVisible.set(true);
    this.selectedFacilityId.set(null);
    this.writeUrlState();
    this.focusExplorerTarget('[data-testid="assets-tree-panel"] [data-testid="tree-item"]');
  }

  /**
   * Method clearComplianceSelection
   * @method clearComplianceSelection
   *
   * @description
   * Returns to compliance browsing and clears the URL-backed summary selection.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected clearComplianceSelection(): void {
    this.complianceBrowserVisible.set(true);
    this.selectedComplianceFacilityId.set(null);
    this.writeUrlState();
    this.focusExplorerTarget(
      '[data-testid="assets-compliance-tree-panel"] [data-testid="tree-item"]',
    );
  }

  /**
   * Method focusExplorerTarget
   * @method focusExplorerTarget
   *
   * @description
   * Moves focus into the newly visible pane after rendering, browser-only.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} selector - The local return button or selected hierarchy row.
   *
   * @returns {void}
   */
  private focusExplorerTarget(selector: string): void {
    if (!this.isMobileInteractionMode()) return;
    afterNextRender(
      () => this.element.nativeElement.querySelector<HTMLElement>(selector)?.focus(),
      { injector: this.injector },
    );
  }

  /**
   * Method createScopeParams
   * @method createScopeParams
   *
   * @description
   * The query params a creation link carries: `create=1` opens the list's
   * creation sheet on arrival, and the selected site scopes it so the new
   * record lands where the operator is looking.
   * The two creation forms name the site differently — equipment owns a
   * `facility`, a site owns a `parent` — so the caller states which key it
   * needs rather than the explorer guessing from the button.
   *
   * @access protected
   * @since 2.0.0
   *
   * @param {'facility' | 'parent'} key - The param name the target form reads.
   *
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
   *
   * @returns {void}
   */
  private writeUrlState(): void {
    const axis: OrganizationAssetsAxis = this.axis();
    const equipmentScope: 'subtree' | 'direct' = this.equipmentIncludeDescendants()
      ? 'subtree'
      : 'direct';

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        axis: axis === 'site' ? null : axis,
        family: this.family() === 'all' ? 'all' : null,
        customerId: this.customerId() || null,
        queue: this.queue() || null,
        facility: axis === 'site' ? this.selectedFacilityId() : null,
        equipmentScope: axis === 'site' ? equipmentScope : null,
        compliance: axis === 'compliance' ? this.selectedComplianceFacilityId() : null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method onExpandRequested
   *
   * @description
   * Loads a node's branch, guarded against a duplicate request.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {TreeNode<FacilityOutput>} node - The node being expanded.
   *
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
   *
   * @returns {void}
   */
  protected onComplianceExpandRequested(): void {}

  /**
   * Method onNodeDropped
   *
   * @description
   * Re-parents a facility dragged onto another — the tree's pointer enhancement over the "Move to…"
   * menu action.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {TreeDropEvent<FacilityOutput>} event - The completed drag-drop.
   *
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
   *
   * @description
   * Opens the "Move to…" dialog for a node, from the tree row's menu.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {TreeNode<FacilityOutput>} node - The node to move.
   *
   * @returns {void}
   */
  protected onMoveRequested(node: TreeNode<FacilityOutput>): void {
    if (!this.canMoveFacilities()) return;
    this.tree.resetMoveOperation();
    this.moveParents.load({ organizationId: this.organizationId(), parentForFacilityId: node.id });
    this.moveParents.ensureSelected({
      organizationId: this.organizationId(),
      facilityId: node.data.parentFacilityId,
    });
    this.moveTarget.set({
      facilityId: node.id,
      facilityName: node.label,
      facilityType: node.data.type,
      currentParentFacilityId: node.data.parentFacilityId,
    });
  }

  /**
   * Method onMoveSubmitted
   *
   * @description
   * Calls the same re-parent flow as pointer drag-drop, then closes the dialog.
   *
   * @access protected
   * @since 1.1.0
   *
   * @param {FacilityMoveSubmittedEvent} event - The picked target.
   *
   * @returns {void}
   */
  protected onMoveSubmitted(event: FacilityMoveSubmittedEvent): void {
    if (!this.canMoveFacilities() || this.tree.isMoving()) return;
    this.tree.move({
      organizationId: this.organizationId(),
      facilityId: event.facilityId,
      parentFacilityId: event.parentFacilityId,
    });
  }

  /**
   * Method onMoveDismissed
   *
   * @description
   * Closes the "Move to…" dialog without moving anything.
   *
   * @access protected
   * @since 1.1.0
   *
   * @returns {void}
   */
  protected onMoveDismissed(): void {
    if (!this.tree.isMoving()) this.moveTarget.set(null);
  }

  /**
   * Method onDuplicateRequested
   *
   * @description
   * Duplicates a node's subtree — the tree row menu's "Duplicate" action. No confirmation dialog:
   * the action is not destructive.
   *
   * @access protected
   * @since 1.3.0
   *
   * @param {TreeNode<FacilityOutput>} node - The node to duplicate.
   *
   * @returns {void}
   */
  protected onDuplicateRequested(node: TreeNode<FacilityOutput>): void {
    this.tree.duplicate({ organizationId: this.organizationId(), facilityId: node.id });
  }
  //#endregion

  /**
   * Method onMoveSearchChanged
   *
   * @description
   * Searches all server-admissible parents, including unloaded branches.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} search - search.
   *
   * @returns {void} Return value.
   */
  protected onMoveSearchChanged(search: string): void {
    this.moveParents.searchOptions({ organizationId: this.organizationId(), search, page: 1 });
  }
  /**
   * Method onMovePageChanged
   *
   * @description
   * Retrieves another parent candidate page without losing the draft.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - page.
   *
   * @returns {void} Return value.
   */
  protected onMovePageChanged(page: number): void {
    this.moveParents.load({
      organizationId: this.organizationId(),
      search: this.moveParents.search(),
      page,
    });
  }
  /**
   * Method loadMoreRoots
   *
   * @description
   * Loads a further root page, retaining existing tree rows.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Return value.
   */
  protected loadMoreRoots(): void {
    this.tree.loadMoreRoots(this.organizationId());
  }
  /**
   * Method loadMoreChildren
   *
   * @description
   * Loads a further page of the requested branch.
   *
   * @access protected
   * @since unreleased
   *
   * @param {Event} event - event.
   * @param {string} facilityId - facilityId.
   *
   * @returns {void} Return value.
   */
  protected loadMoreChildren(event: Event, facilityId: string): void {
    event.stopPropagation();
    this.tree.loadMoreChildren({ organizationId: this.organizationId(), facilityId });
  }
  /**
   * Method changeEquipmentScope
   *
   * @description
   * Changes equipment scope and persists the shareable browse state.
   *
   * @access protected
   * @since unreleased
   *
   * @param {boolean} includeDescendants - includeDescendants.
   *
   * @returns {void} Return value.
   */
  protected changeEquipmentScope(includeDescendants: boolean): void {
    this.equipmentIncludeDescendants.set(includeDescendants);
    this.writeUrlState();
  }
  /**
   * Method onBranchRetryRequested
   *
   * @description
   * Retries the failed branch page, keeping existing children after append failures.
   * Retries the failed branch page, keeping existing children after append failures.
   *
   * @access protected
   * @since unreleased
   *
   * @param {TreeNode<FacilityOutput>} node - node.
   *
   * @returns {void} Return value.
   */
  protected onBranchRetryRequested(node: TreeNode<FacilityOutput>): void {
    if (this.tree.canLoadMoreChildren(node.id))
      this.tree.loadMoreChildren({ organizationId: this.organizationId(), facilityId: node.id });
    else
      this.tree.ensureChildrenLoaded({
        organizationId: this.organizationId(),
        facilityId: node.id,
      });
  }
  //#region Private methods
  /**
   * Method ensureComplianceTreeLoaded
   *
   * @description
   * Loads the compliance hierarchy and authorized archive list on first activation.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private ensureComplianceTreeLoaded(): void {
    if (this.hasRequestedComplianceTree()) return;
    this.hasRequestedComplianceTree.set(true);
    this.compliance.loadTree(this.organizationId());
    if (this.canExportCompliance()) this.compliance.loadSnapshots(this.organizationId());
  }

  /**
   * Method isLoadedDescendant
   *
   * @description
   * Whether `id` sits under `ancestorId` in the currently loaded part of the tree.
   *
   * @access private
   * @since 1.1.0
   *
   * @param {string} ancestorId - The candidate ancestor's id.
   * @param {string} id - The id being searched for.
   *
   * @returns {boolean} Whether `id` is a loaded descendant of `ancestorId`.
   */
  private isLoadedDescendant(ancestorId: string, id: string): boolean {
    const children: readonly FacilityOutput[] = this.tree.childrenByParent()[ancestorId] ?? [];

    return children.some((child) => child.id === id || this.isLoadedDescendant(child.id, id));
  }
  //#endregion
}
