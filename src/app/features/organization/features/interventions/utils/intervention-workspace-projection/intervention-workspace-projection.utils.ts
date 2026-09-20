import {
  resolveInterventionTag,
  type InterventionWorkspaceData,
  type InterventionOutboxOperation,
  type InterventionWorkItemOutput,
  type InterventionChangeOutput,
  type InterventionWorkItemTableQuery,
  type InterventionChangeTableQuery,
} from '@features/organization/features/interventions/models';
import {
  formatInterventionChangePatch,
  interventionChangeResourceKind,
} from '../format-intervention-change-patch/format-intervention-change-patch.utils';

/**
 * Function projectInterventionWorkspace
 *
 * @description
 * Overlays only outstanding local operations, including conflicts, on complete data.
 * Applying the same outbox twice is idempotent. Unrelated fresh server fields remain authoritative.
 *
 * @param {InterventionWorkspaceData} base - Complete saved or freshly fetched workspace.
 * @param {readonly InterventionOutboxOperation[]} operations - Remaining local intent in queue order.
 * @param {InterventionWorkspaceData} saved - Saved labels for pending local associations.
 * @returns {InterventionWorkspaceData} Projected workspace without mutating inputs.
 *
 * @since 6.2.0
 */
export function projectInterventionWorkspace(
  base: InterventionWorkspaceData,
  operations: readonly InterventionOutboxOperation[],
  saved: InterventionWorkspaceData = base,
): InterventionWorkspaceData {
  const intervention = { ...base.intervention };
  const workItems = new Map(base.workItems.map((item) => [item.id, item]));
  const changes = new Map(base.changes.map((change) => [change.id, change]));
  let workChanged = false;
  for (const operation of operations) {
    if (operation.interventionId !== intervention.id) continue;
    switch (operation.type) {
      case 'work-item.create': {
        const input = operation.payload;
        const id = input.clientId;
        if (!id || workItems.has(id)) break;
        workItems.set(id, {
          '@id': '/api/intervention-work-items/' + id,
          '@type': 'InterventionWorkItem',
          id,
          intervention: input.intervention,
          action: input.action,
          target: input.target ?? null,
          resultResource: input.resultResource ?? null,
          assignee: input.assignee ?? null,
          source: input.source,
          status: 'planned',
          estimatedMinutes: input.estimatedMinutes ?? null,
          remainingMinutes: input.estimatedMinutes ?? null,
          spentMinutes: 0,
          workStartsOn: input.workStartsOn ?? null,
          workEndsOn: input.workEndsOn ?? null,
          required: input.required,
          skipReason: null,
          evidenceCount: 0,
          revision: 1,
          createdAt: operation.createdAt,
          updatedAt: operation.createdAt,
        });
        workChanged = true;
        break;
      }
      case 'work-item.update': {
        const {
          workItemId,
          clientId: _clientId,
          revision: _revision,
          ...fields
        } = operation.payload;
        const item =
          workItems.get(workItemId) ?? saved.workItems.find((row) => row.id === workItemId);
        if (item) {
          workItems.set(workItemId, {
            ...item,
            ...fields,
            ...((item.status === 'completed' || item.status === 'skipped') &&
            fields.status &&
            fields.status !== 'completed' &&
            fields.status !== 'skipped' &&
            fields.remainingMinutes === undefined
              ? { remainingMinutes: null }
              : {}),
            ...(fields.assignee !== undefined && fields.assignee !== item.assignee
              ? {
                  assigneeProfile:
                    saved.workItems.find(
                      (row) => row.id === workItemId && row.assignee === fields.assignee,
                    )?.assigneeProfile ?? null,
                }
              : {}),
          });
          workChanged = true;
        }
        break;
      }
      case 'change.create': {
        const input = operation.payload;
        const id = input.clientId;
        if (!id || changes.has(id)) break;
        changes.set(id, {
          '@id': '/api/intervention-changes/' + id,
          '@type': 'InterventionChange',
          id,
          intervention: input.intervention,
          workItem: input.workItem ?? null,
          resource: input.resource,
          patch: input.patch,
          status: 'proposed',
          revision: 1,
          createdAt: operation.createdAt,
          updatedAt: operation.createdAt,
        });
        break;
      }
      case 'change.update': {
        const { changeId, clientId: _clientId, revision: _revision, ...fields } = operation.payload;
        const change = changes.get(changeId) ?? saved.changes.find((row) => row.id === changeId);
        if (change) changes.set(changeId, { ...change, ...fields });
        break;
      }
      case 'intervention.update': {
        const { clientId: _clientId, revision: _revision, labelIds, ...fields } = operation.payload;
        Object.assign(intervention, fields, labelIds ? { labels: saved.intervention.labels } : {});
        break;
      }
    }
  }
  const items = [...workItems.values()];
  if (workChanged)
    Object.assign(intervention, {
      workItemsCount: items.length,
      completedWorkItemsCount: items.filter(
        (item) => item.status === 'completed' || item.status === 'skipped',
      ).length,
    });
  return { ...base, intervention, workItems: items, changes: [...changes.values()] };
}

/**
 * Function searchSavedWorkItems
 * @description Evaluates offline criteria over all saved rows and available display labels.
 * @param {readonly InterventionWorkItemOutput[]} items - Complete local projection.
 * @param {InterventionWorkItemTableQuery} query - Controlled table criteria, including Remaining's scalar statuses.
 * @returns {readonly InterventionWorkItemOutput[]} Matching saved rows.
 * @since 6.2.0
 */
export function searchSavedWorkItems(
  items: readonly InterventionWorkItemOutput[],
  query: InterventionWorkItemTableQuery,
): readonly InterventionWorkItemOutput[] {
  const search = query.search.trim().toLocaleLowerCase();
  return items.filter(
    (item) =>
      (!query.statuses?.length || query.statuses.includes(item.status)) &&
      (!search ||
        [
          item.targetSummary?.label,
          item.target,
          item.assigneeProfile?.displayName,
          item.action,
          resolveInterventionTag('workItemAction', item.action).label,
          item.status,
          resolveInterventionTag('workItemStatus', item.status).label,
          item.skipReason,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search)),
  );
}

/**
 * Function searchSavedChanges
 * @description Evaluates offline history criteria over the complete local projection and patch values.
 * @param {readonly InterventionChangeOutput[]} changes - All projected changes.
 * @param {InterventionChangeTableQuery} query - Controlled history criteria.
 * @param {readonly InterventionWorkItemOutput[]} items - Available target labels.
 * @returns {readonly InterventionChangeOutput[]} Matching saved changes.
 * @since 6.2.0
 */
export function searchSavedChanges(
  changes: readonly InterventionChangeOutput[],
  query: InterventionChangeTableQuery,
  items: readonly InterventionWorkItemOutput[] = [],
): readonly InterventionChangeOutput[] {
  const search = query.search.trim().toLocaleLowerCase();
  return changes.filter(
    (change) =>
      (!query.status || query.status === change.status) &&
      (!search ||
        [
          change.resource,
          interventionChangeResourceKind(change.resource),
          change.status,
          resolveInterventionTag('changeStatus', change.status).label,
          JSON.stringify(change.patch),
          ...formatInterventionChangePatch(change.patch).flatMap((line) => [
            line.field,
            line.value,
          ]),
          items.find(
            (item) =>
              item.target === change.resource ||
              item.resultResource === change.resource ||
              (!!change.workItem && item['@id'] === change.workItem),
          )?.targetSummary?.label,
        ]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search)),
  );
}
