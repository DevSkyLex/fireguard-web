import type {
  InterventionListOptions,
  InterventionQueueKey,
} from '@features/organization/features/interventions/models';

/**
 * Function buildInterventionQueueRequests
 *
 * @description
 * Turns a named question into the collection queries that answer it.
 *
 * Most keys are one query. `overdue` is two, because the API filters a single
 * `status` at a time and "workable and past due" spans `planned` and
 * `in_progress`; asking for both and summing keeps terminal statuses out
 * without scanning the collection client-side. The caller sums the totals and
 * concatenates the items.
 *
 * The instant is a parameter rather than read here so the function stays pure
 * and its spec stays deterministic.
 *
 * @param {InterventionQueueKey} key - The question to answer.
 * @param {string} now - Current instant, ISO 8601.
 * @param {string} [memberIri] - Responsible-agent IRI, required by `mine`.
 *
 * @returns {readonly InterventionListOptions[]} Queries to run in parallel. Empty
 * when the key cannot be answered — `mine` without a member, notably.
 *
 * @since 1.0.0
 */
export function buildInterventionQueueRequests(
  key: InterventionQueueKey,
  now: string,
  memberIri?: string,
): readonly InterventionListOptions[] {
  switch (key) {
    case 'overdue':
      return [
        { status: 'planned', dueAtBefore: now, order: { dueAt: 'asc' } },
        { status: 'in_progress', dueAtBefore: now, order: { dueAt: 'asc' } },
      ];

    case 'awaitingReview':
      return [{ status: 'submitted', order: { updatedAt: 'desc' } }];

    case 'changesRequested':
      return [{ status: 'changes_requested', order: { updatedAt: 'desc' } }];

    case 'mine':
      // Without a member there is no "mine": answering with the whole
      // collection would be worse than answering with nothing.
      return memberIri ? [{ responsible: memberIri, order: { dueAt: 'asc' } }] : [];

    case 'upcoming':
      // The mirror of `overdue`: still planned, not yet due. It answers "what
      // comes next" when nothing is waiting, so the nearest deadline is first.
      return [{ status: 'planned', dueAtAfter: now, order: { dueAt: 'asc' } }];
  }
}
