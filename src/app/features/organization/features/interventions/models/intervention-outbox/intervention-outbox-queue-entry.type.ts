import type { InterventionOutboxPayloadMap } from './intervention-outbox-payload-map.interface';
import type { InterventionOutboxType } from './intervention-outbox-type.type';

/**
 * Entry queued as part of one durable intervention field intention.
 */
export type InterventionOutboxQueueEntry = {
  [Type in InterventionOutboxType]: {
    readonly type: Type;
    readonly payload: InterventionOutboxPayloadMap[Type];
  };
}[InterventionOutboxType];
