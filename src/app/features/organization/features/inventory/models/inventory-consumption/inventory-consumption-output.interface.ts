import type { HydraItem } from '@core/api/models';
import type {
  InventoryConsumptionStatus,
  InventoryConsumptionReason,
} from './inventory-consumption-status.type';

/**
 * Interface InventoryConsumptionOutput
 * @interface InventoryConsumptionOutput
 *
 * @description
 * A received physical declaration is independent of work completion and dossier publication.
 *
 * @since unreleased
 */
export interface InventoryConsumptionOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable server declaration identity, distinct from the client operation UUID.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly id: string;

  /**
   * Property partId
   * @readonly
   *
   * @description
   * Quantitative reference physically consumed.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly partId: string;

  /**
   * Property warehouseId
   * @readonly
   *
   * @description
   * Declared source warehouse.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly warehouseId: string;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Exact positive consumed quantity with six fractional digits.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Intervention owning this resource declaration.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property workItemId
   * @readonly
   *
   * @description
   * Optional execution work item.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly workItemId?: string | null;

  /**
   * Property equipmentId
   * @readonly
   *
   * @description
   * Optional equipment affected by the work.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly equipmentId?: string | null;

  /**
   * Property actorId
   * @readonly
   *
   * @description
   * Identity of the recording actor.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly actorId: string;

  /**
   * Property occurredAt
   * @readonly
   *
   * @description
   * Recorded ISO timestamp of the physical usage.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly occurredAt: string;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Confirmation or reconciliation state of the full stock debit.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventoryConsumptionStatus}
   */
  readonly status: InventoryConsumptionStatus;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Optional reason preventing atomic confirmation.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventoryConsumptionReason | null | undefined}
   */
  readonly reason?: InventoryConsumptionReason | null;

  /**
   * Property movementId
   * @readonly
   *
   * @description
   * Confirmed stock movement identity when available.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly movementId?: string | null;

  /**
   * Property late
   * @readonly
   *
   * @description
   * Marks a declaration received after dossier publication.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly late: boolean;

  /**
   * Property replayed
   * @readonly
   *
   * @description
   * The command returned its original server receipt; GET exposes current state.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly replayed: boolean;
}
