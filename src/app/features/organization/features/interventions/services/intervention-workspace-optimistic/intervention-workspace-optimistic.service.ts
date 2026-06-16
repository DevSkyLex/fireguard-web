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
  /** Method transition. @method transition @description Applies an optimistic intervention transition. @access public @since 1.0.0 @param {InterventionOutput} intervention - Current intervention. @param {InterventionTransitionRequest} request - Requested transition. @returns {InterventionOutput} */
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

  /** Method createWorkItem. @method createWorkItem @description Builds an optimistic work item. @access public @since 1.0.0 @param {CreateInterventionWorkItemInput} input - Work item input. @param {string} clientId - Client-generated identifier. @returns {InterventionWorkItemOutput} */
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

  /** Method addWorkItem. @method addWorkItem @description Increments optimistic intervention work item counters. @access public @since 1.0.0 @param {InterventionOutput | null} intervention - Current intervention. @returns {InterventionOutput | null} */
  public addWorkItem(intervention: InterventionOutput): InterventionOutput;
  /** Method addWorkItem. @method addWorkItem @description Preserves a null intervention value. @access public @since 1.0.0 @param {null} intervention - Null intervention. @returns {null} */
  public addWorkItem(intervention: null): null;
  /** Method addWorkItem. @method addWorkItem @description Increments counters when an intervention is available. @access public @since 1.0.0 @param {InterventionOutput | null} intervention - Current intervention. @returns {InterventionOutput | null} */
  public addWorkItem(intervention: InterventionOutput | null): InterventionOutput | null;
  /** Method addWorkItem. @method addWorkItem @description Implements optimistic work item counter updates. @access public @since 1.0.0 @param {InterventionOutput | null} intervention - Current intervention. @returns {InterventionOutput | null} */
  public addWorkItem(intervention: InterventionOutput | null): InterventionOutput | null {
    if (!intervention) return null;
    return {
      ...intervention,
      revision: intervention.revision + 1,
      workItemsCount: intervention.workItemsCount + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  /** Method updateWorkItem. @method updateWorkItem @description Applies an optimistic work item status change. @access public @since 1.0.0 @param {InterventionOutput | null} intervention - Current intervention. @param {InterventionWorkItemOutput} item - Work item to update. @param {InterventionWorkItemStatusChange} request - Requested status change. @returns {InterventionWorkItemOptimisticResult} */
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

  /** Method touch. @method touch @description Increments the intervention revision and update date. @access public @since 1.0.0 @param {InterventionOutput} intervention - Intervention to touch. @returns {InterventionOutput} */
  public touch(intervention: InterventionOutput): InterventionOutput {
    return {
      ...intervention,
      revision: intervention.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  }
}
