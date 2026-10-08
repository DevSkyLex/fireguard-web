import {
  resolveInterventionTag,
  type InterventionWorkspaceData,
  type InterventionOutboxOperation,
  type InterventionOutboxOperationFor,
  type InterventionWorkItemOutput,
  type InterventionChangeOutput,
  type InterventionWorkItemTableQuery,
  type InterventionChangeTableQuery,
  type InterventionWorkItemExecutionResultInput,
  type InterventionWorkItemExecutionResultOutput,
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
 * @since 6.2.0
 *
 * @param {InterventionWorkspaceData} base - Complete saved or freshly fetched workspace.
 * @param {readonly InterventionOutboxOperation[]} operations - Remaining local intent in queue
 *   order.
 * @param {InterventionWorkspaceData} saved - Saved labels for pending local associations.
 *
 * @returns {InterventionWorkspaceData} Projected workspace without mutating inputs.
 */
export function projectInterventionWorkspace(
  base: InterventionWorkspaceData,
  operations: readonly InterventionOutboxOperation[],
  saved: InterventionWorkspaceData = base,
): InterventionWorkspaceData {
  const intervention = { ...base.intervention };
  const workItems = new Map(base.workItems.map((item) => [item.id, item]));
  const changes = new Map(base.changes.map((change) => [change.id, change]));
  const latestResults = new Map<string, InterventionWorkItemExecutionResultInput | null>();
  for (const operation of operations) {
    if (
      operation.interventionId === intervention.id &&
      operation.type === 'work-item.update' &&
      operation.payload.executionResult !== undefined
    )
      latestResults.set(operation.payload.workItemId, operation.payload.executionResult);
  }
  const projectedResultIds = new Set(
    [...latestResults].flatMap(([id, result]) => {
      const current = workItems.get(id)?.executionResult;
      return current && !current.authorId && equalExecutionFacts(current, result) ? [id] : [];
    }),
  );
  let workChanged = false;
  for (const operation of operations) {
    if (operation.interventionId !== intervention.id) continue;
    switch (operation.type) {
      case 'work-item.create': {
        workChanged = applyWorkItemCreation(workItems, operation) || workChanged;
        break;
      }
      case 'work-item.update': {
        workChanged =
          applyWorkItemUpdate(
            workItems,
            operation,
            saved,
            projectedResultIds.has(operation.payload.workItemId),
          ) || workChanged;
        break;
      }
      case 'change.create': {
        applyChangeCreation(changes, operation);
        break;
      }
      case 'change.update': {
        applyChangeUpdate(changes, operation, saved);
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
 * Function applyWorkItemCreation
 *
 * @description
 * Adds a new queued work item once and reports whether the item count changed.
 *
 * @access private
 * @since 6.2.0
 *
 * @param {Map<string, InterventionWorkItemOutput>} workItems - Projected work items.
 * @param {InterventionOutboxOperationFor<'work-item.create'>} operation - Queued creation.
 *
 * @returns {boolean} Whether a new row was added.
 */
function applyWorkItemCreation(
  workItems: Map<string, InterventionWorkItemOutput>,
  operation: InterventionOutboxOperationFor<'work-item.create'>,
): boolean {
  const id = operation.payload.clientId;
  if (!id || workItems.has(id)) return false;
  workItems.set(id, projectedCreatedWorkItem(operation, id));
  return true;
}

/**
 * Function applyWorkItemUpdate
 *
 * @description
 * Replays a queued edit against a fresh row or its saved predecessor.
 *
 * @access private
 * @since 6.2.0
 *
 * @param {Map<string, InterventionWorkItemOutput>} workItems - Projected work items.
 * @param {InterventionOutboxOperationFor<'work-item.update'>} operation - Queued update.
 * @param {InterventionWorkspaceData} saved - Saved rows and association labels.
 * @param {boolean} isResultProjected - Whether the snapshot already contains the final local
 *   result.
 *
 * @returns {boolean} Whether a row was updated or restored.
 */
function applyWorkItemUpdate(
  workItems: Map<string, InterventionWorkItemOutput>,
  operation: InterventionOutboxOperationFor<'work-item.update'>,
  saved: InterventionWorkspaceData,
  isResultProjected: boolean,
): boolean {
  const { workItemId } = operation.payload;
  const item = workItems.get(workItemId) ?? saved.workItems.find((row) => row.id === workItemId);
  if (!item) return false;
  workItems.set(workItemId, projectedUpdatedWorkItem(operation, item, saved, isResultProjected));
  return true;
}

/**
 * Function applyChangeCreation
 *
 * @description
 * Adds a queued change once, preserving an existing fresh or projected row.
 *
 * @access private
 * @since 6.2.0
 *
 * @param {Map<string, InterventionChangeOutput>} changes - Projected changes.
 * @param {InterventionOutboxOperationFor<'change.create'>} operation - Queued creation.
 *
 * @returns {void}
 */
function applyChangeCreation(
  changes: Map<string, InterventionChangeOutput>,
  operation: InterventionOutboxOperationFor<'change.create'>,
): void {
  const input = operation.payload;
  const id = input.clientId;
  if (!id || changes.has(id)) return;
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
}

/**
 * Function applyChangeUpdate
 *
 * @description
 * Replays a queued change edit against a fresh or saved row.
 *
 * @access private
 * @since 6.2.0
 *
 * @param {Map<string, InterventionChangeOutput>} changes - Projected changes.
 * @param {InterventionOutboxOperationFor<'change.update'>} operation - Queued update.
 * @param {InterventionWorkspaceData} saved - Saved rows available for restoration.
 *
 * @returns {void}
 */
function applyChangeUpdate(
  changes: Map<string, InterventionChangeOutput>,
  operation: InterventionOutboxOperationFor<'change.update'>,
  saved: InterventionWorkspaceData,
): void {
  const { changeId, clientId: _clientId, revision: _revision, ...fields } = operation.payload;
  const change = changes.get(changeId) ?? saved.changes.find((row) => row.id === changeId);
  if (change) changes.set(changeId, { ...change, ...fields });
}

/**
 * Function projectedCreatedWorkItem
 *
 * @description
 * Builds the optimistic row for an outstanding work-item creation.
 *
 * @since 6.2.0
 *
 * @param {InterventionOutboxOperationFor<'work-item.create'>} operation - Queued creation.
 * @param {string} id - Stable client-generated identifier.
 *
 * @returns {InterventionWorkItemOutput} Local projection.
 */
function projectedCreatedWorkItem(
  operation: InterventionOutboxOperationFor<'work-item.create'>,
  id: string,
): InterventionWorkItemOutput {
  const input = operation.payload;
  return {
    '@id': '/api/intervention-work-items/' + id,
    '@type': 'InterventionWorkItem',
    id,
    intervention: input.intervention,
    action: input.action,
    operationId: input.operationId ?? null,
    occurrenceId: input.occurrenceId ?? null,
    operationKind: input.operationKind ?? null,
    executionResult: null,
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
  };
}

/**
 * Function projectedUpdatedWorkItem
 *
 * @description
 * Applies a queued edit while retaining saved profile labels and clearing stale remaining effort.
 *
 * @since 6.2.0
 *
 * @param {InterventionOutboxOperationFor<'work-item.update'>} operation - Queued edit.
 * @param {InterventionWorkItemOutput} item - Current projected row.
 * @param {InterventionWorkspaceData} saved - Saved labels for existing associations.
 * @param {boolean} isResultProjected - Whether the snapshot already contains the final local
 *   result.
 *
 * @returns {InterventionWorkItemOutput} Updated local row.
 */
function projectedUpdatedWorkItem(
  operation: InterventionOutboxOperationFor<'work-item.update'>,
  item: InterventionWorkItemOutput,
  saved: InterventionWorkspaceData,
  isResultProjected: boolean,
): InterventionWorkItemOutput {
  const {
    workItemId,
    clientId: _clientId,
    revision: _revision,
    executionResult,
    ...fields
  } = operation.payload;
  const status = isResultProjected && executionResult !== undefined ? item.status : fields.status;
  return {
    ...item,
    ...fields,
    ...(status !== undefined ? { status } : {}),
    ...(executionResult !== undefined && !isResultProjected
      ? { executionResult: projectInterventionWorkItemExecutionResult(item, executionResult) }
      : {}),
    ...((item.status === 'completed' || item.status === 'skipped') &&
    status &&
    status !== 'completed' &&
    status !== 'skipped' &&
    fields.remainingMinutes === undefined
      ? { remainingMinutes: null }
      : {}),
    ...(fields.assignee !== undefined && fields.assignee !== item.assignee
      ? {
          assigneeProfile:
            saved.workItems.find((row) => row.id === workItemId && row.assignee === fields.assignee)
              ?.assigneeProfile ?? null,
        }
      : {}),
  };
}

/**
 * Function projectInterventionWorkItemExecutionResult
 *
 * @description
 * Stages a local execution fact and preserves earlier attempts without inventing provenance.
 *
 * @access public
 *
 * @param {InterventionWorkItemOutput} item - Work item carrying preventive identifiers.
 * @param {InterventionWorkItemExecutionResultInput | null} input - Recorded fact or explicit
 *   removal.
 *
 * @returns {InterventionWorkItemExecutionResultOutput | null} Local result or unchanged recorded
 *   fact.
 */
export function projectInterventionWorkItemExecutionResult(
  item: InterventionWorkItemOutput,
  input: InterventionWorkItemExecutionResultInput | null,
): InterventionWorkItemExecutionResultOutput | null {
  if (!input) return item.executionResult ?? null;
  const previous = item.executionResult;
  if (previous && equalExecutionFacts(previous, input)) return previous;
  const history = [...(previous?.history ?? [])];
  if (previous) {
    const { history: _history, ...attempt } = previous;
    history.push(attempt);
  }
  return {
    equipmentId: input.equipmentId,
    performedAt: input.performedAt,
    outcome: input.outcome,
    workPerformed: input.workPerformed,
    operationId: item.operationId ?? null,
    occurrenceId: item.occurrenceId ?? null,
    state: 'staged',
    validatedAt: null,
    history,
  };
}

/**
 * Function equalExecutionFacts
 *
 * @description
 * Compares facts using the API's second-precision date and trimmed description normalization.
 *
 * @access private
 *
 * @param {InterventionWorkItemExecutionResultInput | null} previous - Previously recorded fact.
 * @param {InterventionWorkItemExecutionResultInput | null} input - Pending fact or removal.
 *
 * @returns {boolean} Whether the declaration is unchanged.
 */
function equalExecutionFacts(
  previous: InterventionWorkItemExecutionResultInput | null,
  input: InterventionWorkItemExecutionResultInput | null,
): boolean {
  return (
    previous === input ||
    (!!previous &&
      !!input &&
      previous.equipmentId === input.equipmentId &&
      previous.outcome === input.outcome &&
      previous.workPerformed.trim() === input.workPerformed.trim() &&
      previous.performedAt.replace(/\.\d+(?=Z|[+-]\d{2}:\d{2}$)/u, '').replace(/Z$/u, '+00:00') ===
        input.performedAt.replace(/\.\d+(?=Z|[+-]\d{2}:\d{2}$)/u, '').replace(/Z$/u, '+00:00'))
  );
}

/**
 * Function searchSavedWorkItems
 *
 * @description
 * Evaluates offline criteria over all saved rows and available display labels.
 *
 * @since 6.2.0
 *
 * @param {readonly InterventionWorkItemOutput[]} items - Complete local projection.
 * @param {InterventionWorkItemTableQuery} query - Controlled table criteria, including Remaining's
 *   scalar statuses.
 *
 * @returns {readonly InterventionWorkItemOutput[]} Matching saved rows.
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
 *
 * @description
 * Evaluates offline history criteria over the complete local projection and patch values.
 *
 * @since 6.2.0
 *
 * @param {readonly InterventionChangeOutput[]} changes - All projected changes.
 * @param {InterventionChangeTableQuery} query - Controlled history criteria.
 * @param {readonly InterventionWorkItemOutput[]} items - Available target labels.
 *
 * @returns {readonly InterventionChangeOutput[]} Matching saved changes.
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
