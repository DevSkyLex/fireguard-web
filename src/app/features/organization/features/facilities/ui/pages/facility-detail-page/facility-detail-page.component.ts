import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBoxes,
  lucideCircleAlert,
  lucideMap,
  lucideQrCode,
  lucideTrash2,
} from '@ng-icons/lucide';
import { take } from 'rxjs';
import { isApiError } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { isCallPending, type CallState } from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import type {
  FacilityAttachmentOutput,
  FacilityEditState,
  FacilityEditTarget,
  FacilityGeocodeOutput,
  FacilityOutput,
  FacilityPlanOverlayEquipment,
  FacilityPlanOverlayZone,
  UpdateFacilityInput,
} from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityOverviewStore,
  FacilityPlansStore,
  FacilityStore,
  type FacilityPlanEditMode,
  type FacilityPlansStoreType,
  type FacilityStoreType,
} from '@features/organization/features/facilities/state';
import type { InspectionResult } from '@features/organization/features/inspections/models';
import { InterventionTag } from '@features/organization/features/interventions/ui/components';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { EmptyState } from '@shared/empty-state';
import { ErrorState } from '@shared/error-state';
import { PlanViewer } from '@shared/plan-viewer';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { HlmBreadcrumbImports } from '@shared/ui/breadcrumb';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSelectImports } from '@shared/ui/select';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmSwitch } from '@shared/ui/switch';
import { HlmTabsImports } from '@shared/ui/tabs';
import { FacilityHierarchyChart } from '../../components/facility-hierarchy-chart';
import { FacilityInformationPanel } from '../../components/facility-information-panel';
import { FacilityPlanEditor } from '../../components/facility-plan-editor';
import { FacilityPlanList } from '../../components/facility-plan-list';
import { FacilityStatusTag } from '../../components/facility-status-tag';
import { FacilityDeleteDialog } from '../../dialogs/facility-delete-dialog';
import { FacilityPlanDeleteDialog } from '../../dialogs/facility-plan-delete-dialog';
import { FacilityPlanPinPositionDialog } from '../../dialogs/facility-plan-pin-position-dialog';
import { FacilityPlanZoneGeometryDialog } from '../../dialogs/facility-plan-zone-geometry-dialog';
import { FacilityQrDialog } from '../../dialogs/facility-qr-dialog';
import type { FacilityDetailTabId } from './models';

/** The facility properties this page has open, writing or showing a rejection. */
const IDLE_EDIT_STATE: FacilityEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

