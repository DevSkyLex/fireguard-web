import type {
  InterventionAllowedActionsOutput,
  InterventionOutput,
} from '@features/organization/features/interventions/models';
import { isInterventionBoardMoveAllowed } from '../intervention-board-move.utils';

function allowedActions(
  overrides: Partial<InterventionAllowedActionsOutput> = {},
): InterventionAllowedActionsOutput {
  return {
    canEditDetails: false,
    canEditSite: false,
    canEditResponsible: false,
    canEditPlanning: false,
    canMutateWorkItems: false,
    canMutateChanges: false,
    canAssignTeam: false,
    canManageAttachments: false,
    canSubmit: false,
    canWithdraw: false,
    canDelete: false,
    canPublish: false,
    ...overrides,
  };
}

function buildIntervention(overrides: Partial<InterventionOutput> = {}): InterventionOutput {
  return {
    id: 'intervention-1',
    organization: '/api/organizations/org-1',
    number: 42,
    type: 'site_setup',
    name: 'Annual inspection',
    description: null,
    status: 'draft',
    allowedTransitions: ['planned', 'abandoned'],
    allowedActions: allowedActions(),
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
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as InterventionOutput;
}

describe('isInterventionBoardMoveAllowed', () => {
  it('should deny a target absent from allowedTransitions', () => {
    const intervention = buildIntervention({ status: 'draft', allowedTransitions: ['planned'] });

    expect(isInterventionBoardMoveAllowed(intervention, 'in_progress')).toBe(false);
  });

  it('should allow an ordinary target present in allowedTransitions', () => {
    const intervention = buildIntervention({
      status: 'draft',
      allowedTransitions: ['planned', 'abandoned'],
    });

    expect(isInterventionBoardMoveAllowed(intervention, 'planned')).toBe(true);
  });

  it('should deny published, which never appears in a real allowedTransitions set', () => {
    const intervention = buildIntervention({
      status: 'submitted',
      allowedTransitions: ['in_progress', 'changes_requested'],
    });

    expect(isInterventionBoardMoveAllowed(intervention, 'published')).toBe(false);
  });

  it('should deny submitted → in_progress when canWithdraw is false', () => {
    const intervention = buildIntervention({
      status: 'submitted',
      allowedTransitions: ['in_progress', 'changes_requested'],
      allowedActions: allowedActions({ canWithdraw: false }),
    });

    expect(isInterventionBoardMoveAllowed(intervention, 'in_progress')).toBe(false);
  });

  it('should allow submitted → in_progress when canWithdraw is true', () => {
    const intervention = buildIntervention({
      status: 'submitted',
      allowedTransitions: ['in_progress', 'changes_requested'],
      allowedActions: allowedActions({ canWithdraw: true }),
    });

    expect(isInterventionBoardMoveAllowed(intervention, 'in_progress')).toBe(true);
  });

  it('should deny submitted → in_progress when allowedActions is absent (offline cache)', () => {
    const intervention = buildIntervention({
      status: 'submitted',
      allowedTransitions: ['in_progress', 'changes_requested'],
      allowedActions: undefined,
    });

    expect(isInterventionBoardMoveAllowed(intervention, 'in_progress')).toBe(false);
  });

  it('should not apply the withdraw gate to other transitions', () => {
    const intervention = buildIntervention({
      status: 'submitted',
      allowedTransitions: ['changes_requested'],
      allowedActions: allowedActions({ canWithdraw: false }),
    });

    expect(isInterventionBoardMoveAllowed(intervention, 'changes_requested')).toBe(true);
  });
});
