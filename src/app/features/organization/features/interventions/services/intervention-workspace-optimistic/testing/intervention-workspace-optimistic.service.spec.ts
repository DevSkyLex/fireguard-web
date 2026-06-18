import type {
  CreateInterventionWorkItemInput,
  InterventionOutput,
  InterventionTransitionRequest,
  InterventionWorkItemOutput,
} from '@features/organization/features/interventions/models';
import { InterventionWorkspaceOptimisticService } from '../intervention-workspace-optimistic.service';

const baseIntervention = {
  revision: 4,
  workItemsCount: 3,
  completedWorkItemsCount: 1,
  status: 'planned',
} as unknown as InterventionOutput;

describe('InterventionWorkspaceOptimisticService', () => {
  let service: InterventionWorkspaceOptimisticService;

  beforeEach(() => {
    service = new InterventionWorkspaceOptimisticService();
  });

  it('should optimistically add a work item and pass null through', () => {
    const updated = service.addWorkItem(baseIntervention);

    expect(updated.workItemsCount).toBe(4);
    expect(updated.revision).toBe(5);
    expect(service.addWorkItem(null)).toBeNull();
  });

  it('should decrement counters per removed work item and bump the revision', () => {
    const removed = [
      { status: 'completed' },
      { status: 'planned' },
    ] as unknown as InterventionWorkItemOutput[];

    const updated = service.removeWorkItem(baseIntervention, removed);

    expect(updated?.workItemsCount).toBe(1);
    expect(updated?.completedWorkItemsCount).toBe(0);
    expect(updated?.revision).toBe(6);
  });

  it('should leave the intervention untouched when nothing is removed', () => {
    expect(service.removeWorkItem(baseIntervention, [])).toBe(baseIntervention);
  });

  it('should synthesize a planned work item from the creation input and client id', () => {
    const input = {
      intervention: '/api/interventions/1',
      action: 'inspection',
      target: null,
      source: 'planned',
      required: true,
    } as unknown as CreateInterventionWorkItemInput;

    const workItem = service.createWorkItem(input, 'client-1');

    expect(workItem.id).toBe('client-1');
    expect(workItem.status).toBe('planned');
    expect(workItem['@id']).toContain('client-1');
  });

  it('should apply a transition and bump the revision', () => {
    const updated = service.transition(baseIntervention, {
      status: 'submitted',
    } as InterventionTransitionRequest);

    expect(updated.status).toBe('submitted');
    expect(updated.revision).toBe(5);
  });
});
