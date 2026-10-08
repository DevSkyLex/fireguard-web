import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, type Page, type Route, type TestInfo } from '@playwright/test';
import type {
  CreateMaintenanceExpenseInput,
  MaintenanceCostOutput,
  WriteMaintenanceCostPlanningInput,
} from '@features/organization/features/maintenance-costs/models';
import { maintenanceCostFixture } from '@features/organization/features/maintenance-costs/models/maintenance-cost/testing/maintenance-cost.fixture';
import {
  ALL_ORGANIZATION_PERMISSIONS,
  E2E_ORGANIZATION_ID,
  hydraCollection,
} from '../fixtures/api-fixtures';
import { acceptedOrganizationMemberOutput } from '../fixtures/invitation-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from './appearance';

export const MAINTENANCE_COST_INTERVENTION_ID = '810e8400-e29b-41d4-a716-446655810001';
export const MAINTENANCE_COST_EXPENSE_ID = '810e8400-e29b-41d4-a716-446655810002';
export const MAINTENANCE_COST_MEMBER_ID = '810e8400-e29b-41d4-a716-446655810003';
export const MAINTENANCE_COST_URL = `/organizations/${E2E_ORGANIZATION_ID}/maintenance-costs?interventionId=${MAINTENANCE_COST_INTERVENTION_ID}`;
export interface MaintenanceCostMockState {
  dossier: MaintenanceCostOutput;
  readonly expenses: CreateMaintenanceExpenseInput[];
  readonly preparations: { body: WriteMaintenanceCostPlanningInput; ifMatch: string | undefined }[];
  readonly currencyReads: string[];
  readonly rateReads: string[];
  committedExpenses: number;
}
async function json(route: Route, body: unknown): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/ld+json',
    body: JSON.stringify(body),
  });
}

