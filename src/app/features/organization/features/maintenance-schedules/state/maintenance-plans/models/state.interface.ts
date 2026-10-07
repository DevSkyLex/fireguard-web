import type { CallState } from '@core/request-state';
import type { EquipmentOutput } from '@features/organization/features/equipments/models';
import type {
  MaintenanceEngineOutput,
  MaintenancePlanOutput,
  MaintenancePlanPreviewOutput,
  MaintenancePlanGenerationOutput,
} from '@features/organization/features/maintenance-schedules/models';

/**
 * Interface MaintenancePlansState
 * @interface MaintenancePlansState
 *
 * @description
 * Independent reads and commands scoped to the currently displayed organization.
 */
export interface MaintenancePlansState {
  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Displayed organization.
   *
   * @since unreleased
   *
   * @type {string}
   */
  readonly organizationId: string;
  /**
   * Property totalPlans
   * @readonly
   *
   * @description
   * Exact server total for the active query.
   *
   * @since unreleased
   *
   * @type {number}
   */
  readonly totalPlans: number;
  /**
   * Property listCallState
   * @readonly
   *
   * @description
   * Plan list request.
   *
   * @since unreleased
   *
   * @type {CallState}
   */
  readonly listCallState: CallState;
  /**
   * Property engineCallState
   * @readonly
   *
   * @description
   * Scheduling authority request.
   *
   * @since unreleased
   *
   * @type {CallState<MaintenanceEngineOutput>}
   */
  readonly engineCallState: CallState<MaintenanceEngineOutput>;
  /**
   * Property migrationCallState
   * @readonly
   *
   * @description
   * Preparation or authority-switch command.
   *
   * @since unreleased
   *
   * @type {CallState<MaintenanceEngineOutput>}
   */
  readonly migrationCallState: CallState<MaintenanceEngineOutput>;
  /**
   * Property createCallState
   * @readonly
   *
   * @description
   * Prepared plan command.
   *
   * @since unreleased
   *
   * @type {CallState<MaintenancePlanOutput>}
   */
  readonly createCallState: CallState<MaintenancePlanOutput>;
  /**
   * Property updateCallState
   * @readonly
   *
   * @description
   * Plan configuration command.
   *
   * @since unreleased
   *
   * @type {CallState<MaintenancePlanOutput>}
   */
  readonly updateCallState: CallState<MaintenancePlanOutput>;
  /**
   * Property previewCallState
   * @readonly
   *
   * @description
   * Server date preview.
   *
   * @since unreleased
   *
   * @type {CallState<MaintenancePlanPreviewOutput>}
   */
  readonly previewCallState: CallState<MaintenancePlanPreviewOutput>;
  /**
   * Property generationCallState
   * @readonly
   *
   * @description
   * Bounded generation or new-attempt command.
   *
   * @since unreleased
   *
   * @type {CallState<MaintenancePlanGenerationOutput>}
   */
  readonly generationCallState: CallState<MaintenancePlanGenerationOutput>;
  /**
   * Property selectedPlan
   * @readonly
   *
   * @description
   * Plan whose calendar is under review.
   *
   * @since unreleased
   *
   * @type {MaintenancePlanOutput | null}
   */
  readonly selectedPlan: MaintenancePlanOutput | null;
  /**
   * Property equipmentCallState
   * @readonly
   *
   * @description
   * Server page of authorized equipment choices.
   *
   * @since unreleased
   *
   * @type {CallState<readonly EquipmentOutput[]>}
   */
  readonly equipmentCallState: CallState<readonly EquipmentOutput[]>;
  /**
   * Property totalEquipment
   * @readonly
   *
   * @description
   * Exact equipment search total.
   *
   * @since unreleased
   *
   * @type {number}
   */
  readonly totalEquipment: number;
}
