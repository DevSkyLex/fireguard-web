import type { InterventionBoardColumnDefinition } from '@features/organization/features/interventions/models';

/**
 * Constant INTERVENTION_BOARD_COLUMNS
 * @const INTERVENTION_BOARD_COLUMNS
 *
 * @description
 * Ordered structural definition of the pipeline-board lanes, left to right.
 * Drives both the board store (which statuses to query and how to group the
 * results) and the dataview (lane order). The `review` lane fuses `submitted`
 * and `changes_requested`; its drop target is `submitted` so dragging a card
 * into review submits it for review. The `published` lane has a `null` drop
 * target because publication is a deliberate flow, not a drag.
 *
 * @since 1.0.0
 *
 * @type {readonly InterventionBoardColumnDefinition[]}
 */
export const INTERVENTION_BOARD_COLUMNS: readonly InterventionBoardColumnDefinition[] = [
  { id: 'draft', statuses: ['draft'], dropTarget: 'draft' },
  { id: 'planned', statuses: ['planned'], dropTarget: 'planned' },
  { id: 'in_progress', statuses: ['in_progress'], dropTarget: 'in_progress' },
  { id: 'review', statuses: ['submitted', 'changes_requested'], dropTarget: 'submitted' },
  { id: 'published', statuses: ['published'], dropTarget: null },
];
