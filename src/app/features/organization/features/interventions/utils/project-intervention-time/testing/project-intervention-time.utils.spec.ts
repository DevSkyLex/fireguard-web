import type {
  InterventionTimeEntry,
  InterventionOutboxOperation,
} from '@features/organization/features/interventions/models';
import { projectInterventionTime } from '../project-intervention-time.utils';
const input = {
  id: 'entry',
  memberId: 'member',
  workedOn: '2026-09-16',
  minutes: 120,
  note: 'Field work',
};
const entry: InterventionTimeEntry = {
  ...input,
  workItemId: 'task',
  revision: 1,
  cancelled: false,
  createdBy: 'actor',
  updatedBy: 'actor',
  createdAt: '2026-09-16T09:00:00Z',
  updatedAt: '2026-09-16T09:00:00Z',
  versions: [
    {
      revision: 1,
      workedOn: input.workedOn,
      minutes: 120,
      note: input.note,
      cancelled: false,
      actorId: 'actor',
      recordedAt: '2026-09-16T09:00:00Z',
    },
  ],
};
describe('projectInterventionTime', () => {
  const create: InterventionOutboxOperation = {
    id: 'op',
    interventionId: 'intervention',
    type: 'time-entry.create',
    payload: { ...input, workItemId: 'task', actorId: 'actor' },
    createdAt: entry.createdAt,
  };
  it('uses the stable entry ID for idempotent offline projection', () => {
    const projected = projectInterventionTime([], [create], 'task');
    expect(projected).toHaveLength(1);
    expect(projectInterventionTime(projected, [create], 'task')).toEqual(projected);
  });
  it('retains original attribution and history while marking a conflicted correction', () => {
    const correction: InterventionOutboxOperation = {
      ...create,
      type: 'time-entry.correct',
      payload: { ...input, minutes: 90, workItemId: 'task', actorId: 'manager', revision: 1 },
      status: 'conflict',
    };
    const projected = projectInterventionTime([entry], [correction], 'task');
    expect(projected[0]).toMatchObject({
      minutes: 90,
      revision: 2,
      createdBy: 'actor',
      updatedBy: 'manager',
      memberId: 'member',
      syncStatus: 'conflict',
      versions: entry.versions,
    });
    expect(entry.minutes).toBe(120);
  });
  it('retains cancelled entries and their audit history', () => {
    const cancelled: InterventionOutboxOperation = {
      ...create,
      type: 'time-entry.cancel',
      payload: { id: 'entry', revision: 1, workItemId: 'task', actorId: 'actor' },
    };
    expect(projectInterventionTime([entry], [cancelled], 'task')[0]).toMatchObject({
      cancelled: true,
      versions: entry.versions,
    });
  });
  it('never mixes journals or operational updates', () => {
    expect(projectInterventionTime([], [create], 'another-task')).toEqual([]);
    const operation: InterventionOutboxOperation = {
      ...create,
      type: 'work-item.update',
      payload: { workItemId: 'task', remainingMinutes: 180 },
    };
    expect(projectInterventionTime([entry], [operation], 'task')).toEqual([entry]);
  });
});
