import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type InputSignal,
  PLATFORM_ID,
  type Signal,
  signal,
  type WritableSignal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import type { TabListPassThrough, TabPanelsPassThrough, TabsPassThrough } from 'primeng/types/tabs';
import { OrganizationPermissionService } from '@features/organization/access';
import {
  DETAIL_TAB_LIST_PT,
  DETAIL_TAB_PANELS_PT,
  DETAIL_TABS_PT,
} from '@features/organization/constants';
import type {
  FacilityOutput,
  MoveFacilityInput,
} from '@features/organization/features/facilities/models';
import {
  ActiveFacilityStore,
  FacilityOverviewStore,
  FacilityStore,
} from '@features/organization/features/facilities/state';
import {
  FacilityDetailHeader,
  FacilityEquipmentTab,
  FacilityInformationPanel,
  FacilityInspectionTab,
  FacilityInstallationsPanel,
} from '@features/organization/features/facilities/ui/components';
import {
  FacilityEquipmentDataview,
  FacilityInspectionDataview,
} from '@features/organization/features/facilities/ui/dataviews';
import { FacilityMoveDialog } from '@features/organization/features/facilities/ui/dialogs/facility-move-dialog';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { EmptyState } from '@shared/empty-state';

/**
 * Component FacilityDetailPage
 * @class FacilityDetailPage
 *
 * @description
 * Facility detail page displaying facility information and
 * tabbed sub-content (Overview, Equipments, Inspections).
 * The facility is resolved by {@link facilityResolver} before
 * this component renders.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-facility-detail',
  imports: [
    ButtonModule,
    SkeletonModule,
    TabsModule,
    FacilityDetailHeader,
    FacilityEquipmentTab,
    FacilityEquipmentDataview,
    FacilityInformationPanel,
    FacilityInspectionDataview,
    FacilityInspectionTab,
    FacilityInstallationsPanel,
    FacilityMoveDialog,
    EmptyState,
  ],
  providers: [FacilityStore, FacilityOverviewStore],
  templateUrl: './facility-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacilityDetailPage {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Routed organization, bound from `:organizationId` by the router. The
   * parameter — not the store — is the source of truth: a page rendered under
   * this segment is, by construction, scoped to that organization.
   *
   * @access public
   * @since 1.1.0
   *
   * @type {InputSignal<string>}
   */
  public readonly organizationId: InputSignal<string> = input.required<string>();

  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Angular Router used to navigate to the edit page and
   * after successful operations.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property route
   * @readonly
   *
   * @description
   * Current activated route, used as a navigation anchor for
   * relative routing.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /** PrimeNG confirmation service guarding the destructive delete action. */
  private readonly confirmationService: ConfirmationService =
    inject<ConfirmationService>(ConfirmationService);

  /** Permission helper gating facility write actions in the header. */
  private readonly organizationPermissionService: OrganizationPermissionService =
    inject<OrganizationPermissionService>(OrganizationPermissionService);

  /** Whether the active member can mutate facilities (gates header Move/Edit). */
  protected readonly canManage: Signal<boolean> = computed<boolean>(() =>
    this.organizationPermissionService.hasPermission(ORGANIZATION_PERMISSION.FACILITIES_WRITE),
  );

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * Angular DI token for the current platform ID, used to conditionally
   * execute browser-only code (e.g. loading the hierarchy chart data and
   * overview KPIs, which are secondary UI data that don't need to be loaded
   * during server-side rendering).
   *
   * @access private
   * @since 1.0.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);

  /**
   * Property activeFacilityStore
   * @readonly
   *
   * @description
   * Root-scoped store that holds the currently resolved facility.
   * Populated by the route resolver before this component renders.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {ActiveFacilityStore}
   */
  protected readonly activeFacilityStore: ActiveFacilityStore =
    inject<ActiveFacilityStore>(ActiveFacilityStore);

  /**
   * Property store
   * @readonly
   *
   * @description
   * Component-scoped FacilityStore used for write operations
   * (move, archive) and loading the parent options for the
   * move dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityStore}
   */
  protected readonly store: FacilityStore = inject<FacilityStore>(FacilityStore);

  /**
   * Property overviewStore
   * @readonly
   *
   * @description
   * Component-scoped store that loads the compact inspection and equipment
   * previews powering the overview tab's KPI metrics and summary cards.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {FacilityOverviewStore}
   */
  protected readonly overviewStore: InstanceType<typeof FacilityOverviewStore> =
    inject<FacilityOverviewStore>(FacilityOverviewStore);

  /**
   * Property facility
   * @readonly
   *
   * @description
   * The currently resolved facility proxied from
   * {@link ActiveFacilityStore}.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<FacilityOutput | null>}
   */
  protected readonly facility: Signal<FacilityOutput | null> = computed<FacilityOutput | null>(() =>
    this.activeFacilityStore.selectedFacility(),
  );

  /**
   * Property isLoading
   * @readonly
   *
   * @description
   * Whether the active facility is currently being resolved.
   * Used to show skeleton placeholders in the header.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isLoading: Signal<boolean> = computed<boolean>(() =>
    this.activeFacilityStore.isLoadingFacility(),
  );

  /**
   * Property activeTab
   *
   * @description
   * Index of the currently active tab panel (0=Overview,
   * 1=Equipments, 2=Inspections). Writable so the template can
   * update it via `(valueChange)`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly activeTab: WritableSignal<number> = signal<number>(0);

  /**
   * Property showMoveDialog
   *
   * @description
   * Controls the visibility of the Move Facility dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly showMoveDialog: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property isMoving
   * @readonly
   *
   * @description
   * Whether a move operation is currently in-flight. Used to
   * disable buttons and show a loading indicator in the dialog.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isMoving: Signal<boolean> = computed<boolean>(
    () => this.store.moveCallState().status === 'pending',
  );

  /**
   * Property isDeleting
   * @readonly
   *
   * @description
   * Whether a delete operation is currently in-flight. Drives the header's
   * Delete button loading state.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  protected readonly isDeleting: Signal<boolean> = computed<boolean>(
    () => this.store.deleteCallState().status === 'pending',
  );

  /**
   * Property descendantIds
   * @readonly
   *
   * @description
   * Transitive set of the current facility's descendant ids, derived by
   * walking the loaded `childFacilityIdsByParent` map. Used to exclude
   * descendants from the move-dialog parent options — re-parenting a facility
   * under its own descendant would create a hierarchy cycle (rejected by the
   * backend), so it must not be offered.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Signal<ReadonlySet<string>>}
   */
  private readonly descendantIds: Signal<ReadonlySet<string>> = computed<ReadonlySet<string>>(
    () => {
      const currentId: string | undefined = this.facility()?.id;
      const idsByParent: Readonly<Record<string, ReadonlyArray<string>>> =
        this.store.childFacilityIdsByParent();
      const result: Set<string> = new Set<string>();
      if (undefined === currentId) {
        return result;
      }

      const queue: string[] = [currentId];
      for (let index = 0; index < queue.length; index++) {
        const parentId: string = queue[index];
        for (const childId of idsByParent[parentId] ?? []) {
          if (!result.has(childId)) {
            result.add(childId);
            queue.push(childId);
          }
        }
      }

      return result;
    },
  );

  /**
   * Property parentOptions
   * @readonly
   *
   * @description
   * Computed select options for the move-dialog parent picker. Includes a
   * "None (root level)" sentinel and every facility except invalid targets:
   * the current facility itself, any of its descendants (would create a cycle),
   * and archived facilities (a facility cannot be re-parented under an archived
   * one). All three are rejected by the backend, so offering them would only
   * produce a guaranteed error.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<{ label: string; value: string }[]>}
   */
  protected readonly parentOptions: Signal<{ label: string; value: string }[]> = computed<
    { label: string; value: string }[]
  >(() => {
    const currentId: string | undefined = this.facility()?.id;
    const facilities: readonly FacilityOutput[] = this.store.facilities();
    const descendants: ReadonlySet<string> = this.descendantIds();
    const options: { label: string; value: string }[] = [
      { label: $localize`:@@facility.form.parentNone:None (root level)`, value: '' },
    ];
    for (const f of facilities) {
      if (f.id === currentId || f.status === 'archived' || descendants.has(f.id)) {
        continue;
      }
      options.push({
        label: `${f.name}${f.code ? ' (' + f.code + ')' : ''}`,
        value: f.id,
      });
    }
    return options;
  });

  protected readonly tabsPt: TabsPassThrough = DETAIL_TABS_PT;

  protected readonly tabListPt: TabListPassThrough = DETAIL_TAB_LIST_PT;

  protected readonly tabPanelsPt: TabPanelsPassThrough = DETAIL_TAB_PANELS_PT;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Pre-loads all organization facilities (for the move-dialog parent picker),
   * then sets up an effect to close the dialog on a successful move. The move
   * success and error toasts are produced centrally from the store's feedback
   * events.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    // Close dialog on successful move
    effect(() => {
      const operation = this.store.moveCallState();
      if (operation.status === 'success' && operation.data) {
        this.showMoveDialog.set(false);
      }
    });

    // Navigate back to the facility list once the delete succeeds — the
    // success toast is dispatched centrally by the store's feedback event.
    effect(() => {
      if (this.store.deleteCallState().status === 'success') {
        this.router.navigate(['..', '..'], { relativeTo: this.route });
      }
    });

    // Eagerly load the descendant tree once the facility is resolved
    // (browser-only — the hierarchy chart is secondary UI data).
    effect(() => {
      const organizationId: string = this.organizationId();
      const facility: FacilityOutput | null = this.facility();

      if (!facility || !facility.hasChildren || !isPlatformBrowser(this.platformId)) {
        return;
      }

      this.store.ensureFacilityDescendantsLoaded({
        organizationId,
        facilityId: facility.id,
      });
    });

    // Load compact inspection/equipment previews used by the overview cards
    // (browser-only — secondary, non-critical KPI data).
    effect(() => {
      const organizationId: string = this.organizationId();
      const facilityId: string | undefined = this.facility()?.id;

      if (!facilityId || !isPlatformBrowser(this.platformId)) {
        return;
      }

      this.overviewStore.load({ organizationId, facilityId });
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method onEdit
   * @method onEdit
   *
   * @description
   * Navigates to the facility edit page relative to the current route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onEdit(): void {
    this.router.navigate(['edit'], { relativeTo: this.route });
  }

  /**
   * Method onOpenMoveDialog
   * @method onOpenMoveDialog
   *
   * @description
   * Opens the Move Facility dialog. The picker seeds itself from the
   * facility's current parent through `initialParentId`.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onOpenMoveDialog(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.store.ensureParentOptionsLoaded(this.organizationId());
    }

    this.showMoveDialog.set(true);
  }

  /**
   * Method onMoveConfirmed
   * @method onMoveConfirmed
   *
   * @description
   * Dispatches a move operation to the store for the selected parent
   * facility id, emitted by the move dialog's `confirmed` event. An empty
   * string means the facility is moved to the root level.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {string} parentId - Selected parent facility id, or `''` for the root level.
   *
   * @returns {void}
   */
  protected onMoveConfirmed(parentId: string): void {
    const organizationId: string = this.organizationId();
    const facilityId: string | undefined = this.facility()?.id;

    if (!facilityId) return;

    const payload: MoveFacilityInput = {
      parentFacilityId: parentId || null,
    };

    this.store.move({ organizationId, facilityId, input: payload });
  }

  /**
   * Method onMoveCancel
   * @method onMoveCancel
   *
   * @description
   * Closes the Move Facility dialog without performing an action.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onMoveCancel(): void {
    this.showMoveDialog.set(false);
  }

  /**
   * Method onConfirmDelete
   * @method onConfirmDelete
   *
   * @description
   * Confirms then deletes the active facility. Published facilities are
   * archived server-side (mirrors the row-menu Archive action); the API
   * refuses with a 409 — surfaced as an error toast — when the facility still
   * has child facilities.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected onConfirmDelete(): void {
    const facilityId: string | undefined = this.facility()?.id;
    if (!facilityId) return;

    this.confirmationService.confirm({
      header: $localize`:@@facility.deleteConfirm.header:Delete facility`,
      message: $localize`:@@facility.deleteConfirm.message:This facility will be archived and removed from active lists. It can be restored later from an archived-facility view.`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonProps: { label: $localize`:@@common.delete:Delete`, severity: 'danger' },
      rejectButtonProps: {
        label: $localize`:@@common.cancel:Cancel`,
        severity: 'secondary',
        outlined: true,
      },
      accept: (): void => void this.store.remove({ facilityId }),
    });
  }

  /**
   * Method onNavigateToFacility
   * @method onNavigateToFacility
   *
   * @description
   * Navigates to a descendant facility's detail page from the installations
   * panel.
   *
   * @access protected
   * @since 1.0.0
   *
   * @param {FacilityOutput} facility - Facility to open.
   *
   * @returns {void}
   */
  protected onNavigateToFacility(facility: FacilityOutput): void {
    this.router.navigate(['..', '..', facility.id], { relativeTo: this.route });
  }

  /**
   * Method navigateBack
   * @method navigateBack
   *
   * @description
   * Navigates back to the facility list. Used by the not-found/offline
   * fallback when no facility could be resolved for the current route.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected navigateBack(): void {
    this.router.navigate(['..', '..'], { relativeTo: this.route });
  }
  //#endregion
}
