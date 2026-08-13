import { signal, type WritableSignal } from '@angular/core';
import type {
  InterventionCapabilities,
  InterventionOutput,
  InterventionStatus,
} from '@features/organization/features/interventions/models';
import {
  ORGANIZATION_PERMISSION,
  type OrganizationPermissionName,
} from '@features/organization/models';
import { createInterventionCapabilities } from '../intervention-capabilities.utils';

const ORGANIZATION_ID = 'org-1';
const MEMBER_ID = 'member-1';
const RESPONSIBLE_IRI = `/api/organizations/${ORGANIZATION_ID}/members/${MEMBER_ID}`;

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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  } as InterventionOutput;
}

interface CapabilityHarness {
  readonly capabilities: InterventionCapabilities;
  readonly intervention: WritableSignal<InterventionOutput | null>;
  readonly memberId: WritableSignal<string | undefined>;
  readonly granted: WritableSignal<ReadonlySet<string>>;
  readonly scanSupported: WritableSignal<boolean>;
}

function buildHarness(
  intervention: InterventionOutput | null,
  permissions: readonly OrganizationPermissionName[] = [],
): CapabilityHarness {
  const interventionSignal = signal<InterventionOutput | null>(intervention);
  const memberId = signal<string | undefined>(MEMBER_ID);
  const granted = signal<ReadonlySet<string>>(new Set(permissions));
  const scanSupported = signal<boolean>(false);

  return {
    capabilities: createInterventionCapabilities({
      intervention: interventionSignal,
      organizationId: signal(ORGANIZATION_ID),
      memberId,
      hasPermission: (permission) => granted().has(permission),
      scanSupported: () => scanSupported(),
    }),
    intervention: interventionSignal,
    memberId,
    granted,
    scanSupported,
  };
}

describe('createInterventionCapabilities', () => {
  it('should mirror the four organization permissions', () => {
    const { capabilities, granted } = buildHarness(buildIntervention());

    expect(capabilities.canPlan()).toBe(false);
    expect(capabilities.canExecute()).toBe(false);
    expect(capabilities.canReview()).toBe(false);
    expect(capabilities.canPublish()).toBe(false);

    granted.set(
      new Set([
        ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN,
        ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE,
        ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW,
        ORGANIZATION_PERMISSION.INTERVENTIONS_PUBLISH,
      ]),
    );

    expect(capabilities.canPlan()).toBe(true);
    expect(capabilities.canExecute()).toBe(true);
    expect(capabilities.canReview()).toBe(true);
    expect(capabilities.canPublish()).toBe(true);
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

  it('should gate submission on the responsible identity', () => {
    const { capabilities, intervention, memberId } = buildHarness(
      buildIntervention({ responsible: RESPONSIBLE_IRI }),
    );

    expect(capabilities.canSubmit()).toBe(true);

    memberId.set('someone-else');
    expect(capabilities.canSubmit()).toBe(false);

    memberId.set(undefined);
    expect(capabilities.canSubmit()).toBe(false);

    memberId.set(MEMBER_ID);
    intervention.set(buildIntervention({ responsible: null }));
    expect(capabilities.canSubmit()).toBe(false);
  });

  it.each([
    ['draft', true, true, true, true, true],
    ['planned', true, false, true, true, false],
    ['in_progress', true, false, false, true, false],
    ['changes_requested', true, false, false, true, false],
    ['submitted', false, false, false, true, false],
    ['published', false, false, false, false, false],
    ['abandoned', false, false, false, false, false],
  ] as const)(
    'should apply the mutability matrix in %s',
    (status, schedule, site, responsible, details, addWorkItem) => {
      const { capabilities } = buildHarness(
        buildIntervention({ status: status as InterventionStatus }),
        [ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN],
      );

      expect(capabilities.canEditSchedule()).toBe(schedule);
      expect(capabilities.canEditSite()).toBe(site);
      expect(capabilities.canEditResponsible()).toBe(responsible);
      expect(capabilities.canEditDetails()).toBe(details);
      expect(capabilities.canAddWorkItem()).toBe(addWorkItem);
    },
  );

  it('should deny the whole mutability matrix without the plan permission', () => {
    const { capabilities } = buildHarness(buildIntervention());

    expect(capabilities.canEditSchedule()).toBe(false);
    expect(capabilities.canEditSite()).toBe(false);
    expect(capabilities.canEditResponsible()).toBe(false);
    expect(capabilities.canEditDetails()).toBe(false);
    expect(capabilities.canAddWorkItem()).toBe(false);
  });

  it('should offer skip and scan only during execution', () => {
    const { capabilities, intervention, scanSupported } = buildHarness(
      buildIntervention({ status: 'in_progress', allowedTransitions: ['submitted', 'abandoned'] }),
      [ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE],
    );

    expect(capabilities.canSkipWorkItem()).toBe(true);
    expect(capabilities.canScanWorkItem()).toBe(false);

    scanSupported.set(true);
    expect(capabilities.canScanWorkItem()).toBe(true);

    intervention.set(buildIntervention({ status: 'draft' }));
    expect(capabilities.canSkipWorkItem()).toBe(false);
    expect(capabilities.canScanWorkItem()).toBe(false);
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

  it.each([
    ['draft', ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN, true],
    ['draft', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, false],
    ['abandoned', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, true],
    ['abandoned', ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN, false],
    ['planned', ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN, false],
  ] as const)(
    'should gate outright deletion in %s on the %s permission',
    (status, permission, expected) => {
      const { capabilities } = buildHarness(
        buildIntervention({ status: status as InterventionStatus }),
        [permission],
      );

      expect(capabilities.canDeleteIntervention()).toBe(expected);
    },
  );

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

  it('should hide withdrawal from members other than the responsible', () => {
    const { capabilities, memberId } = buildHarness(
      buildIntervention({
        status: 'submitted',
        responsible: RESPONSIBLE_IRI,
        allowedTransitions: ['changes_requested', 'in_progress'],
      }),
      [ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, ORGANIZATION_PERMISSION.INTERVENTIONS_REVIEW],
    );

    expect(capabilities.transitionTargets()).toEqual(['changes_requested', 'in_progress']);

    memberId.set('someone-else');
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

  it.each([
    ['draft', ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN, true],
    ['draft', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, false],
    ['in_progress', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, true],
    ['submitted', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, false],
    ['published', ORGANIZATION_PERMISSION.INTERVENTIONS_PLAN, false],
    ['abandoned', ORGANIZATION_PERMISSION.INTERVENTIONS_EXECUTE, false],
  ] as const)(
    'should gate attachment management in %s on the %s permission',
    (status, permission, expected) => {
      const { capabilities } = buildHarness(
        buildIntervention({ status: status as InterventionStatus }),
        [permission],
      );

      expect(capabilities.canManageAttachments()).toBe(expected);
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
