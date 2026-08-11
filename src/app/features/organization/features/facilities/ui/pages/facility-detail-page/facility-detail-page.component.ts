import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  LOCALE_ID,
  signal,
  untracked,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideTrash2 } from '@ng-icons/lucide';
import type { BrnDialogState } from '@spartan-ng/brain/dialog';
import { isCallPending, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  FacilityEditState,
  FacilityEditTarget,
  FacilityOutput,
  UpdateFacilityInput,
} from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityOverviewStore,
  FacilityStore,
  type FacilityStoreType,
} from '@features/organization/features/facilities/state';
import type { InspectionResult } from '@features/organization/features/inspections/models';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { HlmAlertDialogImports } from '@shared/ui/alert-dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmCardImports } from '@shared/ui/card';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmTabsImports } from '@shared/ui/tabs';
import { FacilityHierarchyChart } from '../../components/facility-hierarchy-chart';
import { FacilityInformationPanel } from '../../components/facility-information-panel';
import { FacilityStatusTag } from '../../components/facility-status-tag';
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
 * (`/organizations/:organizationId/facilities/:facilityId`). Two tabs:
 * **Overview** (default) renders the descendant hierarchy through
 * {@link FacilityHierarchyChart} plus the equipment/inspection summary from
 * {@link FacilityOverviewStore}; **Information** renders
 * {@link FacilityInformationPanel}, the in-place edit surface for every
 * writable property (`FEATURE.md` "The record is the edit surface" — there
 * is no separate edit page). A danger, confirm-gated **Delete** action sits
 * in the header (`FEATURE.md` "Deletion").
 *
 * `facilityResolver` (route `resolve`) populates {@link ActiveFacilityStore}
 * before this page renders; a route-scoped {@link FacilityStore} carries the
 * update, archive/restore and delete writes, and a route-scoped
 * {@link FacilityOverviewStore} carries the Overview tab's summary data.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-detail-page',
  imports: [
    DatePipe,
    NgIcon,
    FacilityHierarchyChart,
    FacilityInformationPanel,
    FacilityStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmAlertDialogImports,
    ...HlmCardImports,
    ...HlmTabsImports,
  ],
  providers: [FacilityOverviewStore, provideIcons({ lucideTrash2 })],
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
  //#endregion

  //#region Properties
  /** The currently active facility, resolved by `facilityResolver` before this page renders. */
  protected readonly activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  /** The route-scoped store carrying the update, archive/restore and delete writes. */
  protected readonly store: FacilityStoreType = inject<FacilityStoreType>(FacilityStore);

  /** The route-scoped store carrying the Overview tab's equipment/inspection summary. */
  protected readonly overview: FacilityOverviewStore = inject(FacilityOverviewStore);

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** Router used to navigate a hierarchy-node selection and the post-delete return to the list. */
  private readonly router: Router = inject(Router);

  /** The application's language, used to phrase the header's metadata line. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** Which in-place field is open, writing, or showing a rejection. */
  protected readonly editState: WritableSignal<FacilityEditState> =
    signal<FacilityEditState>(IDLE_EDIT_STATE);

  /** Which of the record's two tabs is showing. Page-local UI state, `overview` by default. */
  protected readonly activeTab: WritableSignal<FacilityDetailTabId> =
    signal<FacilityDetailTabId>('overview');

  /** Whether the Delete confirmation is open. */
  protected readonly pendingDelete: WritableSignal<boolean> = signal<boolean>(false);

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
   * Property deleteDialogState
   * @readonly
   * @description The confirm dialog's open/closed state, derived from {@link pendingDelete}.
   * @access protected
   * @since 1.0.0
   * @type {Signal<BrnDialogState>}
   */
  protected readonly deleteDialogState: Signal<BrnDialogState> = computed<BrnDialogState>(() =>
    this.pendingDelete() ? 'open' : 'closed',
  );

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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Settles the open in-place field once its own write clears, loads the
   * Overview tab's summary and (when the facility has children) its
   * descendant subtree once the record resolves, and returns to the list
   * once a delete write succeeds.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const callState: CallState<FacilityOutput | null> = this.store.updateCallState();

      untracked((): void => this.settleUpdateWrite(callState));
    });

    effect((): void => {
      const facility: FacilityOutput | null = this.activeFacilityStore.selectedFacility();
      if (!facility) return;

      const organizationId: string = this.organizationId();

      untracked((): void => {
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
   * @description Narrows `hlm-tabs`' plain-string `tabActivated` payload before writing {@link activeTab}.
   * @access protected
   * @since 1.0.0
   * @param {string} tab - The `hlm-tabs` id that just activated.
   * @returns {void}
   */
  protected onLinkedTabActivated(tab: string): void {
    if (tab === 'overview' || tab === 'information') this.activeTab.set(tab);
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
   * Method onEditTargetChanged
   * @description Opens or closes an in-place field, clearing any rejection left from the previous attempt.
   * @access protected
   * @since 1.0.0
   * @param {FacilityEditTarget | null} target - The field to open, or null to close.
   * @returns {void}
   */
  protected onEditTargetChanged(target: FacilityEditTarget | null): void {
    this.editState.set({ open: target, saving: null, failed: null, failure: null });
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
   * Method onDeleteDialogStateChanged
   * @description Clears the pending flag on any dismissal — Cancel, the backdrop or Escape.
   * @access protected
   * @since 1.0.0
   * @param {BrnDialogState} state - The overlay's new state.
   * @returns {void}
   */
  protected onDeleteDialogStateChanged(state: BrnDialogState): void {
    if (state === 'open') return;

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
