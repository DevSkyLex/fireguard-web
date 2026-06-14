import type { InterventionOutboxPayloadMap } from './intervention-outbox-payload-map.interface';
import type { InterventionOutboxType } from './intervention-outbox-type.type';

/**
 * Single queued operation with a payload discriminated by its operation type.
 */
export interface InterventionOutboxOperationFor<Type extends InterventionOutboxType> {
  readonly id: string;
  readonly interventionId: string;
  readonly type: Type;
  readonly payload: InterventionOutboxPayloadMap[Type];
  readonly createdAt: string;
  readonly status?: 'pending' | 'conflict' | 'failed';
  readonly error?: string | null;
}
