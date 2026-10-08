import type { ChangeSupplierInput } from './change-supplier-input.interface';

/**
 * Interface CreateSupplierInput
 * @interface CreateSupplierInput
 *
 * @description
 * Internal supplier creation with an optional operation UUID for safe transport replay.
 */
export interface CreateSupplierInput extends ChangeSupplierInput {
  /**
   * Property clientOperationId
   * @readonly
   *
   * @description
   * Stable command UUID retained when retrying the same supplier creation.
   *
   * @access public
   *
   * @type {string}
   */
  readonly clientOperationId?: string;
}
