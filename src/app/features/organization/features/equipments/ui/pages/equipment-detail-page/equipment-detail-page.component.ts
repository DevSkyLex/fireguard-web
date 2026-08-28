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
} from '@ng-icons/lucide';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
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
} from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
  type EquipmentStoreType,
} from '@features/organization/features/equipments/state';
import {
  buildEquipmentTitle,
  fileToBase64,
} from '@features/organization/features/equipments/utils';
import { FacilityService } from '@features/organization/features/facilities/data-access';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { resolveCsvExportErrorDetail } from '@features/organization/utils';
import { ErrorState } from '@shared/error-state';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { HlmTabsImports } from '@shared/ui/tabs';
import { EquipmentAttachments } from '../../components/equipment-attachments';
import { EquipmentInformationPanel } from '../../components/equipment-information-panel';
import { EquipmentMaintenanceHistory } from '../../components/equipment-maintenance-history';
import { EquipmentStatusTag } from '../../components/equipment-status-tag';
import { EquipmentTags } from '../../components/equipment-tags';
import { EquipmentAssignFacilityDialog } from '../../dialogs/equipment-assign-facility-dialog';
import type { EquipmentDetailTabId } from './models';

/** How many facilities the assignment picker fetches — organizations rarely exceed this. */
const FACILITY_OPTIONS_PAGE_SIZE = 200;

