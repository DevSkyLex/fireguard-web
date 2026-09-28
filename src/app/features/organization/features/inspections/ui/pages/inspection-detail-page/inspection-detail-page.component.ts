import type { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
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
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBan,
  lucideChevronDown,
  lucideCircleAlert,
  lucideDownload,
  lucideWrench,
  lucideCheck,
  lucideSend,
} from '@ng-icons/lucide';
import { take } from 'rxjs';
import { pickAvatarUrl } from '@core/api/utils';
import { FeedbackService } from '@core/feedback';
import { PageActionsService, registerPageActions } from '@core/page-actions';
import { isCallPending, isCallSuccess, type CallState } from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import { InspectionService } from '@features/organization/features/inspections/data-access';
import type {
  AddNonConformityInput,
  InspectionEditState,
  InspectionEditTarget,
  InspectionOutput,
  NonConformityStatus,
  UpdateInspectionInput,
} from '@features/organization/features/inspections/models';
import {
  ActiveInspectionStore,
  InspectionStore,
  type InspectionStoreType,
} from '@features/organization/features/inspections/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import {
  REGIONAL_FORMATTING_PORT,
  type RegionalFormattingPort,
} from '@features/organization/ports';
import { BrowserDownloadService } from '@features/organization/services/browser-download';
import { buildCsvExportFilename, resolveCsvExportErrorDetail } from '@features/organization/utils';
import { OrgDatePipe, type RegionalFormatSettings } from '@shared/regional-format';
import { HlmAlertImports } from '@shared/ui/alert';
import { HlmAvatarImports } from '@shared/ui/avatar';
import { HlmBadge } from '@shared/ui/badge';
import { HlmButton } from '@shared/ui/button';
import { HlmCollapsibleImports } from '@shared/ui/collapsible';
import { HlmDropdownMenuImports } from '@shared/ui/dropdown-menu';
import { HlmEmptyImports } from '@shared/ui/empty';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InspectionInformationPanel } from '../../components/inspection-information-panel';
import { InspectionStatusTag } from '../../components/inspection-status-tag';
import { NonConformityList } from '../../dataviews/non-conformity-list';
import { InspectionCancelDialog } from '../../dialogs/inspection-cancel-dialog';
import { NonConformityAddDialog } from '../../dialogs/non-conformity-add-dialog';

/** The inspection properties this page has open, writing or showing a rejection. */
const IDLE_EDIT_STATE: InspectionEditState = {
  open: null,
  saving: null,
  failed: null,
  failure: null,
};

