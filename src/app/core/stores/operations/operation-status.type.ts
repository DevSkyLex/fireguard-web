/**
 * Type OperationStatus
 * @type OperationStatus
 *
 * @description
 * Lifecycle status for async operations.
 *
 * @version 1.0.0
 */
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Constant OPERATION_STATUSES
 *
 * @description
 * Available operation statuses as array.
 *
 * @version 1.0.0
 */
export const OPERATION_STATUSES: readonly OperationStatus[] = [
  'idle',
  'loading',
  'success',
  'error',
] as const;
