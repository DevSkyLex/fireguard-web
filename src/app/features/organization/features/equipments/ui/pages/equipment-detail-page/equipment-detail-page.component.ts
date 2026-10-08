import { isPlatformBrowser } from '@angular/common';
import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
  type InputSignal,
  type Signal,
  type TemplateRef,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideCircleAlert,
  lucideDownload,
  lucideMapPin,
  lucidePencil,
  lucideWrench,
  lucideArchive,
  lucideEllipsis,
} from '@ng-icons/lucide';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { PageTabsService, registerPageTabs } from '@core/page-tabs';
import { isCallPending, isCallSuccess, type CallState } from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import { EquipmentService } from '@features/organization/features/equipments/data-access';
import type {
  EquipmentAttachmentOutput,
  EquipmentEditState,
  EquipmentEditTarget,
  EquipmentOutput,
  EquipmentTagOutput,
  UpdateEquipmentInput,
  ReplacementEquipmentInput,
  ReplaceEquipmentInput,
} from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
  EquipmentTypeCatalogStore,
  EquipmentReplacementStore,
  type EquipmentReplacementStoreType,
  type EquipmentTypeCatalogStoreType,
  EquipmentInspectionSummaryStore,
  EquipmentOpenWorkStore,
  type EquipmentStoreType,
} from '@features/organization/features/equipments/state';
import {
  buildEquipmentTitle,
  fileToBase64,
} from '@features/organization/features/equipments/utils';
import type { FacilityOption } from '@features/organization/features/facilities/models';
import { FacilityOptionsStore } from '@features/organization/features/facilities/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { resolveCsvExportErrorDetail } from '@features/organization/utils';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { formatRelativeTime } from '@shared/relative-time';
import { HlmBadgeImports } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSeparator } from '@shared/ui/separator';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTabsImports } from '@shared/ui/tabs';
import { HlmTooltipImports } from '@shared/ui/tooltip';
import { EquipmentAttachments } from '../../components/equipment-attachments';
import { EquipmentInformationPanel } from '../../components/equipment-information-panel';
import { EquipmentMaintenanceHistory } from '../../components/equipment-maintenance-history';
import { EquipmentStatusTag } from '../../components/equipment-status-tag';
import { EquipmentTags } from '../../components/equipment-tags';
import { EquipmentAssignFacilityDialog } from '../../dialogs/equipment-assign-facility-dialog';
import { EquipmentDecommissionDialog } from '../../dialogs/equipment-decommission-dialog';
import { EquipmentReplacementConfirmDialog } from '../../dialogs/equipment-replacement-confirm-dialog';
import { EquipmentCharacteristicsForm } from '../../forms/equipment-characteristics-form';
import { EquipmentReplacementSheet } from '../../sheets/equipment-replacement-sheet';
import type { EquipmentDetailTabId } from './models';

/**
 * Constant IDLE_EDIT_STATE
 *
 * @description
 * The equipment properties this page has open, writing or showing a rejection.
 */
const IDLE_EDIT_STATE: EquipmentEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

