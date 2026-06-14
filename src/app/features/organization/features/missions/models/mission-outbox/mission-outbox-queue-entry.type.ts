import type { MissionOutboxPayloadMap } from './mission-outbox-payload-map.interface';
import type { MissionOutboxType } from './mission-outbox-type.type';

/**
 * Entry queued as part of one durable mission field intention.
 */
export type MissionOutboxQueueEntry = {
  [Type in MissionOutboxType]: {
    readonly type: Type;
    readonly payload: MissionOutboxPayloadMap[Type];
  };
}[MissionOutboxType];
