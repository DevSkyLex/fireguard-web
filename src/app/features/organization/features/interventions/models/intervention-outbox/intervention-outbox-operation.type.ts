import type { MissionOutboxOperationFor } from './mission-outbox-operation-for.interface';
import type { MissionOutboxType } from './mission-outbox-type.type';

/**
 * Discriminated union of every queued mission operation.
 */
export type MissionOutboxOperation = {
  [Type in MissionOutboxType]: MissionOutboxOperationFor<Type>;
}[MissionOutboxType];
