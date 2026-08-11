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
import { isCallPending, type CallState } from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type {
  EquipmentEditState,
  EquipmentEditTarget,
  EquipmentOutput,
  UpdateEquipmentInput,
} from '@features/organization/features/equipments/models';
import {
  ActiveEquipmentStore,
  EquipmentStore,
  type EquipmentStoreType,
} from '@features/organization/features/equipments/state';
import { buildEquipmentTitle } from '@features/organization/features/equipments/utils';
import { ORGANIZATION_PERMISSION } from '@features/organization/models';
import { HlmButton } from '@shared/ui/button';
import { HlmSkeleton } from '@shared/ui/skeleton';
import { HlmSpinnerImports } from '@shared/ui/spinner';
import { EquipmentInformationPanel } from '../../components/equipment-information-panel';
import { EquipmentStatusTag } from '../../components/equipment-status-tag';

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
 * `equipmentResolver` (route `resolve`) populates {@link ActiveEquipmentStore}
 * before this page renders; a route-scoped {@link EquipmentStore} carries the
 * update and lifecycle writes.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-equipment-detail-page',
  imports: [
    EquipmentInformationPanel,
    EquipmentStatusTag,
    HlmButton,
    HlmSkeleton,
    ...HlmSpinnerImports,
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
  /** The currently active equipment, resolved by `equipmentResolver` before this page renders. */
  protected readonly activeEquipmentStore: ActiveEquipmentStore =
    inject<ActiveEquipmentStore>(ActiveEquipmentStore);

  /** The route-scoped store carrying the update and lifecycle writes. */
  protected readonly store: EquipmentStoreType = inject<EquipmentStoreType>(EquipmentStore);

  /** Organization permission checks gating every write on this page. */
  private readonly permissions: OrganizationPermissionService = inject(
    OrganizationPermissionService,
  );

  /** The application's language, used to phrase the header's metadata line. */
  private readonly locale: string = inject<string>(LOCALE_ID);

  /** Which in-place field is open, writing, or showing a rejection. */
  protected readonly editState: WritableSignal<EquipmentEditState> =
    signal<EquipmentEditState>(IDLE_EDIT_STATE);

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
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   * @description Settles the open in-place field once its own write clears.
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      const callState: CallState<EquipmentOutput | null> = this.store.updateCallState();

      untracked((): void => this.settleUpdateWrite(callState));
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
  //#endregion
}
