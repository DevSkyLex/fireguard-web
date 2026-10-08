import type { HydraItem } from '@core/api/models';
import type { InventoryMovementKind } from './inventory-movement-kind.type';

/**
 * Interface InventoryMovementOutput
 * @interface InventoryMovementOutput
 *
 * @description
 * Immutable ordinary movement projection tracks exact physical deltas without internal prices.
 *
 * @since unreleased
 */
export interface InventoryMovementOutput extends HydraItem {
  /**
   * Property id
   * @readonly
   *
   * @description
   * Stable movement identity.
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
   * Reference affected by this movement.
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
   * Warehouse affected by this movement.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly warehouseId: string;

  /**
   * Property kind
   * @readonly
   *
   * @description
   * Canonical movement category.
   *
   * @access public
   * @since unreleased
   *
   * @type {InventoryMovementKind}
   */
  readonly kind: InventoryMovementKind;

  /**
   * Property quantity
   * @readonly
   *
   * @description
   * Signed exact stock delta, serialized with six fractional digits.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly quantity: string;

  /**
   * Property reason
   * @readonly
   *
   * @description
   * Recorded factual reason for the movement.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly reason: string;

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
   * Recorded ISO timestamp of the physical operation.
   *
   * @access public
   * @since unreleased
   *
   * @type {string}
   */
  readonly occurredAt: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Optional intervention owning the resource usage.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly interventionId?: string | null;

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
   * Property correctionOf
   * @readonly
   *
   * @description
   * Original movement identity corrected or returned.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly correctionOf?: string | null;

  /**
   * Property sourceReceiptId
   * @readonly
   *
   * @description
   * Optional procurement receipt identity.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly sourceReceiptId?: string | null;

  /**
   * Property late
   * @readonly
   *
   * @description
   * Marks a factual declaration recorded after dossier publication.
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
   * The command returned its existing server receipt.
   *
   * @access public
   * @since unreleased
   *
   * @type {boolean}
   */
  readonly replayed: boolean;
}
