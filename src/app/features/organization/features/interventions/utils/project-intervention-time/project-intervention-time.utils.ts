import type {
  InterventionTimeEntry,
  InterventionTimeEntryView,
  InterventionOutboxOperation,
} from '@features/organization/features/interventions/models';

/**
 * Function projectInterventionTime
 * @function projectInterventionTime
 *
 * @description
 * Overlays queued time intentions by stable identifier. Does not mutate server history,
 * remaining effort or operational revisions. Conflicted intentions stay explicitly marked.
 *
 * @access public
 * @since 1.0.0
 *
 * @param {readonly InterventionTimeEntry[]} entries - Last authorized server snapshot.
 * @param {readonly InterventionOutboxOperation[]} operations - Ordered local operations.
 * @param {string} workItemId - Selected journal task.
 * @returns {readonly InterventionTimeEntryView[]} Projected journal rows.
 */
export function projectInterventionTime(
  entries: readonly InterventionTimeEntry[],
  operations: readonly InterventionOutboxOperation[],
  workItemId: string,
): readonly InterventionTimeEntryView[] {
  const result = new Map<string, InterventionTimeEntryView>(
    entries.map((entry) => [entry.id, entry]),
  );
  for (const operation of operations) {
    if (
      operation.type !== 'time-entry.create' &&
      operation.type !== 'time-entry.correct' &&
      operation.type !== 'time-entry.cancel'
    )
      continue;
    if (operation.payload.workItemId !== workItemId) continue;
    const input = operation.payload;
    const existing = result.get(input.id);
    const syncStatus = operation.status ?? 'pending';
    if (operation.type === 'time-entry.cancel') {
      if (existing)
        result.set(input.id, {
          ...existing,
          cancelled: true,
          revision: operation.payload.revision + 1,
          updatedAt: operation.createdAt,
          updatedBy: input.actorId,
          syncStatus,
        });
      continue;
    }
    const payload = operation.payload;
    const revision = operation.type === 'time-entry.create' ? 1 : operation.payload.revision + 1;
    result.set(payload.id, {
      id: payload.id,
      workItemId,
      memberId: payload.memberId,
      workedOn: payload.workedOn,
      minutes: payload.minutes,
      note: payload.note,
      revision,
      cancelled: false,
      createdBy: existing?.createdBy ?? payload.actorId,
      updatedBy: payload.actorId,
      createdAt: existing?.createdAt ?? operation.createdAt,
      updatedAt: operation.createdAt,
      versions: existing?.versions ?? [],
      syncStatus,
    });
  }
  return [...result.values()].toSorted(
    (left, right) => right.workedOn.localeCompare(left.workedOn) || left.id.localeCompare(right.id),
  );
}
