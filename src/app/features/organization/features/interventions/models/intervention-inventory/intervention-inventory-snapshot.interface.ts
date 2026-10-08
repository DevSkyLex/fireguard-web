import type {
  InventoryPartOutput,
  InventoryWarehouseOutput,
  InventoryConsumptionOutput,
} from '@features/organization/features/inventory/models';

/**
 * Interface InterventionInventorySnapshot
 * @interface InterventionInventorySnapshot
 *
 * @description
 * Authorized quantitative references and declarations stored with one account-owned workspace.
 * Completion flags distinguish full server pages from a retained single declaration receipt.
 */
export interface InterventionInventorySnapshot {
  /**
   * Property version
   * @readonly
   *
   * @description
   * Compatible metadata schema without replacing the existing IndexedDB database.
   *
   * @type {1}
   */
  readonly version: 1;

  /**
   * Property accountId
   * @readonly
   *
   * @description
   * Authenticated owner of this private device snapshot.
   *
   * @type {string}
   */
  readonly accountId: string;

  /**
   * Property organizationId
   * @readonly
   *
   * @description
   * Organization whose authorized references were completely read.
   *
   * @type {string}
   */
  readonly organizationId: string;

  /**
   * Property interventionId
   * @readonly
   *
   * @description
   * Workspace owning the declarations and their catalog.
   *
   * @type {string}
   */
  readonly interventionId: string;

  /**
   * Property capturedAt
   * @readonly
   *
   * @description
   * Latest snapshot capture timestamp; restoring never changes its age.
   *
   * @type {string}
   */
  readonly capturedAt: string;

  /**
   * Property catalogComplete
   * @readonly
   *
   * @description
   * True only after both authorized catalogs have been drained successfully.
   *
   * @type {boolean}
   */
  readonly catalogComplete: boolean;

  /**
   * Property declarationsComplete
   * @readonly
   *
   * @description
   * True only after the complete scoped declaration history was read.
   *
   * @type {boolean}
   */
  readonly declarationsComplete: boolean;

  /**
   * Property parts
   * @readonly
   *
   * @description
   * All authorized quantitative references captured at preparation.
   *
   * @type {readonly InventoryPartOutput[]}
   */
  readonly parts: readonly InventoryPartOutput[];

  /**
   * Property warehouses
   * @readonly
   *
   * @description
   * All authorized warehouses captured at preparation.
   *
   * @type {readonly InventoryWarehouseOutput[]}
   */
  readonly warehouses: readonly InventoryWarehouseOutput[];

  /**
   * Property declarations
   * @readonly
   *
   * @description
   * Confirmed and received-pending facts remain separate from the local outbox.
   *
   * @type {readonly InventoryConsumptionOutput[]}
   */
  readonly declarations: readonly InventoryConsumptionOutput[];
}