/** Dedicated finance mocks compose the authenticated safety net; no real backend is contacted. */
export async function installMaintenanceCosts(
  page: Page,
  options: {
    readonly closed?: boolean;
    readonly loseExpenseReply?: boolean;
    readonly readonly?: boolean;
  } = {},
): Promise<MaintenanceCostMockState> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: [
      ...ALL_ORGANIZATION_PERMISSIONS.filter(
        (value) => !value.startsWith('organization.maintenance_cost.'),
      ),
      'organization.maintenance_cost.read',
      ...(options.readonly ? [] : ['organization.maintenance_cost.manage']),
    ],
  });
  const member = acceptedOrganizationMemberOutput({
    id: MAINTENANCE_COST_MEMBER_ID,
    displayName: 'Alex Martin',
    firstName: 'Alex',
    lastName: 'Martin',
  });
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [member]);
  const contribution = {
    id: `expense:${MAINTENANCE_COST_EXPENSE_ID}`,
    sourceId: MAINTENANCE_COST_EXPENSE_ID,
    kind: 'expense' as const,
    description:
      'External repair of the entrance extinguisher pressure gauge, including a documented return visit',
    currency: 'EUR',
    amount: '10.000000',
    occurredAt: '2025-01-15T12:34:56Z',
    workItemId: null,
  };
  const path = `/api/organizations/${E2E_ORGANIZATION_ID}/interventions/${MAINTENANCE_COST_INTERVENTION_ID}/costs`;
  const original = maintenanceCostFixture({
    '@id': path,
    id: MAINTENANCE_COST_INTERVENTION_ID,
    organizationId: E2E_ORGANIZATION_ID,
    interventionId: MAINTENANCE_COST_INTERVENTION_ID,
    planningEditable: !options.closed,
    plannedBudget: options.closed ? '20.000000' : null,
    current: {
      total: null,
      knownTotal: '10.000000',
      complete: false,
      items: [
        contribution,
        {
          id: 'time:unknown',
          sourceId: 'unknown-time',
          kind: 'time',
          description: 'Recorded technician time awaiting its hourly rate',
          currency: 'EUR',
          amount: null,
          occurredAt: '2025-01-15T12:34:56Z',
        },
      ],
    },
    frozen: options.closed
      ? {
          version: 1,
          capturedAt: '2025-01-16T12:00:00Z',
          publicationId: 'closure',
          interventionRevision: 8,
          currency: 'EUR',
          plannedBudget: '20.000000',
          estimatedMinutes: 60,
          resources: [],
          total: '10.000000',
          knownTotal: '10.000000',
          complete: true,
          items: [contribution],
        }
      : null,
  });
  const state: MaintenanceCostMockState = {
    dossier: original,
    expenses: [],
    preparations: [],
    currencyReads: [],
    rateReads: [],
    committedExpenses: 0,
  };
  const receipts = new Map<string, CreateMaintenanceExpenseInput>();
  await page.route(
    new RegExp(`${path.replaceAll('/', '\\/')}(?:\\/(?:planning|expenses))?$`),
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (request.method() === 'GET') {
        await json(route, state.dossier);
        return;
      }
      if (url.pathname.endsWith('/planning')) {
        const attempt = {
          body: request.postDataJSON() as WriteMaintenanceCostPlanningInput,
          ifMatch: request.headers()['if-match'],
        };
        state.preparations.push(attempt);
        expect(attempt.ifMatch).toBe(`"revision-${state.dossier.planningRevision}"`);
        state.dossier = {
          ...state.dossier,
          ...attempt.body,
          resources: attempt.body.resources ?? [],
          planningRevision: state.dossier.planningRevision + 1,
        };
        await json(route, state.dossier);
        return;
      }
      if (url.pathname.endsWith('/expenses')) {
        const body = request.postDataJSON() as CreateMaintenanceExpenseInput;
        state.expenses.push(body);
        const previous = receipts.get(body.clientId);
        if (previous) {
          expect(body).toEqual(previous);
          await json(route, state.dossier);
          return;
        }
        receipts.set(body.clientId, body);
        state.committedExpenses++;
        state.dossier = {
          ...state.dossier,
          current: {
            ...state.dossier.current,
            knownTotal: '12.123456',
            items: [
              ...state.dossier.current.items,
              {
                id: `expense:${body.clientId}`,
                kind: 'expense',
                sourceId: body.clientId,
                description: body.description,
                currency: 'EUR',
                amount: body.amount,
                occurredAt: body.incurredAt,
                correctionOf: body.adjustmentOf
                  ? `expense:${body.adjustmentOf}`
                  : options.closed
                    ? 'publication:closure'
                    : null,
                workItemId: body.workItemId ?? null,
              },
            ],
          },
        };
        if (options.loseExpenseReply && state.committedExpenses === 1) {
          await route.abort('failed');
          return;
        }
        await json(route, state.dossier);
        return;
      }
      await route.fallback();
    },
  );
  const financial = `/api/organizations/${E2E_ORGANIZATION_ID}/maintenance-cost`;
  await page.route(new RegExp(financial + '/currency$'), async (route) => {
    state.currencyReads.push(route.request().method());
    await json(route, {
      organizationId: E2E_ORGANIZATION_ID,
      currency: 'EUR',
      locked: !!options.closed,
    });
  });
  await page.route(new RegExp(financial + '/rates(?:\\?.*)?$'), async (route) => {
    state.rateReads.push(route.request().url());
    await json(
      route,
      hydraCollection([
        {
          '@id': financial + '/rates/rate',
          '@type': 'MaintenanceRate',
          id: 'rate',
          memberId: MAINTENANCE_COST_MEMBER_ID,
          hourlyAmount: '9007199254740993.123456',
          currency: 'EUR',
          effectiveFrom: '2025-01-15',
          replayed: false,
        },
      ]),
    );
  });
  return state;
}

/** Retains actual browser images outside disposable runner output and measures responsive bounds. */
export async function captureMaintenanceCosts(
  page: Page,
  info: TestInfo,
  name: string,
): Promise<void> {
  const run = process.env['FG_VISUAL_RUN'] ?? 'review';
  if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('Invalid visual run name');
  const directory = join(
    'tests/e2e/artifacts/maintenance-costs',
    run,
    info.project.name.replaceAll(' ', '-'),
  );
  await mkdir(directory, { recursive: true });
  await expect(page.locator('vite-error-overlay')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(page.getByTestId('maintenance-costs-page'));
  const screenshot = join(directory, name + '.png');
  await page.screenshot({ path: screenshot, animations: 'disabled' });
  await info.attach(name, { path: screenshot, contentType: 'image/png' });
}
