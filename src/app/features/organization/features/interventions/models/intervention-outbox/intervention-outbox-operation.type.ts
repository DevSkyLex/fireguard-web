import type { InterventionOutboxOperationFor } from './intervention-outbox-operation-for.interface';
import type { InterventionOutboxType } from './intervention-outbox-type.type';

/**
 * Discriminated union of every queued intervention operation.
 */
export type InterventionOutboxOperation = {
  [Type in InterventionOutboxType]: InterventionOutboxOperationFor<Type>;
}[InterventionOutboxType];
