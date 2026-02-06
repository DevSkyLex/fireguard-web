/**
 * Operation Types
 *
 * @description
 * Generic operation state helpers for SignalStore and services.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */

export { OPERATION_STATUSES } from './operation-status.type';
export type { OperationStatus } from './operation-status.type';
export type { OperationError } from './operation-error.type';
export type { OperationMeta } from './operation-meta.type';
export type {
  Operation,
  OperationIdle,
  OperationLoading,
  OperationSuccess,
  OperationFailed,
} from './operation.type';
export type { CollectionOperation } from './collection-operation.type';
export {
  createIdleOperation,
  createLoadingOperation,
  createSuccessOperation,
  createErrorOperation,
  isOperationSuccess,
  isOperationError,
  createOperationErrorFromUnknown,
} from './operation.helpers';
