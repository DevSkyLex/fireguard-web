import type { InterventionStatus } from '@features/organization/features/interventions/models';

/**
 * Constant INTERVENTION_BOARD_COLUMNS
 * @const INTERVENTION_BOARD_COLUMNS
 *
 * @description
 * The Board's columns, one per {@link InterventionStatus}, in workflow order.
 * `published` renders as a column — an intervention does end up there — but
 * never accepts a drop: publication has its own confirm-gated flow on the
 * detail page, and `allowedTransitions` never lists it
 * (`intervention-board-move.utils.ts`).
 *
 * @since 1.0.0
 *
 * @type {readonly InterventionStatus[]}
 */
export const INTERVENTION_BOARD_COLUMNS: readonly InterventionStatus[] = [
  'draft',
  'planned',
  'in_progress',
  'changes_requested',
  'submitted',
  'published',
  'abandoned',
];
