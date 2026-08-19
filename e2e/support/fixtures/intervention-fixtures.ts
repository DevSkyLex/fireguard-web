/**
 * Intervention transport fixtures for the e2e suite, mirroring the backend
 * contract `InterventionOutput` maps to. Plain factory functions (like
 * `api-fixtures.ts`) so tests override fields via object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** Intervention the Today page's work-queue e2e scenarios read into. */
export const E2E_INTERVENTION_ID = 'e2e-intervention-1';

/** Member id embedded in `currentOrganizationMemberProfileOutput` — the signed-in member every e2e session resolves to. */
export const E2E_MEMBER_ID = 'e2e-member-1';

/** The signed-in member's IRI inside {@link E2E_ORGANIZATION_ID}, matching `InterventionOutputFixture.responsible`/`participants`. */
export const E2E_MEMBER_IRI = `/api/organizations/${E2E_ORGANIZATION_ID}/members/${E2E_MEMBER_ID}`;

export interface InterventionOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organization: string;
  readonly number: number;
  readonly type: string;
  readonly name: string;
  readonly description: string | null;
  readonly status: string;
  readonly allowedTransitions: readonly string[];
  readonly allowedActions: Readonly<Record<string, boolean>>;
  readonly site: string | null;
  readonly responsible: string | null;
  readonly participants: readonly string[];
  readonly labels: readonly unknown[];
  readonly priority: string;
  readonly plannedStartAt: string | null;
  readonly dueAt: string | null;
  readonly reviewNote: string | null;
  readonly revision: number;
  readonly facilitiesCount: number;
  readonly equipmentCount: number;
  readonly inspectionsCount: number;
  readonly blockersCount: number;
  readonly workItemsCount: number;
  readonly completedWorkItemsCount: number;
  readonly proposedChangesCount: number;
  readonly commentsCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A `planned` intervention — the Today page's default work-queue row. */
export function interventionOutput(
  overrides: Partial<InterventionOutputFixture> = {},
): InterventionOutputFixture {
  return {
    '@id': `/api/interventions/${E2E_INTERVENTION_ID}`,
    '@type': 'Intervention',
    id: E2E_INTERVENTION_ID,
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    number: 101,
    type: 'site_setup',
    name: 'Check the riser',
    description: null,
    status: 'planned',
    allowedTransitions: ['in_progress', 'abandoned'],
    allowedActions: {
      canEditDetails: true,
      canEditSite: false,
      canEditResponsible: true,
      canEditPlanning: true,
      canMutateWorkItems: true,
      canMutateChanges: false,
      canAssignTeam: true,
      canManageAttachments: true,
      canSubmit: true,
      canWithdraw: false,
      canDelete: false,
      canPublish: false,
    },
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
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface InterventionLabelOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly organization: string;
  readonly name: string;
  readonly color: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** An organization-scoped intervention label — the list page's label filter option. */
export function interventionLabelOutput(
  overrides: Partial<InterventionLabelOutputFixture> = {},
): InterventionLabelOutputFixture {
  return {
    '@id': '/api/intervention-labels/e2e-label-1',
    '@type': 'InterventionLabel',
    id: 'e2e-label-1',
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    name: 'Compliance',
    color: '#2563eb',
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface InterventionWorkItemOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly intervention: string;
  readonly action: string;
  readonly target: string | null;
  readonly resultResource: string | null;
  readonly assignee: string | null;
  readonly source: string;
  readonly status: string;
  readonly required: boolean;
  readonly skipReason: string | null;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A `planned`, required work item — the field-work checklist's default row. */
export function interventionWorkItemOutput(
  overrides: Partial<InterventionWorkItemOutputFixture> = {},
): InterventionWorkItemOutputFixture {
  return {
    '@id': `/api/intervention-work-items/e2e-work-item-1`,
    '@type': 'InterventionWorkItem',
    id: 'e2e-work-item-1',
    intervention: `/api/interventions/${E2E_INTERVENTION_ID}`,
    action: 'site_setup',
    target: null,
    resultResource: null,
    assignee: null,
    source: 'planned',
    status: 'planned',
    required: true,
    skipReason: null,
    revision: 1,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface InterventionIssueOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly severity: string;
  readonly resource: string;
  readonly field: string | null;
  readonly message: string;
}

/** A publication `blocker` issue pointing at the intervention resource, resolving to the field-work section. */
export function interventionIssueOutput(
  overrides: Partial<InterventionIssueOutputFixture> = {},
): InterventionIssueOutputFixture {
  return {
    '@id': '/api/intervention-issues/e2e-issue-1',
    '@type': 'InterventionIssue',
    severity: 'blocker',
    resource: `/api/interventions/${E2E_INTERVENTION_ID}`,
    field: null,
    message: 'One required work item is still open.',
    ...overrides,
  };
}