/**
 * Component InspectionDetailPage
 * @class InspectionDetailPage
 *
 * @description
 * Route entry page for one inspection record
 * (`/organizations/:organizationId/inspections/:inspectionId`). Everything
 * writable is edited right here — there is no edit page (`FEATURE.md` "The
 * record is the edit surface"): a lead identity block (status/result tags,
 * a compact equipment · facility · date · inspector summary, and a
 * created/updated meta line), a lifecycle band naming the single relevant
 * action for the current status (Submit while `draft`, Close while
 * `submitted`, none once terminal) plus a confirm-gated Cancel while
 * `draft`, and {@link InspectionInformationPanel} for the editable fields.
 * The equipment and facility rows use `InspectionOutput.equipmentSerialNumber`
 * and `.facilityName` directly — both filled on the single-resource GET, so
 * no extra lookup is needed to name them.
 *
 * Only a `draft` inspection may be edited, submitted or cancelled
 * (`FEATURE.md` "Only draft inspections can be edited, submitted, or
 * cancelled; submitted inspections can be closed"); this page is the sole
 * owner of that gate; the panel only reflects it through {@link editable}.
 *
 * `inspectionResolver` (route `resolve`) seeds {@link ActiveInspectionStore}
 * fire-and-forget, so this page always renders immediately: the full-page
 * skeleton shows from the store's pending state until the record lands, the
 * document title follows through `TitleService`, and a load failure shows
 * the Spartan `hlmEmpty` error composition with a retry that re-runs {@link ActiveInspectionStore}'s
 * resolve (`DESIGN.md` "Detail-page gating") rather than leaving the operator
 * on an eternal skeleton or navigating them away silently. A route-scoped
 * {@link InspectionStore} carries the update and lifecycle writes. Every
 * date on the lead block and the meta line renders through {@link RegionalFormattingPort},
 * the same organization timezone and pattern the rest of the organization's
 * pages honor.
 *
 * The record's name is the shell breadcrumb's title, resolved by
 * `inspectionTitleResolver`; "Export report" registers alongside the
 * lifecycle band on the shell header through `PageActionsService`. The
 * Cancel confirmation is {@link InspectionCancelDialog} (`DESIGN.md` §
 * Action Surfaces rule 5). A quiet "Interventions on this site" proxy link —
 * shown only when the inspection carries a `facilityId` — points at the
 * interventions list pre-filtered by that facility's `site`; it is a proxy
 * by site, not a filter by inspection, and is labelled as such.
 *
 * The non-conformities section is its own `hlm-collapsible`, collapsed by
 * default — its list loads only on that first expansion (`AGENTS.md`
 * "Secondary UI data"). Writing to a row (a status change or
 * {@link NonConformityAddDialog}) is gated on {@link canWrite}; adding one is
 * further hidden on a `closed` inspection through {@link canAddNonConformity},
 * while a status change stays available regardless of the inspection's own
 * status — the backend blocks only the add endpoint on `closed`
 * (`FEATURE.md`). {@link nonConformitiesLabel} reads the freshest count
 * available: the store's own running total once the section has loaded at
 * least once, the record's own snapshot count otherwise — so an added row
 * is reflected immediately rather than waiting on a re-fetch.
 *
 * @version 2.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-detail-page',
  imports: [
    NgIcon,
    OrgDatePipe,
    ...HlmEmptyImports,
    RouterLink,
    ...HlmAlertImports,
    ...HlmAvatarImports,
    HlmBadge,
    ...HlmCollapsibleImports,
    ...HlmDropdownMenuImports,
    InspectionCancelDialog,
    InspectionInformationPanel,
    InspectionStatusTag,
    NonConformityAddDialog,
    NonConformityList,
    HlmButton,
    HlmSkeleton,
    ...HlmSpinnerImports,
  ],
  providers: [
    provideIcons({
      lucideBan,
      lucideChevronDown,
      lucideCircleAlert,
      lucideDownload,
      lucideWrench,
      lucideCheck,
      lucideSend,
    }),
  ],
  templateUrl: './inspection-detail-page.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InspectionDetailPage {
  //#region Inputs
  /**
   * Property organizationId
   * @readonly
   * @description The workspace owning this inspection, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  /**
   * Property inspectionId
   * @readonly
   * @description The resolved inspection's id, bound from the route.
   * @access public
   * @since 1.0.0
   * @type {InputSignal<string>}
   */
  public readonly inspectionId: InputSignal<string> = input.required<string>();
  //#endregion

  //#region Properties
  /** The currently active inspection, seeded by `inspectionResolver`; null until the fetch lands. */
  protected readonly activeInspectionStore: ActiveInspectionStore =
    inject<ActiveInspectionStore>(ActiveInspectionStore);

  /** Document title channel, kept in sync with the loaded record. */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);

  /** The route-scoped store carrying the update and lifecycle writes. */
  protected readonly store: InspectionStoreType = inject<InspectionStoreType>(InspectionStore);

  /** Transport used directly for the one-shot non-conformities CSV export — a download, not list state. */
  private readonly inspectionService: InspectionService = inject(InspectionService);

  /** Hands the export blob to the browser as a file download. */
  private readonly browserDownload: BrowserDownloadService = inject(BrowserDownloadService);

  /** Global toast feedback for the export's warn and error paths. */
  private readonly feedback: FeedbackService = inject(FeedbackService);

  /** Unsubscribes an in-flight export when the page is destroyed. */
  private readonly exportDestroyRef: DestroyRef = inject(DestroyRef);

  /** Whether a non-conformities CSV export is currently in flight. */
  protected readonly exportBusy: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the export button should be inert: the section's list still loading, nothing listed at all, or an export already in flight. */
  protected readonly exportDisabled: Signal<boolean> = computed(
    (): boolean => this.store.isLoadingNonConformities() || this.exportBusy(),
  );

  /** Whether the inspection's PDF report export is currently in flight. */
  protected readonly reportExporting: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the non-conformities PDF report export is currently in flight. */
  protected readonly ncReportExporting: WritableSignal<boolean> = signal<boolean>(false);

  /** Whether the non-conformities report button should be inert: the section's list still loading, or a report already in flight. */
  protected readonly ncReportDisabled: Signal<boolean> = computed(
    (): boolean => this.store.isLoadingNonConformities() || this.ncReportExporting(),
  );

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Router used to return to the list once a cancellation succeeds. */
  private readonly router: Router = inject(Router);

  /** Publishes the active organization's date pattern and timezone for every date on this page. */
  private readonly regionalFormattingPort: RegionalFormattingPort =
    inject<RegionalFormattingPort>(REGIONAL_FORMATTING_PORT);

  /**
   * Property regionalFormatting
   * @readonly
   * @description The active organization's date pattern and timezone.
   * @access protected
   * @since 2.0.0
   * @type {Signal<RegionalFormatSettings>}
   */
  protected readonly regionalFormatting: Signal<RegionalFormatSettings> =
    this.regionalFormattingPort.regionalFormatting;

  /**
   * Property orgDatePipe
   * @readonly
   * @description A directly instantiated, dependency-free `OrgDatePipe`, reused to format the title and meta line the same way the template does — the pipe needs no injection to run.
   * @access private
   * @since 2.0.0
   * @type {OrgDatePipe}
   */
  private readonly orgDatePipe: OrgDatePipe = new OrgDatePipe();

  /** Which in-place field is open, writing, or showing a rejection. */
  protected readonly editState: WritableSignal<InspectionEditState> =
    signal<InspectionEditState>(IDLE_EDIT_STATE);

  /** Whether the Cancel confirmation is open. */
  protected readonly pendingCancel: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property canWrite
   * @readonly
   * @description Whether the member may write to this inspection at all.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canWrite: Signal<boolean> = computed<boolean>(() =>
    this.permissions.hasPermission(ORGANIZATION_PERMISSION.INSPECTION_WRITE),
  );

  /**
   * Property canEditFields
   * @readonly
   *
   * @description
   * Whether the in-place fields open at all: the write permission **and**
   * the draft-only edit gate (`FEATURE.md`). A submitted or closed
   * inspection stays read-only here even for a member who could otherwise
   * write.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canEditFields: Signal<boolean> = computed<boolean>(
    () => this.canWrite() && this.activeInspectionStore.selectedInspection()?.status === 'draft',
  );

  /**
   * Property canCancel
   * @readonly
   * @description Whether the Cancel action applies — only a `draft` inspection.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canCancel: Signal<boolean> = computed<boolean>(
    () => this.activeInspectionStore.selectedInspection()?.status === 'draft',
  );

  /**
   * Property canClose
   * @readonly
   * @description Whether the Close action applies — only a `submitted` inspection.
   * @access protected
   * @since 1.0.0
   * @type {Signal<boolean>}
   */
  protected readonly canClose: Signal<boolean> = computed<boolean>(
    () => this.activeInspectionStore.selectedInspection()?.status === 'submitted',
  );

  /**
   * Property canAddNonConformity
   * @readonly
   *
   * @description
   * Whether the "Add non-conformity" entry point renders at all — the write
   * permission **and** the record not being `closed`, the backend's only
   * documented 409 on the add endpoint (`FEATURE.md`). A member with write
   * access still sees a quiet explanation instead of the form once the
   * inspection is closed, rather than a confusing failed submission.
   *
   * @access protected
   * @since 1.5.0
   * @type {Signal<boolean>}
   */
  protected readonly canAddNonConformity: Signal<boolean> = computed<boolean>(
    () => this.canWrite() && this.activeInspectionStore.selectedInspection()?.status !== 'closed',
  );

  /** Whether the non-conformities section is expanded — collapsed by default, its list loads on first expansion. */
  protected readonly nonConformitiesExpanded: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property addNonConformityDialogVisible
   * @readonly
   * @description Whether the add non-conformity dialog is visible.
   * @access protected
   * @since 1.0.0
   * @type {WritableSignal<boolean>}
   */
  protected readonly addNonConformityDialogVisible: WritableSignal<boolean> =
    signal<boolean>(false);

  /** The id of the non-conformity whose status write is currently in flight, or `null`. */
  protected readonly pendingNonConformityId: WritableSignal<string | null> = signal<string | null>(
    null,
  );

  /**
   * Property title
   * @readonly
   * @description The record's own display title.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed<string>(() => {
    const inspection: InspectionOutput | null = this.activeInspectionStore.selectedInspection();
    if (!inspection) return '';

    const when: string = this.orgDatePipe.transform(
      inspection.performedAt,
      'date',
      this.regionalFormatting(),
    );

    return $localize`:@@inspection.titleResolver:Inspection ${when}:date:`;
  });

  /**
   * Property nonConformitiesLabel
   * @readonly
   *
   * @description
   * The header's non-conformity count, correctly pluralized. Reads the
   * store's own running total once the non-conformities section has loaded
   * at least once — which stays current through an add — falling back to
   * the record's own snapshot count before that first load.
   *
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly nonConformitiesLabel: Signal<string> = computed<string>(() => {
    const count: number =
      this.store.nonConformitiesListCallState().status === 'success'
        ? this.store.totalNonConformities()
        : (this.activeInspectionStore.selectedInspection()?.nonConformitiesCount ?? 0);

    return count === 1
      ? $localize`:@@inspection.detail.nonConformitiesCountOne:1 non-conformity`
      : $localize`:@@inspection.detail.nonConformitiesCountMany:${count}:count: non-conformities`;
  });

  /**
   * Property metaLine
   * @readonly
   * @description The header's metadata line — when the record was created and last touched.
   * @access protected
   * @since 2.0.0
   * @type {Signal<string>}
   */
  protected readonly metaLine: Signal<string> = computed<string>(() => {
    const inspection: InspectionOutput | null = this.activeInspectionStore.selectedInspection();
    if (!inspection) return '';

    const settings: RegionalFormatSettings = this.regionalFormatting();
    const created: string = this.orgDatePipe.transform(inspection.createdAt, 'date', settings);
    const updated: string = this.orgDatePipe.transform(inspection.updatedAt, 'date', settings);

    return $localize`:@@inspection.detail.metaCreatedUpdated:Created ${created}:created: · Updated ${updated}:updated:`;
  });

  /** Registers {@link pageActions} on the shell header. */
  private readonly pageActionsService: PageActionsService = inject(PageActionsService);

  /** The lifecycle band (Cancel/Submit/Close), registered on the shell header instead of an in-page title band. */
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
   * template's the Spartan `hlmEmpty` error composition branch and {@link retryLoad}, the global
   * feedback listener already toasts the failure — returns to the list once
   * a cancellation succeeds — `InspectionStore.cancel` removes the record,
   * so there is nothing left here to show — clears {@link pendingNonConformityId}
   * once its status write settles, closes the add-non-conformity dialog on a
   * successful add, and registers {@link pageActions}.
   *
   * @access public
   * @since 1.5.0
   */
  public constructor() {
    registerPageActions(this.pageActions, this.pageActionsService, inject(DestroyRef));

    effect((): void => {
      const callState: CallState<InspectionOutput | null> = this.store.updateCallState();

      untracked((): void => this.settleUpdateWrite(callState));
    });

    effect((): void => {
      const title: string = this.title();
      if (!title) return;

      untracked((): void => this.titleService.setTitle(title));
    });

    effect((): void => {
      const callState: CallState<string | null> = this.store.cancelCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;

        void this.router.navigate(['/organizations', this.organizationId(), 'inspections']);
      });
    });

    effect((): void => {
      const isUpdating: boolean = this.store.isUpdatingNonConformity();

      untracked((): void => {
        if (!isUpdating) this.pendingNonConformityId.set(null);
      });
    });

    effect((): void => {
      const succeeded: boolean = isCallSuccess(this.store.addNonConformityCallState());

      untracked((): void => {
        if (succeeded && this.addNonConformityDialogVisible()) {
          this.addNonConformityDialogVisible.set(false);
          this.store.resetAddNonConformityOperation();
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
   * @param {InspectionEditTarget | null} target - The field to open, or null to close.
   * @returns {void}
   */
  protected onEditTargetChanged(target: InspectionEditTarget | null): void {
    this.editState.set({ open: target, saving: null, failed: null, failure: null });
  }

  /**
   * Method retryLoad
   * @description The load-failed state's retry — re-runs {@link ActiveInspectionStore}'s resolve for this record.
   * @access protected
   * @since 1.2.0
   * @returns {void}
   */
  protected retryLoad(): void {
    this.activeInspectionStore.resolveInspection({
      organizationId: this.organizationId(),
      inspectionId: this.inspectionId(),
    });
  }

  /**
   * Method onDetailsChanged
   * @description Sends an in-place patch. The field stays open until the write settles.
   * @access protected
   * @since 1.0.0
   * @param {UpdateInspectionInput} patch - The single-property patch.
   * @returns {void}
   */
  protected onDetailsChanged(patch: UpdateInspectionInput): void {
    const target: InspectionEditTarget | null = this.editState().open;
    if (target === null) return;

    this.editState.set({ open: target, saving: target, failed: null, failure: null });
    this.store.update({
      organizationId: this.organizationId(),
      inspectionId: this.inspectionId(),
      input: patch,
    });
  }

  /**
   * Method onSubmit
   * @description Submits the draft inspection, refusing it while another lifecycle write is in flight.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onSubmit(): void {
    if (this.store.isChangingLifecycle()) return;

    this.store.submit({ organizationId: this.organizationId(), inspectionId: this.inspectionId() });
  }

  /**
   * Method onClose
   * @description Closes the submitted inspection, refusing it while another lifecycle write is in flight.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected onClose(): void {
    if (this.store.isChangingLifecycle()) return;

    this.store.close({ organizationId: this.organizationId(), inspectionId: this.inspectionId() });
  }

  /**
   * Method requestCancel
   * @description Opens the Cancel confirmation.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected requestCancel(): void {
    this.pendingCancel.set(true);
  }

  /**
   * Method confirmCancel
   * @description Sends the cancel write. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 1.0.0
   * @returns {void}
   */
  protected confirmCancel(): void {
    this.store.cancel({ organizationId: this.organizationId(), inspectionId: this.inspectionId() });
  }

  /**
   * Method onCancelDialogVisibleChanged
   * @description Clears the pending flag on any dismissal — "Keep it", the backdrop or Escape.
   * @access protected
   * @since 1.3.0
   * @param {boolean} visible - The dialog's new visibility.
   * @returns {void}
   */
  protected onCancelDialogVisibleChanged(visible: boolean): void {
    if (visible) return;

    this.pendingCancel.set(false);
  }

  /**
   * Method exportNonConformitiesCsv
   *
   * @description
   * Downloads the organization's non-conformities as CSV
   * (`InspectionService.exportNonConformitiesCsv`). The export endpoint has
   * no per-inspection scoping — it always covers the whole organization,
   * not only the inspection on screen — so a warn toast announces that the
   * file is wider than the section before the download starts.
   *
   * @access protected
   * @since 1.6.0
   * @returns {void}
   */
  protected exportNonConformitiesCsv(): void {
    this.feedback.warn(
      $localize`:@@inspection.nc.exportScope:The export covers every non-conformity in the organization, not only this inspection's.`,
    );

    this.exportBusy.set(true);

    this.inspectionService
      .exportNonConformitiesCsv(this.organizationId())
      .pipe(take(1), takeUntilDestroyed(this.exportDestroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.exportBusy.set(false);
          this.browserDownload.trigger(
            blob,
            buildCsvExportFilename('non-conformities', this.organizationId()),
          );
        },
        error: (error: HttpErrorResponse): void => {
          this.exportBusy.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ?? $localize`:@@inspection.nc.exportFailed:Couldn't export non-conformities.`,
            );
          });
        },
      });
  }

  /**
   * Method exportReport
   *
   * @description
   * Fetches the inspection's PDF report
   * (`InspectionService.exportReport`) and saves it to the visitor's
   * device, locking the button on {@link reportExporting} — a single
   * boolean, since there is only one report to export at a time —
   * mirroring `InterventionDetailPage.exportReport`'s flow. The backend
   * additionally gates the report on the organization's plan tier: a
   * non-entitled plan answers `403` with an RFC 7807 `detail`, surfaced
   * verbatim in the error toast through `resolveCsvExportErrorDetail`
   * (which reads any blob-wrapped problem document, not only CSV ones).
   *
   * @access protected
   * @since 1.7.0
   * @returns {void}
   */
  protected exportReport(): void {
    this.reportExporting.set(true);

    this.inspectionService
      .exportReport(this.organizationId(), this.inspectionId())
      .pipe(take(1), takeUntilDestroyed(this.exportDestroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.reportExporting.set(false);
          this.browserDownload.trigger(blob, `inspection-${this.inspectionId()}-report.pdf`);
        },
        error: (error: HttpErrorResponse): void => {
          this.reportExporting.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ??
                $localize`:@@inspection.report.exportFailed:Couldn't export the inspection report.`,
            );
          });
        },
      });
  }

  /**
   * Method exportNonConformitiesReport
   *
   * @description
   * Downloads the organization's non-conformities as a PDF report
   * (`InspectionService.exportNonConformitiesReport`). Like the CSV export
   * beside it, the endpoint has no per-inspection scoping — a warn toast
   * announces that the file is wider than the section before the download
   * starts. A non-entitled plan answers `403` with an RFC 7807 `detail`,
   * surfaced verbatim in the error toast.
   *
   * @access protected
   * @since 1.7.0
   * @returns {void}
   */
  protected exportNonConformitiesReport(): void {
    this.feedback.warn(
      $localize`:@@inspection.nc.exportScope:The export covers every non-conformity in the organization, not only this inspection's.`,
    );

    this.ncReportExporting.set(true);

    this.inspectionService
      .exportNonConformitiesReport(this.organizationId())
      .pipe(take(1), takeUntilDestroyed(this.exportDestroyRef))
      .subscribe({
        next: (blob: Blob): void => {
          this.ncReportExporting.set(false);
          this.browserDownload.trigger(
            blob,
            `non-conformities-${this.organizationId()}-report.pdf`,
          );
        },
        error: (error: HttpErrorResponse): void => {
          this.ncReportExporting.set(false);
          void resolveCsvExportErrorDetail(error).then((detail: string | null): void => {
            this.feedback.error(
              detail ??
                $localize`:@@inspection.nc.reportExportFailed:Couldn't export the non-conformities report.`,
            );
          });
        },
      });
  }

  /**
   * Method onNonConformitiesExpandedChanged
   *
   * @description
   * Reacts to the `hlm-collapsible` section's own `expandedChange`. The list
   * is secondary UI data (`AGENTS.md` "Routing, SSR, and hydration"), so it
   * loads only on the first expansion, or a re-expansion after a failed load
   * — never on page load.
   *
   * @access protected
   * @since 2.0.0
   * @param {boolean} expanded - Whether the section is now expanded.
   * @returns {void}
   */
  protected onNonConformitiesExpandedChanged(expanded: boolean): void {
    this.nonConformitiesExpanded.set(expanded);

    const status: string = this.store.nonConformitiesListCallState().status;
    if (expanded && (status === 'idle' || status === 'error')) this.loadNonConformities();
  }

  /**
   * Method loadNonConformities
   * @description Loads (or retries) the non-conformities section, for {@link onNonConformitiesExpandedChanged} and the section's own error-state retry.
   * @access protected
   * @since 2.0.0
   * @returns {void}
   */
  protected loadNonConformities(): void {
    this.store.loadNonConformities({
      organizationId: this.organizationId(),
      inspectionId: this.inspectionId(),
    });
  }

  /**
   * Method openAddNonConformityDialog
   * @description Opens the "Add non-conformity" dialog, clearing any rejection left from a previous attempt.
   * @access protected
   * @since 1.5.0
   * @returns {void}
   */
  protected openAddNonConformityDialog(): void {
    this.store.resetAddNonConformityOperation();
    this.addNonConformityDialogVisible.set(true);
  }

  /**
   * Method closeAddNonConformityDialog
   * @description Closes the dialog and resets its operation state — the backdrop, Escape or Cancel.
   * @access protected
   * @since 1.5.0
   * @returns {void}
   */
  protected closeAddNonConformityDialog(): void {
    this.addNonConformityDialogVisible.set(false);
    this.store.resetAddNonConformityOperation();
  }

  /**
   * Method onNonConformityAdded
   * @description Sends the validated add-non-conformity payload. The dialog closes once the store settles, via the constructor effect.
   * @access protected
   * @since 1.5.0
   * @param {AddNonConformityInput} payload - The dialog's validated payload.
   * @returns {void}
   */
  protected onNonConformityAdded(payload: AddNonConformityInput): void {
    this.store.addNonConformity({
      organizationId: this.organizationId(),
      inspectionId: this.inspectionId(),
      input: payload,
    });
  }

  /**
   * Method onNonConformityStatusPicked
   * @description Sends a row's status write, refusing a second one while one is already in flight.
   * @access protected
   * @since 1.5.0
   * @param {{ nonConformityId: string; status: NonConformityStatus }} event - The row and the chosen status.
   * @returns {void}
   */
  protected onNonConformityStatusPicked(event: {
    nonConformityId: string;
    status: NonConformityStatus;
  }): void {
    if (this.store.isUpdatingNonConformity()) return;

    this.pendingNonConformityId.set(event.nonConformityId);
    this.store.updateNonConformityStatus({
      organizationId: this.organizationId(),
      inspectionId: this.inspectionId(),
      nonConformityId: event.nonConformityId,
      input: { status: event.status },
    });
  }

  /**
   * Method settleUpdateWrite
   * @description Closes the open field on a successful write, or attributes the rejection to it.
   * @access private
   * @since 1.0.0
   * @param {CallState<InspectionOutput | null>} callState - The update write's call state.
   * @returns {void}
   */
  private settleUpdateWrite(callState: CallState<InspectionOutput | null>): void {
    if (isCallPending(callState)) return;

    const state: InspectionEditState = this.editState();
    if (state.saving === null) return;

    const failure: string | null = callState.error?.message ?? null;
    if (failure === null) {
      this.editState.set(IDLE_EDIT_STATE);

      return;
    }

    this.editState.set({ open: state.saving, saving: null, failed: state.saving, failure });
  }

  /**
   * Method inspectorInitialsOf
   * @description Avatar fallback initials derived from the inspector's display name, for the lead summary's avatar.
   * @access protected
   * @since 2.0.0
   * @param {InspectionOutput} inspection - The loaded record.
   * @returns {string} Up to two uppercase initials, or an empty string when there is no inspector.
   */
  protected inspectorInitialsOf(inspection: InspectionOutput): string {
    const name: string | undefined = inspection.inspector?.displayName;
    if (!name) return '';

    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string): string => part.charAt(0).toUpperCase())
      .join('');
  }

  /**
   * Method inspectorAvatarUrlOf
   * @description The inspector's best-fit avatar URL for a small avatar, or `null` when none is available.
   * @access protected
   * @since 2.0.0
   * @param {InspectionOutput} inspection - The loaded record.
   * @returns {string | null} The resolved avatar URL, or `null`.
   */
  protected inspectorAvatarUrlOf(inspection: InspectionOutput): string | null {
    const inspector = inspection.inspector;
    if (!inspector) return null;

    return pickAvatarUrl(inspector.avatarUrls, '64', inspector.avatarUrl);
  }
  //#endregion
}
