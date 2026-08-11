import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  PLATFORM_ID,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { isCallPending, type CallState, type StoreError } from '@core/request-state';
import { TitleService } from '@core/title';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  InspectionEditState,
  InspectionEditTarget,
  InspectionOutput,
  UpdateInspectionInput,
} from '@features/organization/features/inspections/models';
import {
  ActiveInspectionStore,
  InspectionStore,
  type InspectionStoreType,
} from '@features/organization/features/inspections/state';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { InspectionInformationPanel } from '../../components/inspection-information-panel';
import { InspectionStatusTag } from '../../components/inspection-status-tag';

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
 * record is the edit surface"): a header naming the record with its status
 * and non-conformity count, a lifecycle band naming the single relevant
 * action for the current status (Submit while `draft`, Close while
 * `submitted`, none once terminal) plus a confirm-gated Cancel while
 * `draft`, and {@link InspectionInformationPanel} for the editable fields.
 *
 * Only a `draft` inspection may be edited, submitted or cancelled
 * (`FEATURE.md` "Only draft inspections can be edited, submitted, or
 * cancelled; submitted inspections can be closed"); this page is the sole
 * owner of that gate; the panel only reflects it through {@link editable}.
 *
 * `inspectionResolver` (route `resolve`) seeds {@link ActiveInspectionStore}
 * fire-and-forget, so this page always renders immediately: the full-page
 * skeleton shows from the store's pending state until the record lands, the
 * document title follows through `TitleService`, and a load failure returns
 * to the index. A route-scoped {@link InspectionStore} carries the update
 * and lifecycle writes.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-inspection-detail-page',
  imports: [
    NgIcon,
    InspectionInformationPanel,
    InspectionStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertDialogImports,
    ...HlmSpinnerImports,
  ],
  providers: [provideIcons({ lucideBan })],
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

  /** Whether this instance runs in the browser — the failure redirect never fires during SSR. */
  private readonly isBrowser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /** The route-scoped store carrying the update and lifecycle writes. */
  protected readonly store: InspectionStoreType = inject<InspectionStoreType>(InspectionStore);

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Router used to return to the list once a cancellation succeeds. */
  private readonly router: Router = inject(Router);

  /** The application's language, used to phrase the header's metadata line. */
  private readonly locale: string = inject<string>(LOCALE_ID);

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
   * Property title
   * @readonly
   * @description The record's own display title.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = computed<string>(() => {
    const inspection: InspectionOutput | null = this.activeInspectionStore.selectedInspection();

    return inspection
      ? $localize`:@@inspection.titleResolver:Inspection ${inspection.performedAt.slice(0, 10)}:date:`
      : '';
  });

  /**
   * Property nonConformitiesLabel
   * @readonly
   * @description The header's non-conformity count, correctly pluralized.
   * @access protected
   * @since 1.0.0
   * @type {Signal<string>}
   */
  protected readonly nonConformitiesLabel: Signal<string> = computed<string>(() => {
    const count: number =
      this.activeInspectionStore.selectedInspection()?.nonConformitiesCount ?? 0;

    return count === 1
      ? $localize`:@@inspection.detail.nonConformitiesCountOne:1 non-conformity`
      : $localize`:@@inspection.detail.nonConformitiesCountMany:${count}:count: non-conformities`;
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
    const inspection: InspectionOutput | null = this.activeInspectionStore.selectedInspection();
    if (!inspection) return '';

    const formatter = new Intl.DateTimeFormat(this.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const when: string = formatter.format(new Date(inspection.updatedAt));

    return $localize`:@@inspection.detail.metaUpdated:Updated ${when}:when:`;
  });

  /**
   * Property cancelDialogState
   * @readonly
   * @description The confirm dialog's open/closed state, derived from {@link pendingCancel}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly cancelDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingCancel() ? 'open' : 'closed',
  );
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Settles the open in-place field once its own write clears, re-sets the
   * document title once the seeded record lands (the title resolver only
   * returned the neutral section label), returns to the index when the load
   * fails — the global feedback listener already toasts the failure — and
   * returns to the list once a cancellation succeeds —
   * `InspectionStore.cancel` removes the record, so there is nothing left
   * here to show.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
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
      const error: StoreError | null = this.activeInspectionStore.getError();
      if (error === null || !this.isBrowser) return;

      untracked((): void => {
        void this.router.navigate(['/organizations', this.organizationId(), 'inspections']);
      });
    });

    effect((): void => {
      const callState: CallState<string | null> = this.store.cancelCallState();

      untracked((): void => {
        if (callState.status !== 'success') return;

        void this.router.navigate(['/organizations', this.organizationId(), 'inspections']);
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
   * Method onCancelDialogStateChanged
   * @description Clears the pending flag on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onCancelDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

    this.pendingCancel.set(false);
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
  //#endregion
}
