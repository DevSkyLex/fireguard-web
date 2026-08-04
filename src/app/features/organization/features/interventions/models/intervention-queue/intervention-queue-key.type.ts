/**
 * Type InterventionQueueKey
 *
 * @description
 * The named questions an operator asks of the intervention collection. Each key
 * resolves to one or more collection queries; the catalogue that maps them lives
 * in `utils/intervention-queue-requests`, because the bounds depend on the
 * current instant and a model may not hold runtime code (ARCHITECTURE.md §10.10).
 *
 * - `overdue` — planned or in progress, past the due date,
 * - `awaitingReview` — submitted, waiting for a reviewer,
 * - `changesRequested` — sent back by a reviewer,
 * - `mine` — the current member is the responsible agent.
 *
 * Unsynced work is deliberately absent: it is answered from the local outbox,
 * not from the collection.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export type InterventionQueueKey = 'overdue' | 'awaitingReview' | 'changesRequested' | 'mine';