/**
 * Component EquipmentDetailPage
 * @class EquipmentDetailPage
 *
 * @description
 * Route entry page for one equipment record
 * (`/organizations/:organizationId/equipments/:equipmentId`). Everything
 * writable is edited right here — there is no edit page and no planning
 * wizard (`FEATURE.md` "The record is the edit surface"): a header naming
 * the record, a lifecycle status band naming the single relevant forward
 * transition for the current status as the primary action (commission,
 * resume service, or move to maintenance) with Decommission as the
 * secondary, and {@link EquipmentInformationPanel} for the identification
 * fields.
 * `equipmentResolver` (route `resolve`) seeds {@link ActiveEquipmentStore}
 * fire-and-forget, so this page always renders immediately: the full-page
 * skeleton shows from the store's pending state until the record lands, and
 * a load failure shows the Spartan `hlmEmpty` error composition with a retry that re-runs
 * {@link ActiveEquipmentStore}'s resolve (`DESIGN.md` "Detail-page gating")
 * rather than leaving the operator on an eternal skeleton or navigating them
 * away silently. A route-scoped {@link EquipmentStore} carries the update and
 * lifecycle writes.
 * The record's name is the shell breadcrumb's title, resolved by
 * `equipmentTitleResolver`; the status tags and meta line stay as a lead
 * group at content top, and the lifecycle band registers on the shell header
 * through `PageActionsService`. The facility name itself links to the
 * owning facility's own record when one is assigned. When `planPosition` is
 * set — populated only on this detail read — a read-only "Pinned on floor
 * plan" indicator sits beside it, linking to the same facility; pin
 * placement itself is edited from the facility's Plans tab, not here. A
 * quiet "Interventions on this equipment's site" proxy link — shown only
 * when a facility is assigned — points at the interventions list
 * pre-filtered by that facility's `site`; it is a proxy by site, not a
 * filter by equipment, and is labelled as such.
 * A paginated Spartan `line` list beneath the shell page title exposes three
 * tabs beyond the identification fields (**Overview**): **Attachments**
 * ({@link EquipmentAttachments}, base64-JSON wire — see
 * {@link onAttachmentFilesPicked}), **Maintenance**
 * ({@link EquipmentMaintenanceHistory}, read-only), and **Tags**
 * ({@link EquipmentTags}). Facility assignment gets its own dialog
 * ({@link EquipmentAssignFacilityDialog}) opened from the header's facility
 * row rather than a fifth tab, since it is a single pick/clear action, not a
 * browsing surface; its facility options come from the `facilities`
 * subfeature's read-only `FacilityService.list` (`FEATURE.md`
 * "Cross-Feature Dependencies"), mirroring `maintenance-schedules`'
 * `MaintenanceSchedulesPage`. Each of the three data tabs loads once, on its
 * own first activation ({@link onTabActivated}), matching
 * `FacilityDetailPage`'s Plans tab.
 *
 * @version 1.7.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-detail-page',
  imports: [
    NgIcon,
    ...HlmEmptyImports,
    ...HlmDropdownMenuImports,
    RouterLink,
    EquipmentAssignFacilityDialog,
    EquipmentAttachments,
    EquipmentDecommissionDialog,
    EquipmentReplacementConfirmDialog,
    EquipmentInformationPanel,
    EquipmentCharacteristicsForm,
    EquipmentReplacementSheet,
    EquipmentMaintenanceHistory,
    EquipmentStatusTag,
    EquipmentTags,
    ...HlmBadgeImports,
    HlmButton,
    HlmSeparator,
    OrgDatePipe,
    HlmSkeleton,
    ...HlmSpinnerImports,
    ...HlmTabsImports,
    ...HlmTooltipImports,
  ],
  providers: [
    EquipmentTypeCatalogStore,
    EquipmentReplacementStore,
    EquipmentInspectionSummaryStore,
    EquipmentOpenWorkStore,
    FacilityOptionsStore,

    provideIcons({
      lucideCircleAlert,
      lucideDownload,
      lucideMapPin,
      lucidePencil,
      lucideWrench,
      lucideArchive,
      lucideEllipsis,
    }),
  ],
  templateUrl: './equipment-detail-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentDetailPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * The workspace owning this equipment, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property selectedEquipment
   * @readonly
   *
   * @description
   * Only exposes the active record when it belongs to this route's organization and equipment.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<EquipmentOutput | null>}
   */
  protected readonly selectedEquipment: Signal<EquipmentOutput | null> = computed(() => {
    const equipment = this.activeEquipmentStore.selectedEquipment();
    return equipment?.id === this.equipmentId() &&
      equipment.organizationId === this.organizationId()
      ? equipment
      : null;
  });

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * The resolved equipment's id, bound from the route.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {InputSignal<string>}
   */
  public readonly equipmentId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /**
   * Property canReadMaintenance
   * @readonly
   *
   * @description
   * Controls access to the independently owned maintenance plan library.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadMaintenance: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.MAINTENANCE_READ),
  );
  /**
   * Property openWorkStore
   * @readonly
   *
   * @description
   * Authorized work lookup consumed before suggesting a new intervention.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InstanceType<typeof EquipmentOpenWorkStore>}
   */
  protected readonly openWorkStore: InstanceType<typeof EquipmentOpenWorkStore> =
    inject(EquipmentOpenWorkStore);

  /**
   * Property canReadWork
   * @readonly
   *
   * @description
   * Work access is independent of equipment read access.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadWork: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_READ),
  );

  /**
   * Property canCreateWork
   * @readonly
   *
   * @description
   * Allows work preparation only after the authorized lookup can be consulted.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canCreateWork: Signal<boolean> = computed(
    () =>
      this.canReadWork() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INTERVENTIONS_WRITE) &&
      this.selectedEquipment()?.status !== 'decommissioned',
  );

  /**
   * Property workActions
   * @readonly
   *
   * @description
   * Equipment-targeted actions using the intervention feature's published deep-link contract.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<
   *   readonly {
   *     readonly action: string;
   *     readonly label: string;
   *     readonly route: readonly string[];
   *     readonly params: Readonly<Record<string, string | null>>;
   *   }[]
   * >}
   */
  protected readonly workActions: Signal<
    readonly {
      readonly action: string;
      readonly label: string;
      readonly route: readonly string[];
      readonly params: Readonly<Record<string, string | null>>;
    }[]
  > = computed(() => {
    const definitions = [
      {
        action: 'inspection',
        label: $localize`:@@equipment.work.prepareControl:Prepare a control`,
      },
      {
        action: 'maintenance',
        label: $localize`:@@equipment.work.prepareMaintenance:Prepare maintenance`,
      },
      { action: 'repair', label: $localize`:@@equipment.work.prepareRepair:Organize a repair` },
    ];
    const work = this.openWorkStore.queryData() ?? [];
    return definitions.map((entry) => {
      const existing = work.find((item) => item.action === entry.action);
      return {
        action: entry.action,
        label: entry.label,
        route: existing
          ? ['/organizations', this.organizationId(), 'interventions', existing.interventionId]
          : ['/organizations', this.organizationId(), 'interventions'],
        params: {
          create: existing ? null : '1',
          targetEquipment: this.equipmentId(),
          workAction: entry.action,
        },
      };
    });
  });
  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Secondary inspection evidence is loaded only in the browser.
   *
   * @access private
   * @since unreleased
   *
   * @type {object}
   */
  private readonly platformId: object = inject(PLATFORM_ID);

  /**
   * Property inspectionSummaryStore
   * @readonly
   *
   * @description
   * Authorized last-control evidence and exact anomaly counts.
   *
   * @access protected
   * @since unreleased
   *
   * @type {InstanceType<typeof EquipmentInspectionSummaryStore>}
   */
  protected readonly inspectionSummaryStore: InstanceType<typeof EquipmentInspectionSummaryStore> =
    inject(EquipmentInspectionSummaryStore);

  /**
   * Property canReadInspections
   * @readonly
   *
   * @description
   * Evidence access is independent of equipment access.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReadInspections: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_READ),
  );

  /**
   * Property canReportDefect
   * @readonly
   *
   * @description
   * Allows an observed defect to be recorded through the existing inspection evidence workflow.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canReportDefect: Signal<boolean> = computed(
    () =>
      this.canReadInspections() &&
      this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );

  /**
   * Property canRequestRepair
   * @readonly
   *
   * @description
   * Opens the equipment-scoped request queue with existing requests visible before creation.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  protected readonly canRequestRepair: Signal<boolean> = computed(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.SERVICE_REQUESTS_CREATE),
  );
  /**
   * Property replacementStore
   * @readonly
   *
   * @description
   * Independent candidate query and atomic replacement command state.
   *
   * @access protected
   * @since unreleased
   *
   * @type {EquipmentReplacementStoreType}
   */
  protected readonly replacementStore: EquipmentReplacementStoreType =
    inject(EquipmentReplacementStore);

  /**
   * Property replacementVisible
   * @readonly
   *
   * @description
   * Whether the terminal replacement confirmation is displayed.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly replacementVisible: WritableSignal<boolean> = signal(false);

  /**
   * Property stagedReplacement
   * @readonly
   *
   * @description
   * Draft command requiring terminal-action confirmation before submission.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReplaceEquipmentInput | null>}
   */
  protected readonly stagedReplacement: WritableSignal<ReplaceEquipmentInput | null> =
    signal<ReplaceEquipmentInput | null>(null);

  /**
   * Property replacementOperationId
   *
   * @description
   * Stable operation identifier retained across retries of an uncertain write.
   *
   * @access private
   * @since unreleased
   *
   * @type {string | null}
   */
  private replacementOperationId: string | null = null;
  /**
   * Property typeCatalog
   * @readonly
   *
   * @description
   * Server-owned types retained for historical record labels.
   *
   * @access protected
   * @since unreleased
   *
   * @type {EquipmentTypeCatalogStoreType}
   */
  protected readonly typeCatalog: EquipmentTypeCatalogStoreType = inject(EquipmentTypeCatalogStore);

  /**
   * Property criticalityLabel
   * @readonly
   *
   * @description
   * Human-readable declared impact; unknown impact is never inferred.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly criticalityLabel: Signal<string> = computed(() => {
    const criticality = this.selectedEquipment()?.criticality;
    const labels = {
      low: $localize`:@@equipment.criticality.low:Low`,
      medium: $localize`:@@equipment.criticality.medium:Medium`,
      high: $localize`:@@equipment.criticality.high:High`,
      critical: $localize`:@@equipment.criticality.critical:Critical`,
    };
    return criticality
      ? labels[criticality]
      : $localize`:@@equipment.criticality.unknown:Not specified`;
  });
  /**
   * Property activeEquipmentStore
   * @readonly
   *
   * @description
   * The currently active equipment, seeded by `equipmentResolver`; null until the fetch lands.
   *
   * @access protected
   * @since unreleased
   *
   * @type {ActiveEquipmentStore}
   */
  protected readonly activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);

  /**
   * Property store
   * @readonly
   *
   * @description
   * The route-scoped store carrying the update and lifecycle writes.
   *
   * @access protected
   * @since unreleased
   *
   * @type {EquipmentStoreType}
   */
  protected readonly store: EquipmentStoreType = inject<EquipmentStoreType>(EquipmentStore);

  /**
   * Property titleService
   * @readonly
   *
   * @description
   * Document title channel, kept in sync with the loaded record.
   *
   * @access private
   * @since unreleased
   *
   * @type {TitleService}
   */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);

  /**
   * Property permissions
   * @readonly
   *
   * @description
   * Organization permission checks gating every write on this page.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationPermissionService}
   */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /**
   * Property locale
   * @readonly
   *
   * @description
   * The application's language, used to phrase the header's metadata line.
   *
   * @access private
   * @since unreleased
   *
   * @type {string}
   */
  private readonly locale: string = inject<string>(LOCALE_ID);

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
   * @since 1.6.0
   *
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property facilityOptionsStore
   * @readonly
   *
   * @description
   * The `facilities` subfeature's read-only listing service, consumed
   * directly for the assignment dialog's facility options — an approved
   * cross-feature dependency (`FEATURE.md` "Cross-Feature Dependencies"),
   * mirroring `MaintenanceSchedulesPage`.
   *
   * @access private
   * @since unreleased
   *
   * @type {FacilityOptionsStore}
   */
  private readonly facilityOptionsStore: FacilityOptionsStore =
    inject<FacilityOptionsStore>(FacilityOptionsStore);

  /**
   * Property equipmentService
   * @readonly
   *
   * @description
   * The equipment transport service, injected directly (not through the
   * store) for the one-shot attachment-download fetch — a download changes
   * no persisted state, so it does not belong in `EquipmentStore`, mirroring
   * `InterventionDetailPage`'s `downloadAttachment`.
   *
   * @access private
   * @since unreleased
   *
   * @type {EquipmentService}
   */
  private readonly equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService);

  /**
   * Property browserDownload
   * @readonly
   *
   * @description
   * Saves a fetched attachment blob to the visitor's device.
   *
   * @access private
   * @since unreleased
   *
   * @type {BrowserDownloadService}
   */
  private readonly browserDownload: BrowserDownloadService =
    inject<BrowserDownloadService>(BrowserDownloadService);

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * Global toast feedback for the sheet export's error path.
   *
   * @access private
   * @since unreleased
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /**
   * Property reportExporting
   * @readonly
   *
   * @description
   * Whether the equipment sheet's PDF export is currently in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly reportExporting: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * For cancelling in-flight downloads when the page is destroyed.
   *
   * @access private
   * @since unreleased
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property editState
   * @readonly
   *
   * @description
   * Which in-place field is open, writing, or showing a rejection.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<EquipmentEditState>}
   */
  protected readonly editState: WritableSignal<EquipmentEditState> =
    signal<EquipmentEditState>(IDLE_EDIT_STATE);

  /**
   * Property activeTab
   * @readonly
   *
   * @description
   * Which tab is showing.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<EquipmentDetailTabId>}
   */
  protected readonly activeTab: WritableSignal<EquipmentDetailTabId> =
    signal<EquipmentDetailTabId>('overview');

  /**
   * Property tabsLoaded
   * @readonly
   *
   * @description
   * Ids of the tabs whose data has already been requested, so a re-activation never re-fetches.
   *
   * @access private
   * @since unreleased
   *
   * @type {Set<EquipmentDetailTabId>}
   */
  private readonly tabsLoaded: Set<EquipmentDetailTabId> = new Set<EquipmentDetailTabId>();

  /**
   * Property pendingAttachmentDeleteIds
   * @readonly
   *
   * @description
   * Ids of the attachments whose delete is in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly pendingAttachmentDeleteIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /**
   * Property pendingAttachmentDownloadIds
   * @readonly
   *
   * @description
   * Ids of the attachments whose download is in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly pendingAttachmentDownloadIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /**
   * Property pendingTagRemoveIds
   * @readonly
   *
   * @description
   * Ids of the tags whose removal is in flight.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<ReadonlySet<string>>}
   */
  protected readonly pendingTagRemoveIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /**
   * Property facilityOptions
   * @readonly
   *
   * @description
   * The organization's facilities, preloaded for the assignment dialog.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<readonly FacilityOption[]>}
   */
  protected readonly facilityOptions: Signal<readonly FacilityOption[]> = computed(() =>
    this.facilityOptionsStore.options(),
  );

  /**
   * Property assignFacilityDialogVisible
   * @readonly
   *
   * @description
   * Whether the facility assignment dialog is open.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly assignFacilityDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property decommissionDialogVisible
   * @readonly
   *
   * @description
   * Whether the decommission confirmation is open.
   *
   * @access protected
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly decommissionDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property skeletonFieldRows
   * @readonly
   *
   * @description
   * Placeholder count for the loading skeleton's field rows, mirroring
   * `EquipmentInformationPanel`'s row count.
   *
   * @access protected
   * @since 1.6.0
   *
   * @type {readonly number[]}
   */
  protected readonly skeletonFieldRows: readonly number[] = [0, 1, 2, 3, 4, 5];

  /**
   * Property canWrite
   * @readonly
   *
   * @description
   * Whether the member may write to this equipment at all.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /**
   * Property title
   * @readonly
   *
   * @description
   * The record's own display title.
   *
   * @access protected
   * @since unreleased
   *
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed<string>(() => {
    const equipment: EquipmentOutput | null = this.selectedEquipment();

    return equipment
      ? buildEquipmentTitle(
          equipment,
          this.typeCatalog.options().find((entry) => entry.value === equipment.type)?.label,
        )
      : '';
  });

  /**
   * Property primaryAction
   * @readonly
   *
   * @description
   * The single relevant forward transition for the current status, or
   * `null` in the terminal `decommissioned` state. Reads `status` only, no
   * per-status template branching (`FEATURE.md`).
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ readonly label: string; readonly run: () => void } | null>}
   */
  protected readonly primaryAction: Signal<{
    readonly label: string;
    readonly run: () => void;
  } | null> = computed(() => {
    const equipment: EquipmentOutput | null = this.selectedEquipment();
    if (!equipment) return null;

    switch (equipment.status) {
      case 'in_stock':
        return {
          label: $localize`:@@equipment.commission:Commission`,
          run: () => this.runLifecycle(() => this.store.commission(this.lifecycleArgs())),
        };
      case 'under_maintenance':
        return {
          label: $localize`:@@equipment.resumeService:Resume service`,
          run: () => this.runLifecycle(() => this.store.commission(this.lifecycleArgs())),
        };
      case 'operational':
        return {
          label: $localize`:@@equipment.maintenance:Maintenance`,
          run: () => this.runLifecycle(() => this.store.maintenance(this.lifecycleArgs())),
        };
      case 'decommissioned':
        return null;
    }
  });

  /**
   * Property canDecommission
   * @readonly
   *
   * @description
   * Whether the secondary Decommission action applies — every status but the terminal one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly canDecommission: Signal<boolean> = computed<boolean>(
    () => this.selectedEquipment()?.status !== 'decommissioned',
  );

  /**
   * Property pageActionsService
   * @readonly
   *
   * @description
   * Registers {@link pageActions} on the shell header.
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
   * The lifecycle band, registered on the shell header instead of an in-page title band.
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
   * Shell registry receiving the equipment detail sections.
   *
   * @access private
   * @since 1.5.0
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
   * @since 1.5.0
   *
   * @type {Signal<TemplateRef<unknown> | undefined>}
   */
  private readonly pageTabs: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageTabs');
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Settles the open in-place field once its own write clears, re-sets the
   * document title once the seeded record lands (the title resolver only
   * returned the neutral section label) — a load failure is left to the
   * template's the Spartan `hlmEmpty` error composition branch and {@link retryLoad}, the global
   * feedback listener already toasts the failure — and registers
   * {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    const destroyRef: DestroyRef = inject(DestroyRef);
    registerPageActions(this.pageActions, this.pageActionsService, destroyRef);
    registerPageTabs(this.pageTabs, this.pageTabsService, destroyRef);

    effect(() => {
      this.organizationId();
      this.equipmentId();
      untracked(() => {
        this.editState.set(IDLE_EDIT_STATE);
        this.assignFacilityDialogVisible.set(false);
        this.decommissionDialogVisible.set(false);
        this.stagedReplacement.set(null);
        this.replacementVisible.set(false);
        this.tabsLoaded.clear();
      });
    });

    effect(() => {
      const equipment = this.selectedEquipment();
      const allowed = this.canReadWork();
      if (!isPlatformBrowser(this.platformId) || !allowed || equipment?.id !== this.equipmentId())
        return;
      const organizationId = this.organizationId();
      untracked(() => this.openWorkStore.load({ organizationId, equipmentId: equipment.id }));
    });

    effect(() => {
      const equipment = this.selectedEquipment();
      const permitted = this.canReadInspections();
      if (!isPlatformBrowser(this.platformId) || !permitted || equipment?.id !== this.equipmentId())
        return;
      const organizationId = this.organizationId();
      untracked(() =>
        this.inspectionSummaryStore.load({ organizationId, equipmentId: equipment.id }),
      );
    });

    effect(() => {
      const state = this.replacementStore.replaceCallState();
      if (state.status !== 'success' || state.data?.predecessorEquipmentId !== this.equipmentId())
        return;
      untracked(() => {
        this.replacementVisible.set(false);
        this.replacementOperationId = null;
      });
    });

    effect((): void => {
      const callState: CallState<EquipmentOutput | null> = this.store.updateCallState();

      untracked((): void => this.settleUpdateWrite(callState));
    });

    effect((): void => {
      const title: string = this.title();
      if (!title) return;

      untracked((): void => this.titleService.setTitle(title));
    });

    effect((): void => {
      const organizationId: string = this.organizationId();

      untracked((): void => this.facilityOptionsStore.ensureLoaded(organizationId));
      untracked((): void => {
        this.typeCatalog.load(organizationId);
      });
    });

    effect((): void => {
      const state: CallState = this.store.deleteAttachmentCallState();
      if (isCallPending(state)) return;

      untracked((): void => this.pendingAttachmentDeleteIds.set(new Set<string>()));
    });

    effect((): void => {
      const state: CallState = this.store.removeTagCallState();
      if (isCallPending(state)) return;

      untracked((): void => this.pendingTagRemoveIds.set(new Set<string>()));
    });

    effect((): void => {
      const assignState: CallState<EquipmentOutput | null> = this.store.assignToFacilityCallState();
      const unassignState: CallState<EquipmentOutput | null> =
        this.store.unassignFromFacilityCallState();

      untracked((): void => {
        if (isCallSuccess(assignState) || isCallSuccess(unassignState)) {
          this.assignFacilityDialogVisible.set(false);
        }
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method openReplacement
   * @method openReplacement
   *
   * @description
   * Opens confirmation and loads reserve candidates without changing the equipment.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result of the operation.
   */
  protected openReplacement(): void {
    if (!this.canWrite() || this.store.isChangingLifecycle()) return;
    this.replacementStore.reset();
    this.replacementOperationId ??= crypto.randomUUID();
    this.replacementVisible.set(true);
    this.loadReplacementCandidates(1);
  }

  /**
   * Method loadReplacementCandidates
   * @method loadReplacementCandidates
   *
   * @description
   * Reads a page of reserve equipment within the active organization.
   *
   * @access protected
   * @since unreleased
   *
   * @param {number} page - page.
   * @param {string} search - search.
   *
   * @returns {void} Result of the operation.
   */
  protected loadReplacementCandidates(
    page: number,
    search: string = this.replacementStore.search(),
  ): void {
    this.replacementStore.loadCandidates({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      page,
      search,
    });
  }

  /**
   * Method replaceWithExisting
   * @method replaceWithExisting
   *
   * @description
   * Confirms replacement by an existing reserve identity.
   *
   * @access protected
   * @since unreleased
   *
   * @param {string} successorEquipmentId - successor equipment id.
   *
   * @returns {void} Result of the operation.
   */
  protected replaceWithExisting(successorEquipmentId: string): void {
    this.stagedReplacement.set({
      clientOperationId: this.replacementOperationId ?? crypto.randomUUID(),
      successorEquipmentId,
    });
  }

  /**
   * Method replaceWithNew
   * @method replaceWithNew
   *
   * @description
   * Confirms atomic creation and replacement without a separate create call.
   *
   * @access protected
   * @since unreleased
   *
   * @param {ReplacementEquipmentInput} successor - successor.
   *
   * @returns {void} Result of the operation.
   */
  protected replaceWithNew(successor: ReplacementEquipmentInput): void {
    this.stagedReplacement.set({
      clientOperationId: this.replacementOperationId ?? crypto.randomUUID(),
      successor,
    });
  }

  /**
   * Method retryReplacement
   * @method retryReplacement
   *
   * @description
   * Replays the exact immutable operation after an uncertain response.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result of the operation.
   */
  protected retryReplacement(): void {
    if (
      this.replacementStore.commandEquipmentId() !== this.equipmentId() ||
      this.replacementStore.commandOrganizationId() !== this.organizationId()
    )
      return;
    const command = this.replacementStore.command();
    if (command) this.submitReplacement(command);
  }

  /**
   * Method confirmReplacement
   * @method confirmReplacement
   *
   * @description
   * Executes the explicitly confirmed command while retaining the original draft.
   *
   * @access protected
   * @since unreleased
   *
   * @returns {void} Result of the operation.
   */
  protected confirmReplacement(): void {
    const command = this.stagedReplacement();
    if (!command) return;
    this.stagedReplacement.set(null);
    this.submitReplacement(command);
  }

  /**
   * Method submitReplacement
   * @method submitReplacement
   *
   * @description
   * Refuses concurrent writes and retains the operation identifier until acknowledgement.
   *
   * @access private
   * @since unreleased
   *
   * @param {ReplaceEquipmentInput} payload - Confirmed immutable replacement command.
   *
   * @returns {void} Result of the operation.
   */
  private submitReplacement(payload: ReplaceEquipmentInput): void {
    if (
      !this.canWrite() ||
      this.store.isChangingLifecycle() ||
      this.replacementStore.replaceCallState().status === 'pending'
    )
      return;
    if (
      this.replacementStore.replaceCallState().status === 'error' &&
      !this.replacementStore.replaceCallState().error?.retryable
    )
      this.replacementStore.reset();
    this.replacementOperationId = payload.clientOperationId;
    this.replacementStore.replace({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      input: payload,
    });
  }
  /**
   * Method onEditTargetChanged
   * @method onEditTargetChanged
   *
   * @description
   * Opens or closes an in-place field, clearing any rejection left from the previous attempt.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {EquipmentEditTarget | null} target - The field to open, or null to close.
   *
   * @returns {void}
   */
  protected onEditTargetChanged(target: EquipmentEditTarget | null): void {
    this.editState.set({ open: target, saving: null, failed: null, failure: null });
  }

  /**
   * Method retryLoad
   * @method retryLoad
   *
   * @description
   * The load-failed state's retry — re-runs {@link ActiveEquipmentStore}'s resolve for this record.
   *
   * @access protected
   * @since 1.2.0
   *
   * @returns {void}
   */
  protected retryLoad(): void {
    this.activeEquipmentStore.resolveEquipment({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
    });
  }

  /**
   * Method updatedRelativeLabel
   * @method updatedRelativeLabel
   *
   * @description
   * The record's `updatedAt`, as a localized relative label ("3 days ago") — the header's visible
   * text, paired with the absolute value in a tooltip.
   *
   * @access protected
   * @since 1.6.0
   *
   * @param {string} updatedAt - The record's `updatedAt` timestamp.
   *
   * @returns {string} The localized relative label.
   */
  protected updatedRelativeLabel(updatedAt: string): string {
    return formatRelativeTime(updatedAt, this.locale);
  }

  /**
   * Method onDetailsChanged
   * @method onDetailsChanged
   *
   * @description
   * Sends an in-place patch. The field stays open until the write settles.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {UpdateEquipmentInput} patch - The single-property patch.
   *
   * @returns {void}
   */
  protected onDetailsChanged(patch: UpdateEquipmentInput): void {
    const target: EquipmentEditTarget | null = this.editState().open;
    if (target === null || !this.selectedEquipment() || isCallPending(this.store.updateCallState()))
      return;

    this.editState.set({ open: target, saving: target, failed: null, failure: null });
    this.store.update({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      input: patch,
    });
  }

  /**
   * Method onDecommission
   * @method onDecommission
   *
   * @description
   * Opens the Decommission confirmation rather than acting: the move is
   * terminal — `primaryAction()` resolves to `null` afterwards, so nothing
   * puts the record back in service — and `DESIGN.md` §Action Surfaces rule 5
   * requires every irreversible action to confirm.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected onDecommission(): void {
    if (this.store.isChangingLifecycle()) return;

    this.decommissionDialogVisible.set(true);
  }

  /**
   * Method confirmDecommission
   * @method confirmDecommission
   *
   * @description
   * Runs the confirmed Decommission, refusing it while another lifecycle write is in flight.
   *
   * @access protected
   * @since 2.0.0
   *
   * @returns {void}
   */
  protected confirmDecommission(): void {
    this.decommissionDialogVisible.set(false);
    this.runLifecycle(() => this.store.decommission(this.lifecycleArgs()));
  }

  /**
   * Method lifecycleArgs
   * @method lifecycleArgs
   *
   * @description
   * The `{ organizationId, equipmentId }` pair every lifecycle method takes.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {{ organizationId: string; equipmentId: string }} The pair.
   */
  private lifecycleArgs(): { readonly organizationId: string; readonly equipmentId: string } {
    return { organizationId: this.organizationId(), equipmentId: this.equipmentId() };
  }

  /**
   * Method runLifecycle
   * @method runLifecycle
   *
   * @description
   * Refuses a lifecycle action while another one is already in flight.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {() => void} run - The store call to make.
   *
   * @returns {void}
   */
  private runLifecycle(run: () => void): void {
    if (this.store.isChangingLifecycle() || !this.selectedEquipment()) return;

    run();
  }

  /**
   * Method settleUpdateWrite
   * @method settleUpdateWrite
   *
   * @description
   * Closes the open field on a successful write, or attributes the rejection to it.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {CallState<EquipmentOutput | null>} callState - The update write's call state.
   *
   * @returns {void}
   */
  private settleUpdateWrite(callState: CallState<EquipmentOutput | null>): void {
    if (isCallPending(callState)) return;

    const state: EquipmentEditState = this.editState();
    if (state.saving === null) return;

    const failure: string | null = callState.error?.message ?? null;
    if (failure === null) {
      this.editState.set(IDLE_EDIT_STATE);

      return;
    }

    this.editState.set({ open: state.saving, saving: null, failed: state.saving, failure });
  }

  /**
   * Method onTabActivated
   * @method onTabActivated
   *
   * @description
   * Narrows `hlm-tabs`' plain-string `tabActivated` payload before writing
   * {@link activeTab}, and loads each data tab's collection on its own first
   * activation only — {@link tabsLoaded} makes a re-activation a no-op.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {string} tab - The `hlm-tabs` id that just activated.
   *
   * @returns {void}
   */
  protected onTabActivated(tab: string): void {
    if (tab !== 'overview' && tab !== 'attachments' && tab !== 'maintenance' && tab !== 'tags') {
      return;
    }

    this.activeTab.set(tab);
    if (tab === 'overview' || this.tabsLoaded.has(tab)) return;

    this.tabsLoaded.add(tab);
    const organizationId: string = this.organizationId();
    const equipmentId: string = this.equipmentId();
    switch (tab) {
      case 'attachments':
        this.store.loadAttachments({ organizationId, equipmentId });
        break;
      case 'maintenance':
        this.store.loadMaintenanceLogs({ organizationId, equipmentId });
        break;
      case 'tags':
        this.store.loadTags({ organizationId });
        break;
    }
  }

  /**
   * Method onAttachmentFilesPicked
   * @method onAttachmentFilesPicked
   *
   * @description
   * Converts each picked file to base64 (`fileToBase64`) and adds it as an
   * attachment — `EquipmentService.addAttachment` takes base64 JSON, unlike
   * `InterventionService.uploadAttachment`'s multipart shape.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {readonly File[]} files - The picked files.
   *
   * @returns {void}
   */
  protected onAttachmentFilesPicked(files: readonly File[]): void {
    const organizationId: string = this.organizationId();
    const equipmentId: string = this.equipmentId();

    for (const file of files) {
      void fileToBase64(file).then((content) => {
        this.store.addAttachment({
          organizationId,
          equipmentId,
          input: { fileName: file.name, content, mimeType: file.type },
        });
      });
    }
  }

  /**
   * Method onAttachmentsRetried
   * @method onAttachmentsRetried
   *
   * @description
   * Re-runs the attachment list load after a failure.
   *
   * @access protected
   * @since 1.6.0
   *
   * @returns {void}
   */
  protected onAttachmentsRetried(): void {
    this.store.loadAttachments({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
    });
  }

  /**
   * Method onMaintenanceLogsRetried
   * @method onMaintenanceLogsRetried
   *
   * @description
   * Re-runs the maintenance history load after a failure.
   *
   * @access protected
   * @since 1.6.0
   *
   * @returns {void}
   */
  protected onMaintenanceLogsRetried(): void {
    this.store.loadMaintenanceLogs({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
    });
  }

  /**
   * Method onAttachmentDeleteRequested
   * @method onAttachmentDeleteRequested
   *
   * @description
   * Deletes the given attachment.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {EquipmentAttachmentOutput} attachment - The attachment to delete.
   *
   * @returns {void}
   */
  protected onAttachmentDeleteRequested(attachment: EquipmentAttachmentOutput): void {
    this.pendingAttachmentDeleteIds.update((ids: ReadonlySet<string>): ReadonlySet<string> =>
      new Set(ids).add(attachment.id),
    );
    this.store.deleteAttachment({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      attachmentId: attachment.id,
    });
  }

  /**
   * Method onAttachmentDownloadRequested
   * @method onAttachmentDownloadRequested
   *
   * @description
   * Fetches one attachment's binary content and saves it to the visitor's
   * device, locking the row on its own fetch through
   * {@link pendingAttachmentDownloadIds} rather than the store — a download
   * changes no persisted state.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {EquipmentAttachmentOutput} attachment - The attachment to download.
   *
   * @returns {void}
   */
  protected onAttachmentDownloadRequested(attachment: EquipmentAttachmentOutput): void {
    this.pendingAttachmentDownloadIds.update((ids) => new Set(ids).add(attachment.id));

    this.equipmentService
      .downloadAttachment(this.organizationId(), this.equipmentId(), attachment.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.pendingAttachmentDownloadIds.update((ids) => {
            const next: Set<string> = new Set(ids);
            next.delete(attachment.id);

            return next;
          });
          this.browserDownload.trigger(blob, attachment.fileName);
        },
        error: (): void => {
          this.pendingAttachmentDownloadIds.update((ids) => {
            const next: Set<string> = new Set(ids);
            next.delete(attachment.id);

            return next;
          });
        },
      });
  }

  /**
   * Method exportReport
   * @method exportReport
   *
   * @description
   * Fetches the equipment's PDF sheet (`EquipmentService.exportReport`) and
   * saves it to the visitor's device, locking the button on
   * {@link reportExporting} — a single boolean, since there is only one
   * sheet to export at a time — mirroring
   * `InterventionDetailPage.exportReport`'s flow. The backend additionally
   * gates the sheet on the organization's plan tier: a non-entitled plan
   * answers `403` with an RFC 7807 `detail`, surfaced verbatim in the error
   * toast through `resolveCsvExportErrorDetail` (which reads any
   * blob-wrapped problem document, not only CSV ones).
   *
   * @access protected
   * @since 1.8.0
   *
   * @returns {void}
   */
  protected exportReport(): void {
    this.reportExporting.set(true);

    this.equipmentService
      .exportReport(this.organizationId(), this.equipmentId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.reportExporting.set(false);
          this.browserDownload.trigger(blob, `equipment-${this.equipmentId()}-sheet.pdf`);
        },
        error: (error: HttpErrorResponse): void => {
          this.reportExporting.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ??
                $localize`:@@equipment.report.exportFailed:Couldn't export the equipment sheet.`,
            );
          });
        },
      });
  }

  /**
   * Method onTagAddRequested
   * @method onTagAddRequested
   *
   * @description
   * Attaches (or creates and attaches) a tag by name.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {string} name - The tag name.
   *
   * @returns {void}
   */
  protected onTagAddRequested(name: string): void {
    this.store.addTag({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      input: { name },
    });
  }

  /**
   * Method onTagRemoveRequested
   * @method onTagRemoveRequested
   *
   * @description
   * Detaches the given tag, locking its chip on its own write.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {EquipmentTagOutput} tag - The tag to detach.
   *
   * @returns {void}
   */
  protected onTagRemoveRequested(tag: EquipmentTagOutput): void {
    this.pendingTagRemoveIds.update((ids) => new Set(ids).add(tag.id));
    this.store.removeTag({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      tagId: tag.id,
    });
  }

  /**
   * Method onFacilityAssigned
   * @method onFacilityAssigned
   *
   * @description
   * Submits the picked facility from the assignment dialog.
   *
   * @access protected
   * @since 1.5.0
   *
   * @param {string} facilityId - The picked facility's id.
   *
   * @returns {void}
   */
  protected onFacilityAssigned(facilityId: string): void {
    this.store.assignToFacility({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      input: { facilityId },
    });
  }

  /**
   * Method onFacilityUnassigned
   * @method onFacilityUnassigned
   *
   * @description
   * Clears the equipment's facility assignment.
   *
   * @access protected
   * @since 1.5.0
   *
   * @returns {void}
   */
  protected onFacilityUnassigned(): void {
    this.store.unassignFromFacility(this.lifecycleArgs());
  }
  //#endregion
}
