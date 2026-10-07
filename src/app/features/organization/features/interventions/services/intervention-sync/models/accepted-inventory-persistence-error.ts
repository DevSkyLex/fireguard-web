/**
 * Class AcceptedInventoryPersistenceError
 * @class AcceptedInventoryPersistenceError
 *
 * @description
 * An accepted physical fact must keep its stable operation until device persistence succeeds.
 */
export class AcceptedInventoryPersistenceError extends Error {
  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Preserves the device failure that prevented retaining an already accepted server receipt.
   *
   * @access public
   * @since unreleased
   *
   * @param {unknown} cause - Underlying durable storage error; replay must keep the original
   *   operation.
   */
  public constructor(cause: unknown) {
    super(
      $localize`:@@intervention.inventory.receiptPersistenceFailed:The server received this declaration, but its receipt could not be saved on this device. Keep the queued declaration and synchronize again.`,
      { cause },
    );
    this.name = 'AcceptedInventoryPersistenceError';
  }
  //#endregion
}
