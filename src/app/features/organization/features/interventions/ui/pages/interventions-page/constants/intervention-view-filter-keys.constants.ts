import type { InterventionFilterFieldKey } from '@features/organization/features/interventions/models';
import type { InterventionView } from '../models/intervention-view.type';

/**
 * Constant INTERVENTION_VIEW_FILTER_KEYS
 *
 * @description
 * Limits visible chips to fields the active collection honours; other criteria remain in the URL.
 * Board columns own status, and Calendar accepts only its published four-field subset.
 *
 * @access public
 *
 * @type {Readonly<Record<InterventionView, readonly InterventionFilterFieldKey[]>>}
 *
 * @constant INTERVENTION_VIEW_FILTER_KEYS
 */
export const INTERVENTION_VIEW_FILTER_KEYS: Readonly<
  Record<InterventionView, readonly InterventionFilterFieldKey[]>
> = {
  list: [
    'status',
    'type',
    'priority',
    'site',
    'responsible',
    'label',
    'dueRange',
    'plannedStartRange',
    'dueWindow',
  ],
  board: [
    'type',
    'priority',
    'site',
    'responsible',
    'label',
    'dueRange',
    'plannedStartRange',
    'dueWindow',
  ],
  calendar: ['status', 'type', 'site', 'responsible'],
  recurrences: [],
};
