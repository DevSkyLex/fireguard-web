/**
 * Intervention transport fixtures for the e2e suite, mirroring the backend
 * contract `InterventionOutput` maps to. Plain factory functions (like
 * `api-fixtures.ts`) so tests override fields via object spread.
 */

import { E2E_ORGANIZATION_ID } from './api-fixtures';

/** Intervention the Today page's work-queue e2e scenarios read into. */
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
  readonly allowedTransitions: readonly string[];
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