/**
 * Component FacilityDetailPage
 * @class FacilityDetailPage
 *
 * @description
 * Route entry page for one facility record
 * (`/organizations/:organizationId/facilities/:facilityId`). Three tabs:
 * **Overview** (default) renders the descendant hierarchy through
 * {@link FacilityHierarchyChart} plus the equipment/inspection/intervention
 * summary from {@link FacilityOverviewStore} — the "Interventions on this
 * site" section lists the most recently updated interventions whose `site`
 * is this facility (read cross-feature from the interventions feature, see
 * the store's own doc) with a "See all" link into
 * `/organizations/:organizationId/interventions?site=:facilityId`, which the
 * list page already parses; **Information** renders
 * {@link FacilityInformationPanel}, the in-place edit surface for every
 * writable property (`FEATURE.md` "The record is the edit surface" — there
 * is no separate edit page); **Plans** renders {@link FacilityPlanList} and
 * `PlanViewer` over {@link FacilityPlansStore}, loaded browser-only on first
 * activation since it is secondary content (`ARCHITECTURE.md` §12.4). The
 * selected plan's zone/equipment overlay renders through
 * `FacilityPlanEditor`, projected into `PlanViewer`'s `overlayTemplate`; a
 * zone or equipment pin activation navigates to that record, and this page
 * owns both that navigation and every editor write (draw/clear a zone
 * outline, place/move/remove an equipment pin) — `FacilityPlanEditor` only
 * emits, `FacilityPlansStore` (tab-scoped) owns the mode/draft state and the
 * two save rxMethods. Editor entry (the "Draw zone"/"Place equipment"
 * pickers, each zone/pin row's dialog triggers) is gated on `canWrite`
 * (`FACILITIES_WRITE`) for zones and `canEditEquipment`
 * (`EQUIPMENT_WRITE`) for equipment. Each active mode also offers a
 * keyboard alternative to tapping the plan — "Enter coordinates" / "Enter
 * position" open the numeric dialogs for the picked target, making zone and
 * pin creation possible without a pointer. A
 * danger, confirm-gated **Delete** action ({@link FacilityDeleteDialog},
 * `DESIGN.md` § Action Surfaces rule 5) and a read-level **QR code**
 * action ({@link FacilityQrDialog}, `FEATURE.md` "Printable QR code")
 * register on the shell header through `PageActionsService` (`FEATURE.md`
 * "Deletion").
 *
 * `facilityResolver` (route `resolve`) seeds {@link ActiveFacilityStore}
 * fire-and-forget, so this page always renders immediately: the full-page
 * skeleton shows from the store's pending state until the record lands, the
 * document title follows through `TitleService`, and a load failure shows
 * `app-error-state` with a retry that re-runs {@link ActiveFacilityStore}'s
 * resolve (`DESIGN.md` "Detail-page gating") rather than leaving the operator
 * on an eternal skeleton or navigating them away silently. A route-scoped
 * {@link FacilityStore}
 * carries the update, archive/restore and delete writes, a route-scoped
 * {@link FacilityOverviewStore} carries the Overview tab's summary data, and
 * a tab-scoped {@link FacilityPlansStore} carries the Plans tab's floor
 * plans. The record's name is the shell breadcrumb's title, resolved by
 * `facilityTitleResolver`. In-page, `facility.path` — populated only on this
 * detail read — renders as a quiet ancestor trail above the status row, each
 * segment linking to that ancestor's own detail route; a root facility
 * (empty `path`) renders nothing.
 *
 * {@link activeTab} follows the `?tab=` query parameter (`tab` input, bound
 * by `withComponentInputBinding()`) through {@link activateTab}: an absent
 * or unrecognized value normalizes to `overview`, and a tab click writes the
 * parameter back with `replaceUrl: true` so browsing tabs never grows
 * history. This is what lets the building 3D route's "Back to facility" and
 * "View 2D plan" links (`?tab=plans`) land on the Plans tab instead of
 * Overview. The Plans tab additionally offers a **3D view** action, gated on
 * `facility.type === 'building'` (the endpoint's own 409 is the filet, this
 * gate is the real guard).
 *
 * @version 1.10.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-detail-page',
  imports: [
    OrgDatePipe,
    NgIcon,
    RouterLink,
    EmptyState,
    ErrorState,
    FacilityDeleteDialog,
    FacilityHierarchyChart,
    FacilityInformationPanel,
    FacilityPlanDeleteDialog,
    FacilityPlanEditor,
    FacilityPlanList,
    FacilityPlanPinPositionDialog,
    FacilityPlanZoneGeometryDialog,
    FacilityQrDialog,
    FacilityStatusTag,
    InterventionTag,
    PlanViewer,
    HlmButton,
    HlmSkeleton,
    HlmSwitch,
    ...HlmBreadcrumbImports,
    ...HlmSelectImports,
    ...HlmSpinnerImports,
    ...HlmCardImports,
    ...HlmTabsImports,
  ],
  providers: [
    FacilityOverviewStore,
    FacilityPlansStore,
    provideIcons({ lucideBoxes, lucideCircleAlert, lucideMap, lucideQrCode, lucideTrash2 }),
  ],
  templateUrl: './facility-detail-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityDetailPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning this facility, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property facilityId
   * @readonly
   * @description The resolved facility's id, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly facilityId: InputSignal<string> = input.required<string>();

  /**
   * Property tab
   * @readonly
   *
   * @description
   * The requested tab, bound from the `?tab=` query parameter
   * (`withComponentInputBinding()`). Any value other than `information` or
   * `plans` — including an absent parameter — normalizes to `overview`; see
   * {@link normalizeFacilityDetailTabId}.
   *
   * @access public
   * @since 1.10.0
   * @type {InputSignal<string | undefined>}
   */
  public readonly tab: InputSignal<string | undefined> = input<string | undefined>(undefined);
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

  /** The currently active facility, seeded by `facilityResolver`; null until the fetch lands. */
  protected readonly activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  /** Document title channel, kept in sync with the loaded record. */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);

  /** Whether this instance runs in the browser — the Plans tab's first load only fires there. */
  private readonly isBrowser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /** The route-scoped store carrying the update, archive/restore and delete writes. */
  protected readonly store: FacilityStoreType = inject<FacilityStoreType>(FacilityStore);

  /** The route-scoped store carrying the Overview tab's equipment/inspection summary. */
  protected readonly overview: FacilityOverviewStore = inject(FacilityOverviewStore);

  /** The tab-scoped store carrying the Plans tab's floor plans. */
  protected readonly plans: FacilityPlansStoreType =
    inject<FacilityPlansStoreType>(FacilityPlansStore);

  /** Whether the Plans tab has already requested its list — loaded once, on first activation. */
  private plansLoadRequested = false;

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Router used for hierarchy-node navigation, the post-delete return and the load-failure redirect. */
  private readonly router: Router = inject(Router);

  /** This route, used to write the `?tab=` query parameter without disturbing the path. */
  private readonly route: ActivatedRoute = inject(ActivatedRoute);

  /** Transport used directly for the one-shot "Locate address" lookup — a helper, not list state. */
  private readonly facilityService: FacilityService = inject(FacilityService);

  /** Global toast feedback for the lookup's rate-limit and error paths. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes an in-flight lookup when the page is destroyed. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Whether a "Locate address" lookup is in flight. */
  protected readonly geocodePending: WritableSignal<boolean> = signal<boolean>(false);

  /** The latest successful lookup, handed to the panel to fill the coordinate drafts. */
  protected readonly geocodeResult: WritableSignal<FacilityGeocodeOutput | null> =
    signal<FacilityGeocodeOutput | null>(null);

  /** Whether the latest lookup answered `404` — the panel's non-blocking inline message. */
  protected readonly geocodeNotFound: WritableSignal<boolean> = signal<boolean>(false);

  /** The application's language, used to phrase the header's metadata line. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** Which in-place field is open, writing, or showing a rejection. */
  protected readonly editState: WritableSignal<FacilityEditState> =
    signal<FacilityEditState>(IDLE_EDIT_STATE);

  /** Which of the record's three tabs is showing. Page-local UI state, `overview` by default. */
  protected readonly activeTab: WritableSignal<FacilityDetailTabId> =
    signal<FacilityDetailTabId>('overview');

  /** Whether the Delete confirmation is open. */
  protected readonly pendingDelete: WritableSignal<boolean> = signal<boolean>(false);

  /** The floor plan awaiting delete confirmation, if any. */
  protected readonly planDeleteTarget: WritableSignal<FacilityAttachmentOutput | null> =
    signal<FacilityAttachmentOutput | null>(null);

  /** Whether the QR code dialog is open. */
  protected readonly qrDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canWrite
   * @readonly
   * @description Whether the member may write to this facility at all.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /**
   * Property canEditEquipment
   * @readonly
   * @description Whether the member may place, move, or remove an equipment pin on this facility's plans.
   * @access protected
   * @since 1.4.0
   * @type {Signal<boolean>}
   */
  protected readonly canEditEquipment: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /** The zone (by facility id) whose "Edit coordinates" dialog is open; null when closed. */
  protected readonly zoneGeometryDialogFacilityId: WritableSignal<string | null> = signal(null);

  /** The equipment pin (by equipment id) whose "Edit position" dialog is open; null when closed. */
  protected readonly pinPositionDialogEquipmentId: WritableSignal<string | null> = signal(null);

  /**
   * Property zoneGeometryDialogZone
   * @readonly
   * @description The zone the "Edit coordinates" dialog is showing, resolved from the loaded overlay.
   * @access protected
   * @since 1.4.0
   * @type {Signal<FacilityPlanOverlayZone | null>}
   */
  protected readonly zoneGeometryDialogZone: Signal<FacilityPlanOverlayZone | null> = computed(
    () => {
      const facilityId: string | null = this.zoneGeometryDialogFacilityId();
      if (!facilityId) return null;

      return this.plans.overlay()?.zones.find((zone) => zone.facilityId === facilityId) ?? null;
    },
  );

  /**
   * Property pinPositionDialogPin
   * @readonly
   * @description The equipment pin the "Edit position" dialog is showing, resolved from the loaded overlay.
   * @access protected
   * @since 1.4.0
   * @type {Signal<FacilityPlanOverlayEquipment | null>}
   */
  protected readonly pinPositionDialogPin: Signal<FacilityPlanOverlayEquipment | null> = computed(
    () => {
      const equipmentId: string | null = this.pinPositionDialogEquipmentId();
      if (!equipmentId) return null;

      return this.plans.overlay()?.equipment.find((pin) => pin.equipmentId === equipmentId) ?? null;
    },
  );

  /**
   * Property zoneGeometryDialogName
   * @readonly
   * @description The zone dialog's display name — the overlay zone's when it exists, else the picked draw candidate's (a zone with no geometry yet).
   * @access protected
   * @since 1.4.1
   * @type {Signal<string>}
   */
  protected readonly zoneGeometryDialogName: Signal<string> = computed<string>(() => {
    const existing: FacilityPlanOverlayZone | null = this.zoneGeometryDialogZone();
    if (existing) return existing.name;

    const facilityId: string | null = this.zoneGeometryDialogFacilityId();
    if (!facilityId) return '';

    return (
      this.plans.availableZoneCandidates().find((candidate) => candidate.id === facilityId)?.name ??
      ''
    );
  });

  /**
   * Property pinPositionDialogName
   * @readonly
   * @description The pin dialog's display name — the overlay pin's when it exists, else the picked place candidate's (equipment not on the plan yet).
   * @access protected
   * @since 1.4.1
   * @type {Signal<string>}
   */
  protected readonly pinPositionDialogName: Signal<string> = computed<string>(() => {
    const existing: FacilityPlanOverlayEquipment | null = this.pinPositionDialogPin();
    if (existing) return existing.name;

    const equipmentId: string | null = this.pinPositionDialogEquipmentId();
    if (!equipmentId) return '';

    const candidate = this.plans
      .availableEquipmentCandidates()
      .find((item) => item.id === equipmentId);

    return candidate ? (candidate.locationLabel ?? candidate.type) : '';
  });

  /**
   * Property metaLine
   * @readonly
   * @description The header's metadata line — when the record was last touched.
   * @access protected
   * @since 1.1.0
   * @type {Signal<string>}
   */
  protected readonly metaLine: Signal<string> = computed<string>(() => {
    const facility: FacilityOutput | null = this.activeFacilityStore.selectedFacility();
    if (!facility) return '';

    const formatter = new Intl.DateTimeFormat(this.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const when: string = formatter.format(new Date(facility.updatedAt));

    return $localize`:@@facility.detail.metaUpdated:Updated ${when}:when:`;
  });

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The Delete button, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');

  /**
   * Property editModeStatusLabel
   * @readonly
   * @description The Plans tab editor's status line, naming the active mode and, in `draw-zone`, its vertex count.
   * @access protected
   * @since 1.4.0
   * @type {Signal<string>}
   */
  protected readonly editModeStatusLabel: Signal<string> = computed<string>(() => {
    const mode: FacilityPlanEditMode = this.plans.editMode();
    if (mode === 'draw-zone') {
      const count: number = this.plans.draftPoints().length;

      return $localize`:@@facility.plans.editor.status.drawZone:Click the plan to add a vertex (${count}:count: placed)`;
    }
    if (mode === 'place-pin') {
      return $localize`:@@facility.plans.editor.status.placePin:Click the plan to place the equipment`;
    }

    return '';
  });
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Settles the open in-place field once its own write clears; once the
   * seeded record lands, re-sets the document title and loads the Overview
   * tab's summary plus (when the facility has children) its descendant
   * subtree; a load failure is left to the template's `app-error-state`
   * branch and {@link retryLoad} — the global feedback listener already
   * toasts the failure — returns to the list once a delete write succeeds —
   * and registers {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, this.destroyRef);

    effect((): void => {
      const requested: FacilityDetailTabId = normalizeFacilityDetailTabId(this.tab());

      untracked((): void => this.activateTab(requested));
    });

    effect((): void => {
      const callState: CallState<FacilityOutput | null> = this.store.updateCallState();

      untracked((): void => this.settleUpdateWrite(callState));
    });

    effect((): void => {
      const facility: FacilityOutput | null = this.activeFacilityStore.selectedFacility();
      if (!facility) return;

      const organizationId: string = this.organizationId();

      untracked((): void => {
        this.titleService.setTitle(facility.name);
        this.overview.load({ organizationId, facilityId: facility.id });

        if (facility.hasChildren) {
          this.store.ensureFacilityDescendantsLoaded({
            organizationId,
            facilityId: facility.id,
          });
        }
      });
    });

    effect((): void => {
      const callState: CallState<null> = this.store.deleteCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;

        void this.router.navigate(['/organizations', this.organizationId(), 'facilities']);
      });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onLinkedTabActivated
   *
   * @description
   * Narrows `hlm-tabs`' plain-string `tabActivated` payload, applies it
   * through {@link activateTab}, and writes it back to the `?tab=` query
   * parameter with `replaceUrl: true` so switching tabs never grows the
   * browser history — only the initial navigation to the record does.
   *
   * @access protected
   * @since 1.0.0
   * @param {string} tab - The `hlm-tabs` id that just activated.
   * @returns {void}
   */
  protected onLinkedTabActivated(tab: string): void {
    if (tab !== 'overview' && tab !== 'information' && tab !== 'plans') return;

    this.activateTab(tab);

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /**
   * Method onPlanSelected
   * @description Shows the given plan in the viewer.
   * @access protected
   * @since 1.1.0
   * @param {string} planId - The plan to show.
   * @returns {void}
   */
  protected onPlanSelected(planId: string): void {
    this.plans.selectPlan(planId);
  }

  /**
   * Method onPlanFilePicked
   * @description Uploads the picked image as a new floor plan.
   * @access protected
   * @since 1.1.0
   * @param {File} file - The picked image.
   * @returns {void}
   */
  protected onPlanFilePicked(file: File): void {
    this.plans.upload({ facilityId: this.facilityId(), file });
  }

  /**
   * Method onPlanSetPrimaryRequested
   * @description Sets the given plan as the facility's primary plan.
   * @access protected
   * @since 1.1.0
   * @param {FacilityAttachmentOutput} plan - The plan to set primary.
   * @returns {void}
   */
  protected onPlanSetPrimaryRequested(plan: FacilityAttachmentOutput): void {
    this.plans.setPrimary({ attachmentId: plan.id });
  }

  /**
   * Method onPlanDeleteRequested
   * @description Opens {@link FacilityPlanDeleteDialog} for the given plan.
   * @access protected
   * @since 1.7.0
   * @param {FacilityAttachmentOutput} plan - The plan whose deletion was requested.
   * @returns {void}
   */
  protected onPlanDeleteRequested(plan: FacilityAttachmentOutput): void {
    this.planDeleteTarget.set(plan);
  }

  /**
   * Method onPlanDeleteDismissed
   * @description Closes {@link FacilityPlanDeleteDialog} without deleting.
   * @access protected
   * @since 1.7.0
   * @returns {void}
   */
  protected onPlanDeleteDismissed(): void {
    this.planDeleteTarget.set(null);
  }

  /**
   * Method onPlanDeleteConfirmed
   * @description Deletes the pending plan, pinned to its revision, and closes the dialog.
   * @access protected
   * @since 1.7.0
   * @returns {void}
   */
  protected onPlanDeleteConfirmed(): void {
    const plan: FacilityAttachmentOutput | null = this.planDeleteTarget();
    if (!plan) return;

    this.plans.remove({ attachmentId: plan.id, revision: plan.revision });
    this.planDeleteTarget.set(null);
  }

  /**
   * Method onPlanZoneActivated
   * @description A plan overlay zone was activated; navigates to that facility's record.
   * @access protected
   * @since 1.3.0
   * @param {string} facilityId - The activated zone's facility id.
   * @returns {void}
   */
  protected onPlanZoneActivated(facilityId: string): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'facilities', facilityId]);
  }

  /**
   * Method onPlanEquipmentActivated
   * @description A plan overlay equipment pin was activated; navigates to that equipment's record.
   * @access protected
   * @since 1.3.0
   * @param {string} equipmentId - The activated pin's equipment id.
   * @returns {void}
   */
  protected onPlanEquipmentActivated(equipmentId: string): void {
    void this.router.navigate(['/organizations', this.organizationId(), 'equipments', equipmentId]);
  }

  /**
   * Method onShowZonesChanged
   * @description Toggles the plan overlay's zone-polygon layer.
   * @access protected
   * @since 1.3.0
   * @param {boolean} value - The switch's new checked state.
   * @returns {void}
   */
  protected onShowZonesChanged(value: boolean): void {
    this.plans.setShowZones(value);
  }

  /**
   * Method onShowEquipmentChanged
   * @description Toggles the plan overlay's equipment-pin layer.
   * @access protected
   * @since 1.3.0
   * @param {boolean} value - The switch's new checked state.
   * @returns {void}
   */
  protected onShowEquipmentChanged(value: boolean): void {
    this.plans.setShowEquipment(value);
  }

  /**
   * Method onEditorKeydown
   *
   * @description
   * The editor's keyboard shortcuts, listened globally rather than on the
   * plan viewer stage so they work regardless of which control has focus
   * while a mode is active: Escape cancels, Backspace undoes the last
   * `draw-zone` vertex (and is prevented from also navigating back). Scoped
   * twice: an active mode is cancelled when the Plans tab is left (see
   * {@link onLinkedTabActivated}), and a key event whose target is a text
   * entry surface — input, textarea, select, contenteditable — is left
   * alone, so the coordinate dialogs' fields keep their own Backspace.
   *
   * @access protected
   * @since 1.4.0
   * @param {KeyboardEvent} event - The key event.
   * @returns {void}
   */
  @HostListener('document:keydown', ['$event'])
  protected onEditorKeydown(event: KeyboardEvent): void {
    const mode: FacilityPlanEditMode = this.plans.editMode();
    if (mode === 'none' || isTextEntryTarget(event.target)) return;

    if (event.key === 'Escape') {
      this.plans.cancelEditing();
    } else if (event.key === 'Backspace' && mode === 'draw-zone') {
      event.preventDefault();
      this.plans.undoDraftVertex();
    }
  }

  /**
   * Method onZonePickerOpened
   * @description Loads the `draw-zone` picker's candidate list, guarded against a duplicate fetch.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected onZonePickerOpened(): void {
    this.plans.ensureZoneCandidatesLoaded();
  }

  /**
   * Method onEquipmentPickerOpened
   * @description Loads the `place-pin` picker's candidate list, guarded against a duplicate fetch.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected onEquipmentPickerOpened(): void {
    this.plans.ensureFacilityEquipmentLoaded();
  }

  /**
   * Method onZoneDrawTargetPicked
   * @description Starts drawing an outline for the picked child facility.
   * @access protected
   * @since 1.4.0
   * @param {string | null | undefined} facilityId - The picked facility, or nullish when the selection cleared.
   * @returns {void}
   */
  protected onZoneDrawTargetPicked(facilityId: string | null | undefined): void {
    if (!facilityId) return;

    this.plans.enterDrawZoneMode(facilityId);
  }

  /**
   * Method onPlaceEquipmentPicked
   * @description Starts placing the picked equipment item.
   * @access protected
   * @since 1.4.0
   * @param {string | null | undefined} equipmentId - The picked equipment, or nullish when the selection cleared.
   * @returns {void}
   */
  protected onPlaceEquipmentPicked(equipmentId: string | null | undefined): void {
    if (!equipmentId) return;

    this.plans.enterPlacePinMode(equipmentId);
  }

  /**
   * Method onVertexAdded
   * @description A `draw-zone` tap added this vertex.
   * @access protected
   * @since 1.4.0
   * @param {readonly [number, number]} point - The vertex, in normalized `[0, 1]` image coordinates.
   * @returns {void}
   */
  protected onVertexAdded(point: readonly [number, number]): void {
    this.plans.addDraftVertex(point);
  }

  /**
   * Method onPolygonCloseRequested
   * @description A double-click requested closing the in-progress outline; submits it.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected onPolygonCloseRequested(): void {
    this.plans.finishDrawZone();
  }

  /**
   * Method onPinPlaced
   * @description A `place-pin` tap placed the pin here.
   * @access protected
   * @since 1.4.0
   * @param {readonly [number, number]} point - The pin's position, in normalized `[0, 1]` image coordinates.
   * @returns {void}
   */
  protected onPinPlaced(point: readonly [number, number]): void {
    this.plans.placePin(point);
  }

  /**
   * Method onPinMoved
   * @description An existing pin was dragged and dropped.
   * @access protected
   * @since 1.4.0
   * @param {{ equipmentId: string; point: readonly [number, number] }} event - The moved pin and its new position.
   * @returns {void}
   */
  protected onPinMoved(event: {
    readonly equipmentId: string;
    readonly point: readonly [number, number];
  }): void {
    this.plans.movePin(event.equipmentId, event.point);
  }

  /**
   * Method onEnterCoordinatesRequested
   * @description The `draw-zone` mode's keyboard alternative — opens the coordinate dialog for the picked draw target instead of tapping the plan.
   * @access protected
   * @since 1.4.1
   * @returns {void}
   */
  protected onEnterCoordinatesRequested(): void {
    const facilityId: string | null = this.plans.drawTargetFacilityId();
    if (!facilityId) return;

    this.zoneGeometryDialogFacilityId.set(facilityId);
  }

  /**
   * Method onEnterPositionRequested
   * @description The `place-pin` mode's keyboard alternative — opens the position dialog for the picked equipment instead of tapping the plan.
   * @access protected
   * @since 1.4.1
   * @returns {void}
   */
  protected onEnterPositionRequested(): void {
    const equipmentId: string | null = this.plans.placeEquipmentId();
    if (!equipmentId) return;

    this.pinPositionDialogEquipmentId.set(equipmentId);
  }

  /**
   * Method openZoneGeometryDialog
   * @description Opens the non-pointer "Edit coordinates" dialog for the given zone.
   * @access protected
   * @since 1.4.0
   * @param {string} facilityId - The zone to edit.
   * @returns {void}
   */
  protected openZoneGeometryDialog(facilityId: string): void {
    this.zoneGeometryDialogFacilityId.set(facilityId);
  }

  /**
   * Method onZoneGeometryDialogVisibleChanged
   * @description Closes the "Edit coordinates" dialog on any dismissal.
   * @access protected
   * @since 1.4.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onZoneGeometryDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.zoneGeometryDialogFacilityId.set(null);
  }

  /**
   * Method onZoneGeometrySubmitted
   * @description The "Edit coordinates" dialog's submit path.
   * @access protected
   * @since 1.4.0
   * @param {ReadonlyArray<readonly [number, number]>} points - The submitted outline.
   * @returns {void}
   */
  protected onZoneGeometrySubmitted(points: ReadonlyArray<readonly [number, number]>): void {
    const facilityId: string | null = this.zoneGeometryDialogFacilityId();
    if (!facilityId) return;

    this.plans.saveZoneGeometryFromDialog(facilityId, points);
    this.zoneGeometryDialogFacilityId.set(null);
  }

  /**
   * Method onZoneGeometryCleared
   * @description The "Clear geometry" action, from either the dialog or a zone's row.
   * @access protected
   * @since 1.4.0
   * @returns {void}
   */
  protected onZoneGeometryCleared(): void {
    const facilityId: string | null = this.zoneGeometryDialogFacilityId();
    if (!facilityId) return;

    this.plans.clearZoneGeometry(facilityId);
    this.zoneGeometryDialogFacilityId.set(null);
  }

  /**
   * Method openPinPositionDialog
   * @description Opens the non-pointer "Edit position" dialog for the given equipment pin.
   * @access protected
   * @since 1.4.0
   * @param {string} equipmentId - The pin to edit.
   * @returns {void}
   */
  protected openPinPositionDialog(equipmentId: string): void {
    this.pinPositionDialogEquipmentId.set(equipmentId);
  }

  /**
   * Method onPinPositionDialogVisibleChanged
   * @description Closes the "Edit position" dialog on any dismissal.
   * @access protected
   * @since 1.4.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onPinPositionDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.pinPositionDialogEquipmentId.set(null);
  }

  /**
   * Method onPinPositionSubmitted
   * @description The "Edit position" dialog's submit path — a first placement while `place-pin` mode targets this equipment routes through the store's placement write, a reposition through the move write.
   * @access protected
   * @since 1.4.0
   * @param {readonly [number, number]} point - The submitted position.
   * @returns {void}
   */
  protected onPinPositionSubmitted(point: readonly [number, number]): void {
    const equipmentId: string | null = this.pinPositionDialogEquipmentId();
    if (!equipmentId) return;

    if (this.plans.editMode() === 'place-pin' && this.plans.placeEquipmentId() === equipmentId) {
      this.plans.placePin(point);
    } else {
      this.plans.movePin(equipmentId, point);
    }
    this.pinPositionDialogEquipmentId.set(null);
  }

  /**
   * Method onPinPositionRemoved
   * @description The "Remove from plan" action, from either the dialog or a pin's row.
   * @access protected
   * @since 1.4.0
   * @param {string} equipmentId - The pin to remove.
   * @returns {void}
   */
  protected onPinPositionRemoved(equipmentId: string): void {
    this.plans.removePinFromPlan(equipmentId);
    if (this.pinPositionDialogEquipmentId() === equipmentId) {
      this.pinPositionDialogEquipmentId.set(null);
    }
  }

  /**
   * Method onHierarchyNodeSelected
   * @description A hierarchy chart node was activated; navigates the record to that facility.
   * @access protected
   * @since 1.0.0
   * @param {FacilityOutput} facility - The selected node's facility.
   * @returns {void}
   */
  protected onHierarchyNodeSelected(facility: FacilityOutput): void {
    if (facility.id === this.facilityId()) return;

    void this.router.navigate(['/organizations', this.organizationId(), 'facilities', facility.id]);
  }

  /**
   * Method retryLoad
   * @description The load-failed state's retry — re-runs {@link ActiveFacilityStore}'s resolve for this record.
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected retryLoad(): void {
    this.activeFacilityStore.resolveFacility({
      organizationId: this.organizationId(),
      facilityId: this.facilityId(),
    });
  }

  /**
   * Method onEditTargetChanged
   * @description Opens or closes an in-place field, clearing any rejection left from the previous attempt.
   * @access protected
   * @since 1.0.0
   * @param {FacilityEditTarget | null} target - The field to open, or null to close.
   * @returns {void}
   */
  protected onEditTargetChanged(target: FacilityEditTarget | null): void {
    this.editState.set({ open: target, saving: null, failed: null, failure: null });
    this.geocodeResult.set(null);
    this.geocodeNotFound.set(false);
  }

  /**
   * Method onGeocodeRequested
   *
   * @description
   * Resolves the record's stored address to coordinates
   * (`FacilityService.geocode`) and answers through the panel's
   * `geocodeResult` / `geocodeNotFound` inputs. A `404` (no match) renders
   * inline in the coordinates editor and never blocks it; any other refusal
   * — the endpoint's `429` rate limit, a `400` — surfaces its RFC 7807
   * `detail` as an error toast. The operator can always correct the filled
   * coordinates by hand before saving.
   *
   * @access protected
   * @since 1.6.0
   *
   * @param {string} address - The address the panel asked to locate.
   * @returns {void}
   */
  protected onGeocodeRequested(address: string): void {
    if (this.geocodePending()) return;

    this.geocodePending.set(true);
    this.geocodeResult.set(null);
    this.geocodeNotFound.set(false);

    this.facilityService
      .geocode(this.organizationId(), address)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (match: FacilityGeocodeOutput): void => {
          this.geocodePending.set(false);
          this.geocodeResult.set(match);
        },
        error: (error: unknown): void => {
          this.geocodePending.set(false);

          if (isApiError(error) && error.status === 404) {
            this.geocodeNotFound.set(true);
            return;
          }

          this.feedback.error(
            isApiError(error)
              ? error.detail
              : $localize`:@@facility.form.locateFailed:Couldn't locate the address.`,
          );
        },
      });
  }

  /**
   * Method onDetailsChanged
   * @description Sends an in-place patch. The field stays open until the write settles.
   * @access protected
   * @since 1.0.0
   * @param {UpdateFacilityInput} patch - The single-property patch.
   * @returns {void}
   */
  protected onDetailsChanged(patch: UpdateFacilityInput): void {
    const target: FacilityEditTarget | null = this.editState().open;
    if (target === null) return;

    this.editState.set({ open: target, saving: target, failed: null, failure: null });
    this.store.update({
      organizationId: this.organizationId(),
      facilityId: this.facilityId(),
      input: patch,
    });
  }

  /**
   * Method requestDelete
   * @description Opens the Delete confirmation.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected requestDelete(): void {
    this.pendingDelete.set(true);
  }

  /**
   * Method openQrDialog
   * @description Opens the printable QR code dialog.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected openQrDialog(): void {
    this.qrDialogVisible.set(true);
  }

  /**
   * Method onQrDialogDismissed
   * @description Closes the QR code dialog.
   * @access protected
   * @since 1.1.0
   * @returns {void}
   */
  protected onQrDialogDismissed(): void {
    this.qrDialogVisible.set(false);
  }

  /**
   * Method confirmDelete
   * @description Sends the delete write. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmDelete(): void {
    this.store.remove({ facilityId: this.facilityId() });
  }

  /**
   * Method onDeleteDialogVisibleChanged
   * @description Clears the pending flag on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.7.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onDeleteDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.pendingDelete.set(false);
  }

  /**
   * Method resultLabelOf
   * @description Localizes a recent-inspection's result, read read-only from the sibling `inspections` subfeature for this preview only.
   * @access protected
   * @since 1.0.0
   * @param {InspectionResult} result - The inspection's result.
   * @returns {string} The localized label.
   */
  protected resultLabelOf(result: InspectionResult): string {
    switch (result) {
      case 'pass':
        return $localize`:@@facility.recentInspections.pass:Pass`;
      case 'fail':
        return $localize`:@@facility.recentInspections.fail:Fail`;
      case 'partial':
        return $localize`:@@facility.recentInspections.partial:Partial`;
    }
  }

  /**
   * Method activateTab
   *
   * @description
   * The single path that opens a tab, whether requested by the `?tab=` query
   * parameter or a direct click: writes {@link activeTab}, cancels any active
   * Plans editor mode when leaving that tab, and requests the Plans tab's
   * floor plans once, on its first activation. A no-op when the tab is
   * already the active one.
   *
   * @access private
   * @since 1.10.0
   * @param {FacilityDetailTabId} target - The tab to activate.
   * @returns {void}
   */
  private activateTab(target: FacilityDetailTabId): void {
    if (this.activeTab() === target) return;

    this.activeTab.set(target);
    if (target !== 'plans' && this.plans.editMode() !== 'none') {
      this.plans.cancelEditing();
    }
    if (target === 'plans' && this.isBrowser && !this.plansLoadRequested) {
      this.plansLoadRequested = true;
      this.plans.load({ facilityId: this.facilityId(), organizationId: this.organizationId() });
    }
  }

  /**
   * Method settleUpdateWrite
   * @description Closes the open field on a successful write, or attributes the rejection to it.
   * @access private
   * @since 1.0.0
   * @param {CallState<FacilityOutput | null>} callState - The update write's call state.
   * @returns {void}
   */
  private settleUpdateWrite(callState: CallState<FacilityOutput | null>): void {
    if (isCallPending(callState)) return;

    const state: FacilityEditState = this.editState();
    if (state.saving === null) return;

    const failure: string | null = callState.error?.message ?? null;
    if (failure === null) {
      this.editState.set(IDLE_EDIT_STATE);

      return;
    }

    this.editState.set({ open: state.saving, saving: null, failed: state.saving, failure });
  }
  //#endregion
}

/**
 * Function normalizeFacilityDetailTabId
 * @access private
 * @since 1.10.0
 * @param {string | undefined} value - The raw `?tab=` query parameter value.
 * @returns {FacilityDetailTabId} `value` narrowed to a known tab id, defaulting to `overview` for anything absent or unrecognized.
 */
function normalizeFacilityDetailTabId(value: string | undefined): FacilityDetailTabId {
  return value === 'information' || value === 'plans' ? value : 'overview';
}

/**
 * Function isTextEntryTarget
 * @access private
 * @since 1.4.1
 * @param {EventTarget | null} target - A key event's target.
 * @returns {boolean} `true` when the target is a text entry surface the editor shortcuts must not steal keys from.
 */
function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  );
}
