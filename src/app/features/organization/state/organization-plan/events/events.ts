import { type } from '@ngrx/signals';
import { eventGroup } from '@ngrx/signals/events';
import type { OrganizationOutput } from '@features/organization/models';

/**
 * Constant organizationPlanStoreEvents
 * @const organizationPlanStoreEvents
 *
 * @description
 * Events dispatched by the {@link OrganizationPlanStore} when the active
 * organization subscription plan changes. Surfaces such as the plan page listen
 * to surface a confirmation, while sibling stores can refresh cached copies.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const organizationPlanStoreEvents = eventGroup({
  source: 'Organization Plan Store',
  events: {
    planChanged: type<OrganizationOutput>(),
  },
});
