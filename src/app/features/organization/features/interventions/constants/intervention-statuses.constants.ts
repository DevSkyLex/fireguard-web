import type { InterventionStatus } from '@features/organization/features/interventions/models';

/**
 * Every intervention status, in workflow order.
 *
 * Lifted here when the list's status filter became a second consumer: it lived
 * as a private const inside `intervention-calendar`, and reaching into another
 * component's file is what ARCHITECTURE §3.8 forbids. Two copies of a workflow
 * order is how a filter ends up offering a status the board no longer has.
 *
 * The order is the workflow, not the alphabet — it is what a select should
 * offer, and what a legend should list.
 *
 * @since 5.4.0
 */
export const INTERVENTION_STATUSES: readonly InterventionStatus[] = [
  'draft',
  'planned',
  'in_progress',
  'submitted',
  'changes_requested',
  'published',
  'abandoned',
];