/** The equipment properties this page has open, writing or showing a rejection. */
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
 *
 * `equipmentResolver` (route `resolve`) seeds {@link ActiveEquipmentStore}
 * fire-and-forget, so this page always renders immediately: the full-page
 * skeleton shows from the store's pending state until the record lands, and
 * a load failure shows `app-error-state` with a retry that re-runs
 * {@link ActiveEquipmentStore}'s resolve (`DESIGN.md` "Detail-page gating")
 * rather than leaving the operator on an eternal skeleton or navigating them
 * away silently. A route-scoped {@link EquipmentStore} carries the update and
 * lifecycle writes.
 *
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
 *
 * Three tabs beyond the identification fields (**Overview**): **Attachments**
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
 * @version 1.5.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-detail-page',
  imports: [
    NgIcon,
    RouterLink,
    EquipmentAssignFacilityDialog,
    EquipmentAttachments,
    EquipmentInformationPanel,
    EquipmentMaintenanceHistory,
    EquipmentStatusTag,
    EquipmentTags,
    ErrorState,
    HlmButton,
    HlmSkeleton,
    ...HlmSpinnerImports,
    ...HlmTabsImports,
  ],
  providers: [
    provideIcons({ lucideCircleAlert, lucideDownload, lucideMapPin, lucidePencil, lucideWrench }),
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
   * @description The workspace owning this equipment, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property equipmentId
   * @readonly
   * @description The resolved equipment's id, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly equipmentId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The currently active equipment, seeded by `equipmentResolver`; null until the fetch lands. */
  protected readonly activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);

  /** The route-scoped store carrying the update and lifecycle writes. */
  protected readonly store: EquipmentStoreType = inject<EquipmentStoreType>(EquipmentStore);

  /** Document title channel, kept in sync with the loaded record. */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** The application's language, used to phrase the header's metadata line. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /**
   * The `facilities` subfeature's read-only listing service, consumed
   * directly for the assignment dialog's facility options — an approved
   * cross-feature dependency (`FEATURE.md` "Cross-Feature Dependencies"),
   * mirroring `MaintenanceSchedulesPage`.
   */
  private readonly facilityService: FacilityService = inject<FacilityService>(FacilityService);

  /**
   * The equipment transport service, injected directly (not through the
   * store) for the one-shot attachment-download fetch — a download changes
   * no persisted state, so it does not belong in `EquipmentStore`, mirroring
   * `InterventionDetailPage`'s `downloadAttachment`.
   */
  private readonly equipmentService: EquipmentService = inject<EquipmentService>(EquipmentService);

  /** Saves a fetched attachment blob to the visitor's device. */
  private readonly browserDownload: BrowserDownloadService =
    inject<BrowserDownloadService>(BrowserDownloadService);

  /** Global toast feedback for the sheet export's error path. */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /** Whether the equipment sheet's PDF export is currently in flight. */
  protected readonly reportExporting: WritableSignal<boolean> = signal<boolean>(false);

  /** For cancelling in-flight downloads when the page is destroyed. */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /** Which in-place field is open, writing, or showing a rejection. */
  protected readonly editState: WritableSignal<EquipmentEditState> =
    signal<EquipmentEditState>(IDLE_EDIT_STATE);

  /** Which tab is showing. */
  protected readonly activeTab: WritableSignal<EquipmentDetailTabId> =
    signal<EquipmentDetailTabId>('overview');

  /** Ids of the tabs whose data has already been requested, so a re-activation never re-fetches. */
  private readonly tabsLoaded: Set<EquipmentDetailTabId> = new Set<EquipmentDetailTabId>();

  /** Ids of the attachments whose delete is in flight. */
  protected readonly pendingAttachmentDeleteIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /** Ids of the attachments whose download is in flight. */
  protected readonly pendingAttachmentDownloadIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /** Ids of the tags whose removal is in flight. */
  protected readonly pendingTagRemoveIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  /** The organization's facilities, preloaded for the assignment dialog. */
  protected readonly facilityOptions: WritableSignal<
    ReadonlyArray<{ readonly value: string; readonly label: string }>
  > = signal([]);

  /** Whether the facility assignment dialog is open. */
  protected readonly assignFacilityDialogVisible: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canWrite
   * @readonly
   * @description Whether the member may write to this equipment at all.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.EQUIPMENT_WRITE),
  );

  /** The record's own display title. */
  protected readonly title: Signal<string> = computed<string>(() => {
    const equipment: EquipmentOutput | null = this.activeEquipmentStore.selectedEquipment();

    return equipment ? buildEquipmentTitle(equipment) : '';
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
    const equipment: EquipmentOutput | null = this.activeEquipmentStore.selectedEquipment();
    if (!equipment) return '';

    const formatter = new Intl.DateTimeFormat(this.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const when: string = formatter.format(new Date(equipment.updatedAt));

    return $localize`:@@equipment.detail.metaUpdated:Updated ${when}:when:`;
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
   * @type {Signal<{ readonly label: string; readonly run: () => void } | null>}
   */
  protected readonly primaryAction: Signal<{
    readonly label: string;
    readonly run: () => void;
  } | null> = computed(() => {
    const equipment: EquipmentOutput | null = this.activeEquipmentStore.selectedEquipment();
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
   * @description Whether the secondary Decommission action applies — every status but the terminal one.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canDecommission: Signal<boolean> = computed<boolean>(
    () => this.activeEquipmentStore.selectedEquipment()?.status !== 'decommissioned',
  );

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The lifecycle band, registered on the shell header instead of an in-page title band. */
  private readonly pageActions: Signal<TemplateRef<unknown> | undefined> =
    viewChild<TemplateRef<unknown>>('pageActions');
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
   * template's `app-error-state` branch and {@link retryLoad}, the global
   * feedback listener already toasts the failure — and registers
   * {@link pageActions}.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

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

      untracked((): void => {
        this.facilityService
          .list(organizationId, { itemsPerPage: FACILITY_OPTIONS_PAGE_SIZE })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((response) => {
            this.facilityOptions.set(
              response.member.map((facility) => ({ label: facility.name, value: facility.id })),
            );
          });
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
   * Method onEditTargetChanged
   * @description Opens or closes an in-place field, clearing any rejection left from the previous attempt.
   * @access protected
   * @since 1.0.0
   * @param {EquipmentEditTarget | null} target - The field to open, or null to close.
   * @returns {void}
   */
  protected onEditTargetChanged(target: EquipmentEditTarget | null): void {
    this.editState.set({ open: target, saving: null, failed: null, failure: null });
  }

  /**
   * Method retryLoad
   * @description The load-failed state's retry — re-runs {@link ActiveEquipmentStore}'s resolve for this record.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected retryLoad(): void {
    this.activeEquipmentStore.resolveEquipment({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
    });
  }

  /**
   * Method onDetailsChanged
   * @description Sends an in-place patch. The field stays open until the write settles.
   * @access protected
   * @since 1.0.0
   * @param {UpdateEquipmentInput} patch - The single-property patch.
   * @returns {void}
   */
  protected onDetailsChanged(patch: UpdateEquipmentInput): void {
    const target: EquipmentEditTarget | null = this.editState().open;
    if (target === null) return;

    this.editState.set({ open: target, saving: target, failed: null, failure: null });
    this.store.update({
      organizationId: this.organizationId(),
      equipmentId: this.equipmentId(),
      input: patch,
    });
  }

  /**
   * Method onDecommission
   * @description Runs the secondary Decommission action, refusing it while another lifecycle write is in flight.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onDecommission(): void {
    this.runLifecycle(() => this.store.decommission(this.lifecycleArgs()));
  }

  /**
   * Method lifecycleArgs
   * @description The `{ organizationId, equipmentId }` pair every lifecycle method takes.
   * @access private
   * @since 1.0.0
   * @returns {{ organizationId: string; equipmentId: string }} The pair.
   */
  private lifecycleArgs(): { readonly organizationId: string; readonly equipmentId: string } {
    return { organizationId: this.organizationId(), equipmentId: this.equipmentId() };
  }

  /**
   * Method runLifecycle
   * @description Refuses a lifecycle action while another one is already in flight.
   * @access private
   * @since 1.0.0
   * @param {() => void} run - The store call to make.
   * @returns {void}
   */
  private runLifecycle(run: () => void): void {
    if (this.store.isChangingLifecycle()) return;

    run();
  }

  /**
   * Method settleUpdateWrite
   * @description Closes the open field on a successful write, or attributes the rejection to it.
   * @access private
   * @since 1.0.0
   * @param {CallState<EquipmentOutput | null>} callState - The update write's call state.
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
   * Method onAttachmentDeleteRequested
   * @description Deletes the given attachment.
   * @access protected
   * @since 1.5.0
   * @param {EquipmentAttachmentOutput} attachment - The attachment to delete.
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
   * @description Attaches (or creates and attaches) a tag by name.
   * @access protected
   * @since 1.5.0
   * @param {string} name - The tag name.
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
   * @description Detaches the given tag, locking its chip on its own write.
   * @access protected
   * @since 1.5.0
   * @param {EquipmentTagOutput} tag - The tag to detach.
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
   * @description Submits the picked facility from the assignment dialog.
   * @access protected
   * @since 1.5.0
   * @param {string} facilityId - The picked facility's id.
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
   * @description Clears the equipment's facility assignment.
   * @access protected
   * @since 1.5.0
   * @returns {void}
   */
  protected onFacilityUnassigned(): void {
    this.store.unassignFromFacility(this.lifecycleArgs());
  }
  //#endregion
}
