import type { DeclareInventoryConsumptionInput } from './declare-inventory-consumption-input.interface';

/**
 * Interface InventoryConsumptionIntent
 * @interface InventoryConsumptionIntent
 *
 * @description
 * A parent-owned durable outbox projection distinguishes local queue state from server stock
 * confirmation.
 *
 * @since unreleased
 */
export interface InventoryConsumptionIntent {
  /**
   * Property input
   * @readonly
   *
   * @description
   * Immutable consumption payload whose UUID stays stable.
   *
   * @access public
   * @since unreleased
   *
   * @type {DeclareInventoryConsumptionInput}
   */
  readonly input: DeclareInventoryConsumptionInput;

  /**
   * Property status
   * @readonly
   *
   * @description
   * Local persistence and transmission state; never implies stock confirmation.
   *
   * @access public
   * @since unreleased
   *
   * @type {'queued' | 'sending' | 'failed'}
   */
  readonly status: 'queued' | 'sending' | 'failed';

  /**
   * Property error
   * @readonly
   *
   * @description
   * Recoverable persistence or transmission feedback.
   *
   * @access public
   * @since unreleased
   *
   * @type {string | null | undefined}
   */
  readonly error?: string | null;
}
