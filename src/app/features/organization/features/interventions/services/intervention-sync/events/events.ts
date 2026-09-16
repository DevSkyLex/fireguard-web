import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { InterventionCollectionsChange } from '@features/organization/features/interventions/models';

/**
 * Constant interventionSyncEvents
 * @description Announces only effective outbox replay; pages coordinate refresh after the replay cycle.
 * @since 6.2.0
 */
export const interventionSyncEvents = eventGroup({
  source: 'Intervention Sync',
  events: { replaySucceeded: type<InterventionCollectionsChange>() },
});
