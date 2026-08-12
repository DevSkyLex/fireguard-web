import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { PublicationOutput } from '@features/organization/features/interventions/models';

/**
 * Constant interventionPublicationStoreEvents
 * @const interventionPublicationStoreEvents
 *
 * @description
 * Event group for the {@link InterventionPublicationStore}. Dispatched once a
 * publication reaches the terminal `completed` status, so the detail page can
 * reload the workspace, close the confirmation and toast without the store
 * reaching into page-owned concerns.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const interventionPublicationStoreEvents = eventGroup({
  source: 'Intervention Publication Store',
  events: {
    /**
     * Event publishSucceeded
     *
     * @description
     * Dispatched when a publication completes successfully.
     */
    publishSucceeded: type<PublicationOutput>(),
  },
});
