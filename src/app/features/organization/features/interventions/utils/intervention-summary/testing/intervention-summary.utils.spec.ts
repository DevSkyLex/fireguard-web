import type {
  InterventionActivityOutput,
  InterventionOutput,
  MemberSelectOption,
} from '@features/organization/features/interventions/models';
import {
  buildInterventionMetaLine,
  formatInterventionScheduleLabel,
  resolveInterventionResponsibleLabel,
  summarizeInterventionLabels,
} from '../intervention-summary.utils';

const MEMBER: MemberSelectOption = {
  value: '/api/members/1',
  label: 'Jane Doe',
  displayName: 'Jane Doe',
  roleLabel: 'Technician',
  avatarUrl: null,
  initials: 'JD',
};

function buildIntervention(overrides: Partial<InterventionOutput> = {}): InterventionOutput {
  return {
    id: 'intervention-1',
    organization: '/api/organizations/1',
    number: 42,
    type: 'site_setup',
    name: 'Annual inspection',
    description: null,
    status: 'draft',
    allowedTransitions: [],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'normal',
    plannedStartAt: null,
    dueAt: null,
    reviewNote: null,
    revision: 1,
    facilitiesCount: 0,
    equipmentCount: 0,
    inspectionsCount: 0,
    blockersCount: 0,
    workItemsCount: 0,
    completedWorkItemsCount: 0,
    proposedChangesCount: 0,
    commentsCount: 0,
    hasSignature: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  } as InterventionOutput;
}

function buildActivity(
  overrides: Partial<InterventionActivityOutput> = {},
): InterventionActivityOutput {
  return {
    id: 'activity-1',
    intervention: '/api/interventions/1',
    kind: 'system',
    event: 'created',
    actor: null,
    body: null,
    payload: null,
    createdAt: '2026-01-03T00:00:00.000Z',
    ...overrides,
  } as InterventionActivityOutput;
}

describe('resolveInterventionResponsibleLabel', () => {
  it('should return null when the intervention is null', () => {
    expect(resolveInterventionResponsibleLabel(null, [MEMBER])).toBeNull();
  });

  it('should return null when responsible is unset', () => {
    expect(resolveInterventionResponsibleLabel(buildIntervention(), [MEMBER])).toBeNull();
  });

  it('should return null when the responsible member is not among the loaded members', () => {
    const intervention = buildIntervention({ responsible: '/api/members/404' });

    expect(resolveInterventionResponsibleLabel(intervention, [MEMBER])).toBeNull();
  });

  it("should return the responsible member's display name when found", () => {
    const intervention = buildIntervention({ responsible: MEMBER.value });

    expect(resolveInterventionResponsibleLabel(intervention, [MEMBER])).toBe('Jane Doe');
  });
});

describe('formatInterventionScheduleLabel', () => {
  it('should return null when the intervention is null', () => {
    expect(formatInterventionScheduleLabel(null, 'en-US')).toBeNull();
  });

  it('should return null when plannedStartAt is unset', () => {
    const intervention = buildIntervention({ dueAt: '2026-03-05T00:00:00.000Z' });

    expect(formatInterventionScheduleLabel(intervention, 'en-US')).toBeNull();
  });

  it('should return null when dueAt is unset', () => {
    const intervention = buildIntervention({ plannedStartAt: '2026-03-01T00:00:00.000Z' });

    expect(formatInterventionScheduleLabel(intervention, 'en-US')).toBeNull();
  });

  it('should format the planned window as a short date range', () => {
    const intervention = buildIntervention({
      plannedStartAt: '2026-03-01T00:00:00.000Z',
      dueAt: '2026-03-05T00:00:00.000Z',
    });

    expect(formatInterventionScheduleLabel(intervention, 'en-US')).toBe('Mar 1 – Mar 5');
  });
});

describe('summarizeInterventionLabels', () => {
  it('should return null when the intervention is null', () => {
    expect(summarizeInterventionLabels(null)).toBeNull();
  });

  it('should return null when there are no labels', () => {
    expect(summarizeInterventionLabels(buildIntervention())).toBeNull();
  });

  it('should join label names', () => {
    const intervention = buildIntervention({
      labels: [
        { id: 'label-1', name: 'Urgent', color: '#ff0000' },
        { id: 'label-2', name: 'Roof', color: '#00ff00' },
      ] as InterventionOutput['labels'],
    });

    expect(summarizeInterventionLabels(intervention)).toBe('Urgent, Roof');
  });
});

describe('buildInterventionMetaLine', () => {
  it('should return an empty string when the intervention is null', () => {
    expect(buildInterventionMetaLine(null, [], [], 'en-US')).toBe('');
  });

  it('should fall back to updatedAt when there is no activity', () => {
    const intervention = buildIntervention({ revision: 3 });

    expect(buildInterventionMetaLine(intervention, [], [], 'en-US')).toContain('v3');
  });

  it('should report the last status change without an actor', () => {
    const intervention = buildIntervention({ revision: 2 });
    const activity = buildActivity({ kind: 'system', event: 'status_changed', actor: null });

    const result = buildInterventionMetaLine(intervention, [activity], [], 'en-US');

    expect(result).toContain('Status changed');
    expect(result).toContain('v2');
  });

  it('should report the last status change with a resolved actor', () => {
    const intervention = buildIntervention({ revision: 2 });
    const activity = buildActivity({
      kind: 'system',
      event: 'status_changed',
      actor: MEMBER.value,
    });

    const result = buildInterventionMetaLine(intervention, [activity], [MEMBER], 'en-US');

    expect(result).toContain('Jane Doe');
    expect(result).toContain('changed the status');
  });

  it('should report a comment activity', () => {
    const intervention = buildIntervention({ revision: 1 });
    const activity = buildActivity({ kind: 'comment', event: 'created', actor: MEMBER.value });

    const result = buildInterventionMetaLine(intervention, [activity], [MEMBER], 'en-US');

    expect(result).toContain('Jane Doe');
    expect(result).toContain('commented');
  });

  it('should use the last entry of the timeline, not the first', () => {
    const intervention = buildIntervention({ revision: 5 });
    const older = buildActivity({
      kind: 'system',
      event: 'created',
      actor: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const newest = buildActivity({
      kind: 'system',
      event: 'rescheduled',
      actor: null,
      createdAt: '2026-01-10T00:00:00.000Z',
    });

    const result = buildInterventionMetaLine(intervention, [older, newest], [], 'en-US');

    expect(result).toContain('Rescheduled');
  });
});
