/**
 * Intervention transport fixtures for the offline/sync e2e suite, mirroring the
 * backend contracts consumed by the intervention detail workspace. Plain factory
 * functions (like `api-fixtures.ts`) so specs override fields via object spread.
 *
 * Hydra collections use the plain `member` / `totalItems` keys (see
 * `hydraCollection` in `api-fixtures.ts`), not the `hydra:member` JSON-LD form.
 */

/** Organization id shared with `organizationOutput()` in `api-fixtures.ts`. */
export const E2E_ORGANIZATION_ID = 'e2e-org-1';

/** Intervention the offline suite deep-links into. */
export const E2E_INTERVENTION_ID = 'e2e-intervention-1';

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
  readonly allowedTransitions: ReadonlyArray<string>;
  readonly site: string | null;
  readonly responsible: string | null;
  readonly participants: ReadonlyArray<string>;
  readonly labels: ReadonlyArray<unknown>;
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

/**
 * A workspace-ready intervention. Defaults to `in_progress` (the execute phase)
 * so the Activity panel — and therefore the comment composer — is expanded on
 * load without needing a toggle click.
 */
export function interventionOutput(
  overrides: Partial<InterventionOutputFixture> = {},
): InterventionOutputFixture {
  return {
    '@id': `/api/interventions/${E2E_INTERVENTION_ID}`,
    '@type': 'Intervention',
    id: E2E_INTERVENTION_ID,
    organization: `/api/organizations/${E2E_ORGANIZATION_ID}`,
    number: 1,
    type: 'site_setup',
    name: 'E2E field intervention',
    description: null,
    status: 'in_progress',
    allowedTransitions: ['submitted', 'changes_requested'],
    site: null,
    responsible: null,
    participants: [],
    labels: [],
    priority: 'normal',
    plannedStartAt: null,
    dueAt: null,
    reviewNote: null,
    revision: 0,
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

export interface InterventionWorkItemOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly intervention: string;
  readonly action: string;
  readonly target: string | null;
  readonly targetSummary: string | null;
  readonly resultResource: string | null;
  readonly assignee: string | null;
  readonly assigneeProfile: unknown;
  readonly source: string;
  readonly status: string;
  readonly required: boolean;
  readonly skipReason: string | null;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A planned checklist work item, rendered as a togglable row in the execute phase. */
export function interventionWorkItemOutput(
  overrides: Partial<InterventionWorkItemOutputFixture> = {},
): InterventionWorkItemOutputFixture {
  return {
    '@id': '/api/intervention-work-items/e2e-work-item-1',
    '@type': 'InterventionWorkItem',
    id: 'e2e-work-item-1',
    intervention: `/api/interventions/${E2E_INTERVENTION_ID}`,
    action: 'inspect',
    target: null,
    targetSummary: null,
    resultResource: null,
    assignee: null,
    assigneeProfile: null,
    source: 'planned',
    status: 'planned',
    required: true,
    skipReason: null,
    revision: 0,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface InterventionActivityOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly intervention: string;
  readonly kind: 'comment' | 'system';
  readonly event: string;
  readonly actor: string | null;
  readonly body: string | null;
  readonly payload: unknown;
  readonly createdAt: string;
}

/** The activity entry the API returns when a queued comment is replayed. */
export function interventionActivityOutput(
  overrides: Partial<InterventionActivityOutputFixture> = {},
): InterventionActivityOutputFixture {
  return {
    '@id': `/api/interventions/${E2E_INTERVENTION_ID}/activities/e2e-activity-1`,
    '@type': 'InterventionActivity',
    id: 'e2e-activity-1',
    intervention: `/api/interventions/${E2E_INTERVENTION_ID}`,
    kind: 'comment',
    event: 'comment',
    actor: `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-1`,
    body: 'Synced comment',
    payload: null,
    createdAt: '2026-07-01T00:00:00+00:00',
    ...overrides,
  };
}

export interface InterventionChangeOutputFixture {
  readonly '@id': string;
  readonly '@type': string;
  readonly id: string;
  readonly intervention: string;
  readonly workItem: string | null;
  readonly resource: string;
  readonly patch: Record<string, unknown>;
  readonly status: string;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A proposed change awaiting publication, rendered in the review phase's diff list. */
export function interventionChangeOutput(
  overrides: Partial<InterventionChangeOutputFixture> = {},
): InterventionChangeOutputFixture {
  return {
    '@id': '/api/intervention-changes/e2e-change-1',
    '@type': 'InterventionChange',
    id: 'e2e-change-1',
    intervention: `/api/interventions/${E2E_INTERVENTION_ID}`,
    workItem: null,
    resource: 'equipment/e2e-equipment-1',
    patch: { status: 'operational' },
    status: 'proposed',
    revision: 0,
    createdAt: '2026-07-01T00:00:00+00:00',
    updatedAt: '2026-07-01T00:00:00+00:00',
    ...overrides,
  };
}

/**
 * One persisted outbox operation record, matching
 * `InterventionOutboxOperationFor` — used to seed IndexedDB directly for the
 * sync-engine scenarios (rebase, dependent-blocking, transient retry).
 */
export interface OutboxOperationFixture {
  readonly id: string;
  readonly interventionId: string;
  readonly type: string;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
  readonly status: 'pending' | 'conflict' | 'failed';
  readonly error: string | null;
}

export function outboxOperation(
  overrides: Partial<OutboxOperationFixture> & { readonly id: string },
): OutboxOperationFixture {
  return {
    interventionId: E2E_INTERVENTION_ID,
    type: 'intervention.update',
    payload: {},
    createdAt: '2026-07-01T00:00:00.000Z',
    status: 'pending',
    error: null,
    ...overrides,
  };
}
