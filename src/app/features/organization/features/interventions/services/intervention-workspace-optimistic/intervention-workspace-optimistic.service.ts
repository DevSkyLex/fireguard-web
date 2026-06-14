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
 * Builds optimistic intervention representations used while field changes are offline.
 */
@Injectable({ providedIn: 'root' })
export class InterventionWorkspaceOptimisticService {
  public transition(intervention: InterventionOutput, request: InterventionTransitionRequest): InterventionOutput {
    return {
      ...intervention,
      status: request.status,
      reviewNote: request.reviewNote ?? intervention.reviewNote,
      revision: intervention.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  }

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

  public addWorkItem(intervention: InterventionOutput): InterventionOutput;
  public addWorkItem(intervention: null): null;
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

  public touch(intervention: InterventionOutput): InterventionOutput {
    return {
      ...intervention,
      revision: intervention.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  }
}
