import { Injectable } from '@angular/core';
import type {
  CreateInterventionWorkItemInput,
  InterventionOutput,
  InterventionTransitionRequest,
  InterventionWorkItemOutput,
  InterventionWorkItemStatusChange,
} from '@features/organization/features/interventions/models';
import type { InterventionWorkItemOptimisticResult } from './models';

/**
 * Service InterventionWorkspaceOptimisticService
 * @class InterventionWorkspaceOptimisticService
 *
 * @description
 * Builds optimistic intervention representations used while field changes are offline.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionWorkspaceOptimisticService {
  /**
   * Method transition
   * @method transition
   *
   * @description
   * Applies an optimistic intervention transition, incrementing the revision
   * and updating the status and reviewNote without waiting for a server round-trip.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Current intervention.
   * @param {InterventionTransitionRequest} request - Requested transition.
   *
   * @returns {InterventionOutput} Updated intervention with the new status applied.
   */
  public transition(
    intervention: InterventionOutput,
    request: InterventionTransitionRequest,
  ): InterventionOutput {
    return {
      ...intervention,
      status: request.status,
      reviewNote: request.reviewNote ?? intervention.reviewNote,
      revision: intervention.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Method createWorkItem
   * @method createWorkItem
   *
   * @description
   * Builds an optimistic work item from the creation input, using the
   * provided client-generated id so offline and online records can be matched.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {CreateInterventionWorkItemInput} input - Work item input.
   * @param {string} clientId - Client-generated identifier.
   *
   * @returns {InterventionWorkItemOutput} Synthesized work item ready for local state.
   */
  public createWorkItem(
    input: CreateInterventionWorkItemInput,
    clientId: string,
  ): InterventionWorkItemOutput {
    const now = new Date().toISOString();
    return {
      '@id': `/api/intervention-work-items/${clientId}`,
      '@type': 'InterventionWorkItem',
      id: clientId,
      intervention: input.intervention,
      action: input.action,
      target: input.target ?? null,
      resultResource: input.resultResource ?? null,
      assignee: input.assignee ?? null,
      source: input.source,
      status: 'planned',
      required: input.required,
      skipReason: null,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Method addWorkItem
   * @method addWorkItem
   *
   * @description
   * Increments the intervention's `workItemsCount` and revision optimistically.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Current intervention.
   *
   * @returns {InterventionOutput} Updated intervention.
   */
  public addWorkItem(intervention: InterventionOutput): InterventionOutput;

  /**
   * Method addWorkItem
   * @method addWorkItem
   *
   * @description
   * Preserves a null intervention value (no-op overload).
   *
   * @access public
   * @since 1.0.0
   *
   * @param {null} intervention - Null intervention.
   *
   * @returns {null}
   */
  public addWorkItem(intervention: null): null;

  /**
   * Method addWorkItem
   * @method addWorkItem
   *
   * @description
   * Increments counters when an intervention is available; passes null through.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput | null} intervention - Current intervention or null.
   *
   * @returns {InterventionOutput | null}
   */
  public addWorkItem(intervention: InterventionOutput | null): InterventionOutput | null;

  public addWorkItem(intervention: InterventionOutput | null): InterventionOutput | null {
    if (!intervention) return null;
    return {
      ...intervention,
      revision: intervention.revision + 1,
      workItemsCount: intervention.workItemsCount + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Method removeWorkItem
   * @method removeWorkItem
   *
   * @description
   * Mirrors the server-side counter recompute that follows deleting one or more
   * work items: decrements `workItemsCount` by the number removed,
   * `completedWorkItemsCount` by the number of removed items that were resolved
   * (completed or skipped), and bumps the revision once per removed item to
   * match the server's per-delete `touch()`.
   *
   * @access public
   * @since 1.1.0
   *
   * @param {InterventionOutput | null} intervention - Current intervention or null.
   * @param {readonly InterventionWorkItemOutput[]} removed - Work items being removed.
   *
   * @returns {InterventionOutput | null} Updated intervention, or null when none.
   */
  public removeWorkItem(
    intervention: InterventionOutput | null,
    removed: readonly InterventionWorkItemOutput[],
  ): InterventionOutput | null {
    if (!intervention || removed.length === 0) return intervention;
    const resolvedRemoved: number = removed.filter(
      (item: InterventionWorkItemOutput): boolean =>
        item.status === 'completed' || item.status === 'skipped',
    ).length;
    return {
      ...intervention,
      revision: intervention.revision + removed.length,
      workItemsCount: Math.max(0, intervention.workItemsCount - removed.length),
      completedWorkItemsCount: Math.max(0, intervention.completedWorkItemsCount - resolvedRemoved),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Method updateWorkItem
   * @method updateWorkItem
   *
   * @description
   * Applies an optimistic work item status change, recomputes the parent
   * intervention's `completedWorkItemsCount` and status when applicable.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput | null} intervention - Current intervention.
   * @param {InterventionWorkItemOutput} item - Work item to update.
   * @param {InterventionWorkItemStatusChange} request - Requested status change.
   *
   * @returns {InterventionWorkItemOptimisticResult} Updated work item and intervention pair.
   */
  public updateWorkItem(
    intervention: InterventionOutput | null,
    item: InterventionWorkItemOutput,
    request: InterventionWorkItemStatusChange,
  ): InterventionWorkItemOptimisticResult {
    const skipReason =
      request.status === 'skipped' ? (request.skipReason ?? item.skipReason ?? null) : null;
    const workItem: InterventionWorkItemOutput = {
      ...item,
      status: request.status,
      skipReason,
      revision: item.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    if (!intervention) return { intervention: null, workItem };
    const wasResolved = item.status === 'completed' || item.status === 'skipped';
    const isResolved = request.status === 'completed' || request.status === 'skipped';
    return {
      workItem,
      intervention: {
        ...intervention,
        status:
          intervention.status === 'planned' && request.status !== 'planned'
            ? 'in_progress'
            : intervention.status,
        revision: intervention.revision + 1,
        completedWorkItemsCount:
          intervention.completedWorkItemsCount + Number(isResolved) - Number(wasResolved),
        updatedAt: workItem.updatedAt,
      },
    };
  }

  /**
   * Method touch
   * @method touch
   *
   * @description
   * Increments the intervention revision and refreshes `updatedAt` to reflect
   * a local mutation without changing any business fields.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {InterventionOutput} intervention - Intervention to touch.
   *
   * @returns {InterventionOutput} Updated intervention with bumped revision.
   */
  public touch(intervention: InterventionOutput): InterventionOutput {
    return {
      ...intervention,
      revision: intervention.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  }
}
