import { signal, type WritableSignal } from '@angular/core';
import type {
  InterventionAllowedActionsOutput,
  InterventionCapabilities,
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';
import { createInterventionCapabilities } from '../intervention-capabilities.utils';

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  } as InterventionOutput;
}

interface CapabilityHarness {
  readonly capabilities: InterventionCapabilities;
  readonly intervention: WritableSignal<InterventionOutput | null>;
  readonly granted: WritableSignal<ReadonlySet<string>>;
  readonly scanSupported: WritableSignal<boolean>;
}

function buildHarness(
  intervention: InterventionOutput | null,
  permissions: readonly OrganizationPermissionName[] = [],
): CapabilityHarness {
  const interventionSignal = signal<InterventionOutput | null>(intervention);
  const granted = signal<ReadonlySet<string>>(new Set(permissions));
  const scanSupported = signal<boolean>(false);

  return {
    capabilities: createInterventionCapabilities({
      intervention: interventionSignal,
      hasPermission: (permission) => granted().has(permission),
      scanSupported: () => scanSupported(),
    }),
    intervention: interventionSignal,
    granted,
    scanSupported,
  };
}

describe('createInterventionCapabilities', () => {
  it('should mirror the three organization permissions the client still gates on', () => {
    const { capabilities, granted } = buildHarness(buildIntervention());

    expect(capabilities.canPlan()).toBe(false);
    expect(capabilities.canExecute()).toBe(false);
    expect(capabilities.canReview()).toBe(false);

    granted.set(
      new Set([
        ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
        ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
        ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
      ]),
    );

    expect(capabilities.canPlan()).toBe(true);
    expect(capabilities.canExecute()).toBe(true);
    expect(capabilities.canReview()).toBe(true);
  });

  it.each([
    ['draft', 'prepare', 'planned'],
    ['planned', 'execute', 'submitted'],
    ['in_progress', 'execute', 'submitted'],
    ['changes_requested', 'execute', 'submitted'],
    ['submitted', 'review', null],
    ['published', 'review', null],
    ['abandoned', 'prepare', 'planned'],
  ] as const)(
    'should derive phase and command target for %s',
    (status, expectedPhase, expectedTarget) => {
      const { capabilities } = buildHarness(
        buildIntervention({ status: status as InterventionStatus }),
      );

      expect(capabilities.phase()).toBe(expectedPhase);
      expect(capabilities.commandTransitionTarget()).toBe(expectedTarget);
    },
  );

  it.each([
    ['canSubmit', 'canSubmit'],
    ['canPublish', 'canPublish'],
    ['canEditSchedule', 'canEditPlanning'],
    ['canEditSite', 'canEditSite'],
    ['canEditResponsible', 'canEditResponsible'],
    ['canEditDetails', 'canEditDetails'],
    ['canAssignTeam', 'canAssignTeam'],
    ['canAddWorkItem', 'canMutateWorkItems'],
    ['canManageAttachments', 'canManageAttachments'],
    ['canDeleteIntervention', 'canDelete'],
  ] as const)('should read %s from the server-advertised %s flag', (capability, flag) => {
    const { capabilities, intervention } = buildHarness(buildIntervention());

    expect(capabilities[capability]()).toBe(false);

    intervention.set(buildIntervention({ allowedActions: allowedActions({ [flag]: true }) }));
    expect(capabilities[capability]()).toBe(true);
  });

  it('should deny every server-advertised gate when allowedActions is absent', () => {
    const { capabilities } = buildHarness(buildIntervention({ allowedActions: undefined }), [
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
      ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
      ORGANIZATION_PERMISSION.INTERVENTIONS_PUBLISH,
    ]);

    expect(capabilities.canSubmit()).toBe(false);
    expect(capabilities.canPublish()).toBe(false);
    expect(capabilities.canEditSchedule()).toBe(false);
    expect(capabilities.canEditSite()).toBe(false);
    expect(capabilities.canEditResponsible()).toBe(false);
    expect(capabilities.canEditDetails()).toBe(false);
    expect(capabilities.canAssignTeam()).toBe(false);
    expect(capabilities.canAddWorkItem()).toBe(false);
    expect(capabilities.canManageAttachments()).toBe(false);
    expect(capabilities.canDeleteIntervention()).toBe(false);
  });

  it('should gate canManageLabels on organization.interventions.write alone', () => {
    const { capabilities: withWrite } = buildHarness(buildIntervention(), [
      ORGANIZATION_PERMISSION.INTERVENTIONS_WRITE,
    ]);
    const { capabilities: withPlan } = buildHarness(buildIntervention(), [
      ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
    ]);

    expect(withWrite.canManageLabels()).toBe(true);
    expect(withPlan.canManageLabels()).toBe(false);
  });

  it('should offer skip only during execution, even when work items are mutable', () => {
    const { capabilities, intervention } = buildHarness(
      buildIntervention({
        status: 'in_progress',
        allowedTransitions: ['submitted', 'abandoned'],
        allowedActions: allowedActions({ canMutateWorkItems: true }),
      }),
    );

    expect(capabilities.canSkipWorkItem()).toBe(true);

    intervention.set(
      buildIntervention({
        status: 'draft',
        allowedActions: allowedActions({ canMutateWorkItems: true }),
      }),
    );
    expect(capabilities.canSkipWorkItem()).toBe(false);
  });

  it('should offer scanning only during execution on a capable device', () => {
    const { capabilities, scanSupported } = buildHarness(
      buildIntervention({ status: 'in_progress', allowedTransitions: ['submitted', 'abandoned'] }),
    );

    expect(capabilities.canScanWorkItem()).toBe(false);

    scanSupported.set(true);
    expect(capabilities.canScanWorkItem()).toBe(true);
  });

  it.each([
    ['draft', ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN, true],
    ['draft', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, false],
    ['changes_requested', ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW, true],
    ['in_progress', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, true],
    ['in_progress', ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN, false],
  ] as const)(
    'should gate abandoning from %s on the %s capability',
    (status, permission, expected) => {
      const { capabilities } = buildHarness(
        buildIntervention({
          status: status as InterventionStatus,
          allowedTransitions: ['abandoned'],
        }),
        [permission],
      );

      expect(capabilities.canAbandon()).toBe(expected);
    },
  );

  it('should refuse abandoning when the API does not offer it', () => {
    const { capabilities } = buildHarness(
      buildIntervention({ status: 'draft', allowedTransitions: ['planned'] }),
      [ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN],
    );

    expect(capabilities.canAbandon()).toBe(false);
  });

  it('should subtract the owned forward move and abandoned from the menu targets', () => {
    const { capabilities } = buildHarness(
      buildIntervention({
        status: 'changes_requested',
        allowedTransitions: ['in_progress', 'submitted', 'abandoned'],
      }),
      [
        ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
        ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
        ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
      ],
    );

    expect(capabilities.transitionTargets()).toEqual(['in_progress']);
  });

  it('should gate the withdraw move on the server-advertised canWithdraw flag', () => {
    const { capabilities, intervention } = buildHarness(
      buildIntervention({
        status: 'submitted',
        allowedTransitions: ['changes_requested', 'in_progress'],
        allowedActions: allowedActions({ canWithdraw: true }),
      }),
      [ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW],
    );

    expect(capabilities.transitionTargets()).toEqual(['changes_requested', 'in_progress']);

    intervention.set(
      buildIntervention({
        status: 'submitted',
        allowedTransitions: ['changes_requested', 'in_progress'],
        allowedActions: allowedActions({ canWithdraw: false }),
      }),
    );
    expect(capabilities.transitionTargets()).toEqual(['changes_requested']);
  });

  it('should return no targets without an intervention', () => {
    const { capabilities } = buildHarness(null, [ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN]);

    expect(capabilities.transitionTargets()).toEqual([]);
    expect(capabilities.canAbandon()).toBe(false);
    expect(capabilities.canDeleteIntervention()).toBe(false);
    expect(capabilities.canSubmit()).toBe(false);
  });

  it.each([
    ['submitted', ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW, true],
    ['submitted', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, false],
    ['in_progress', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, true],
    ['changes_requested', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, true],
    ['draft', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, false],
  ] as const)(
    'should gate change rejection in %s on the %s permission',
    (status, permission, expected) => {
      const { capabilities } = buildHarness(
        buildIntervention({ status: status as InterventionStatus }),
        [permission],
      );

      expect(capabilities.canRejectChange()).toBe(expected);
    },
  );

  it('should map transition capabilities onto the permission gates', () => {
    const { capabilities, granted } = buildHarness(buildIntervention());

    expect(capabilities.hasCapability('plan')).toBe(false);
    expect(capabilities.hasCapability('review')).toBe(false);
    expect(capabilities.hasCapability('execute')).toBe(false);

    granted.set(new Set([ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN]));
    expect(capabilities.hasCapability('plan')).toBe(true);
    expect(capabilities.hasCapability('review')).toBe(false);
    expect(capabilities.hasCapability('execute')).toBe(false);
  });
});
