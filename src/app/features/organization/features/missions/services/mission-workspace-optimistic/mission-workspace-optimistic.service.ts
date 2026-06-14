import { Injectable } from '@angular/core';
import type {
  CreateMissionWorkItemInput,
  MissionOutput,
  MissionTransitionRequest,
  MissionWorkItemOutput,
  MissionWorkItemStatusChange,
} from '@features/organization/features/missions/models';
import type { MissionWorkItemOptimisticResult } from './models';

/**
 * Builds optimistic mission representations used while field changes are offline.
 */
@Injectable({ providedIn: 'root' })
export class MissionWorkspaceOptimisticService {
  public transition(mission: MissionOutput, request: MissionTransitionRequest): MissionOutput {
    return {
      ...mission,
      status: request.status,
      reviewNote: request.reviewNote ?? mission.reviewNote,
      revision: mission.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  public createWorkItem(
    input: CreateMissionWorkItemInput,
    clientId: string,
  ): MissionWorkItemOutput {
    const now = new Date().toISOString();
    return {
      '@id': `/api/mission-work-items/${clientId}`,
      '@type': 'MissionWorkItem',
      id: clientId,
      mission: input.mission,
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

  public addWorkItem(mission: MissionOutput): MissionOutput;
  public addWorkItem(mission: null): null;
  public addWorkItem(mission: MissionOutput | null): MissionOutput | null;
  public addWorkItem(mission: MissionOutput | null): MissionOutput | null {
    if (!mission) return null;
    return {
      ...mission,
      revision: mission.revision + 1,
      workItemsCount: mission.workItemsCount + 1,
      updatedAt: new Date().toISOString(),
    };
  }

  public updateWorkItem(
    mission: MissionOutput | null,
    item: MissionWorkItemOutput,
    request: MissionWorkItemStatusChange,
  ): MissionWorkItemOptimisticResult {
    const skipReason =
      request.status === 'skipped' ? (request.skipReason ?? item.skipReason ?? null) : null;
    const workItem: MissionWorkItemOutput = {
      ...item,
      status: request.status,
      skipReason,
      revision: item.revision + 1,
      updatedAt: new Date().toISOString(),
    };
    if (!mission) return { mission: null, workItem };
    const wasResolved = item.status === 'completed' || item.status === 'skipped';
    const isResolved = request.status === 'completed' || request.status === 'skipped';
    return {
      workItem,
      mission: {
        ...mission,
        status:
          mission.status === 'planned' && request.status !== 'planned'
            ? 'in_progress'
            : mission.status,
        revision: mission.revision + 1,
        completedWorkItemsCount:
          mission.completedWorkItemsCount + Number(isResolved) - Number(wasResolved),
        updatedAt: workItem.updatedAt,
      },
    };
  }

  public touch(mission: MissionOutput): MissionOutput {
    return {
      ...mission,
      revision: mission.revision + 1,
      updatedAt: new Date().toISOString(),
    };
  }
}
