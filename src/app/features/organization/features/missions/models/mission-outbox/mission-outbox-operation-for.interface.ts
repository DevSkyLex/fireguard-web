import type { MissionOutboxPayloadMap } from './mission-outbox-payload-map.interface';
import type { MissionOutboxType } from './mission-outbox-type.type';

/**
 * Single queued operation with a payload discriminated by its operation type.
 */
export interface MissionOutboxOperationFor<Type extends MissionOutboxType> {
  readonly id: string;
  readonly missionId: string;
  readonly type: Type;
  readonly payload: MissionOutboxPayloadMap[Type];
  readonly createdAt: string;
  readonly status?: 'pending' | 'conflict' | 'failed';
  readonly error?: string | null;
}
