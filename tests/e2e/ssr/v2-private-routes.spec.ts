import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test, type APIRequestContext, type Browser } from '@playwright/test';
import { maintenanceReportFixture } from '@features/organization/features/maintenance-costs/models/report/testing/maintenance-report.fixture';
import { E2E_ACCESS_TOKEN, hydraCollection } from '../support/fixtures/api-fixtures';
import { sourceFingerprint } from '../support/helpers/visual-run';

const appOrigin = 'http://127.0.0.1:4274';
const apiOrigin = 'https://127.0.0.1:4275';
const organizationPath = '/api/organizations/e2e-org-1';
const interventionId = '12345678-1234-4234-8234-123456789abc';
const privateMarker = 'SSR-private-maintenance-cost-731234';
const run = process.env['FG_SSR_RUN'] ?? 'current';
if (!/^[a-zA-Z0-9_-]+$/.test(run)) throw new Error('Invalid SSR run name.');
const evidenceRoot = resolve('tests/e2e/artifacts/ssr-smoke', run);

/** Requests recorded by the server-side local HTTPS stub. */
interface RecordedRequest {
  readonly method: string;
  readonly path: string;
  readonly query: string;
  readonly status: number;
  readonly origin: string | null;
}

/** Every registered private fixture names one exact path and complete query. */
interface PrivateFixture {
  readonly method: 'GET';
  readonly path: string;
  readonly query?: Readonly<Record<string, string>>;
  readonly body: object;
}

/** A private route and its only permitted initial business read. */
interface PrivateScenario {
  readonly name: string;
  readonly path: string;
  readonly title: string;
  readonly settledText: string;
  readonly settledTable?: string;
  readonly fixture: PrivateFixture;
  readonly visibleFilterFixtures?: readonly PrivateFixture[];
  readonly fixedTime?: string;
}

/** Maintenance workspaces remain private when reached directly from an HTTP request. */
const scenarios: readonly PrivateScenario[] = [
  {
    name: 'economic-report',
    path: 'maintenance-costs/reports',
    title: 'Economic pilotage',
    settledText: 'Entrance extinguisher — EX-001',
    settledTable: 'Economic cost allocations',
    fixedTime: '2026-10-07T12:00:00Z',
    fixture: {
      method: 'GET',
      path: `${organizationPath}/maintenance-cost/reports`,
      query: {
        from: '2026-09-08',
        to: '2026-10-07',
        groupBy: 'equipment',
        page: '1',
        itemsPerPage: '30',
      },
      body: {
        ...maintenanceReportFixture({
          organizationId: 'e2e-org-1',
          from: '2026-09-08',
          to: '2026-10-07',
        }),
        privateMarker,
      },
    },
  },
  {
    name: 'maintenance-exports',
    path: 'maintenance-exports',
    title: 'Maintenance exports',
    settledText: 'No retained export yet',
    fixture: {
      method: 'GET',
      path: `${organizationPath}/maintenance-exports`,
      query: { page: '1', itemsPerPage: '30' },
      body: {
        ...hydraCollection([], { '@id': `${organizationPath}/maintenance-exports` }),
        privateMarker,
      },
    },
    visibleFilterFixtures: [
      {
        method: 'GET',
        path: `${organizationPath}/maintenance-export-references`,
        query: { page: '1', itemsPerPage: '30' },
        body: {
          ...hydraCollection([], { '@id': `${organizationPath}/maintenance-export-references` }),
          privateMarker,
        },
      },
    ],
  },
  {
    name: 'repair-requests',
    path: 'service-requests',
    title: 'Repair requests',
    settledText: 'No maintenance requests',
    fixture: {
      method: 'GET',
      path: `${organizationPath}/service-requests`,
      query: { page: '1', itemsPerPage: '30' },
      body: {
        ...hydraCollection([], { '@id': `${organizationPath}/service-requests` }),
        privateMarker,
      },
    },
  },
  {
    name: 'inventory',
    path: 'inventory/balances',
    title: 'Stock',
    settledText: 'No stock records in this view',
    fixture: {
      method: 'GET',
      path: `${organizationPath}/inventory-balances`,
      query: { page: '1', itemsPerPage: '20' },
      body: {
        ...hydraCollection([], { '@id': `${organizationPath}/inventory-balances` }),
        privateMarker,
      },
    },
    visibleFilterFixtures: ['inventory-parts', 'inventory-warehouses'].map((endpoint) => ({
      method: 'GET',
      path: `${organizationPath}/${endpoint}`,
      query: { page: '1', itemsPerPage: '50', archived: 'false' },
      body: {
        ...hydraCollection([], { '@id': `${organizationPath}/${endpoint}` }),
        privateMarker,
      },
    })),
  },
  {
    name: 'procurement',
    path: 'procurement',
    title: 'Purchasing and receipts',
    settledText: 'No purchase orders match this view',
    fixture: {
      method: 'GET',
      path: `${organizationPath}/procurement/orders`,
      query: { page: '1', itemsPerPage: '30' },
      body: {
        ...hydraCollection([], { '@id': `${organizationPath}/procurement/orders` }),
        privateMarker,
      },
    },
  },
  {
    name: 'maintenance-costs',
    path: `maintenance-costs?interventionId=${interventionId}`,
    title: 'Maintenance costs',
    settledText: privateMarker,
    settledTable: 'Private maintenance cost contributions',
    fixture: {
      method: 'GET',
      path: `${organizationPath}/interventions/${interventionId}/costs`,
      body: {
        '@id': `${organizationPath}/interventions/${interventionId}/costs`,
        '@type': 'MaintenanceCost',
        id: interventionId,
        organizationId: 'e2e-org-1',
        interventionId,
        currency: 'EUR',
        planningRevision: 0,
        planningEditable: false,
        plannedBudget: null,
        estimatedMinutes: null,
        resources: [],
        current: {
          total: '731234.567891',
          knownTotal: '731234.567891',
          complete: true,
          items: [
            {
              id: 'ssr-private-expense',
              kind: 'expense',
              sourceId: 'ssr-private-expense',
              amount: '731234.567891',
              currency: 'EUR',
              description: privateMarker,
              occurredAt: new Date().toISOString(),
            },
          ],
        },
        frozen: null,
      },
    },
  },
];

/** Identifies private maintenance families independently of the currently registered fixtures. */
function isPrivateRead(entry: RecordedRequest): boolean {
  return (
    entry.method === 'GET' &&
    /^\/api\/organizations\/[^/]+\/(?:service-requests|inventory-[^/]+|procurement|maintenance-cost|maintenance-exports|maintenance-export-[^/]+|interventions\/[^/]+\/costs)(?:\/|$)/.test(
      entry.path,
    )
  );
}

/** Reads cumulative requests without resetting evidence from earlier scenarios. */
async function ledger(request: APIRequestContext): Promise<{
  requests: RecordedRequest[];
  unexpected: object[];
}> {
  return (await request.get(`${apiOrigin}/__harness/requests`)).json();
}

/** Replaces only case-specific exact paths; unknown routes keep the stub's failure ledger. */
async function registerFixtures(
  request: APIRequestContext,
  fixtures: readonly PrivateFixture[],
): Promise<void> {
  const response = await request.post(`${apiOrigin}/__harness/fixtures`, {
    data: { fixtures },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ registered: fixtures.length });
}

/** Creates an authenticated browser context isolated from any real API or persistent session. */
async function privateContext(browser: Browser) {
  const context = await browser.newContext({
    baseURL: appOrigin,
    ignoreHTTPSErrors: true,
    serviceWorkers: 'block',
  });
  await context.addCookies([
    {
      name: 'refresh_token',
      value: 'ssr-harness-session',
      url: apiOrigin,
      secure: true,
      sameSite: 'None',
    },
  ]);
  await context.route('**/*', async (route) => {
    const origin = new URL(route.request().url()).origin;
    if ([appOrigin, apiOrigin].includes(origin)) return route.continue();
    await route.abort();
    expect.soft(origin, 'Private SSR checks must stay in the local harness.').toBe(appOrigin);
  });
  return context;
}

/** Checks the raw response before any browser JavaScript can access private collections. */
function assertPrivateHtml(html: string): void {
  expect(html).toContain('<app-root></app-root>');
  expect(html).not.toMatch(/\sngh="/);
  expect(html).not.toContain(E2E_ACCESS_TOKEN);
  expect(html).not.toContain(privateMarker);
  expect(html).not.toContain('731234.567891');
  const serializedState = html.match(
    /<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/,
  )?.[1];
  if (serializedState)
    expect(serializedState).not.toMatch(
      /accessToken|refresh_token|planningRevision|knownTotal|inventory-balances|service-requests|procurement\/orders/,
    );
}

for (const scenario of scenarios) {
  test(`keeps ${scenario.name} private in raw SSR and reads its authorized data once in the browser`, async ({
    browser,
    request,
  }, info) => {
    const fixtures = [scenario.fixture, ...(scenario.visibleFilterFixtures ?? [])];
    await registerFixtures(request, fixtures);
    const context = await privateContext(browser);
    try {
      const path = `/organizations/e2e-org-1/${scenario.path}`;
      const before = await ledger(request);
      const response = await context.request.get(path);
      expect(response.status()).toBe(200);
      assertPrivateHtml(await response.text());
      const afterServer = await ledger(request);
      const serverReads = afterServer.requests.slice(before.requests.length);
      expect(serverReads.filter(isPrivateRead)).toEqual([]);
      expect(afterServer.unexpected).toEqual([]);

      const page = await context.newPage();
      if (scenario.fixedTime) await page.clock.setFixedTime(new Date(scenario.fixedTime));
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          /NG05|hydration|TypeError|ReferenceError/i.test(message.text())
        )
          errors.push(message.text());
      });
      await page.goto(path);
      await expect(page.getByRole('heading', { name: scenario.title, exact: true })).toBeVisible();
      const settledSurface = scenario.settledTable
        ? page.getByRole('table', { name: scenario.settledTable, exact: true })
        : page;
      await expect(settledSurface.getByText(scenario.settledText, { exact: true })).toBeVisible();
      await expect(page.locator('[ngh]')).toHaveCount(0);
      await expect(page.getByRole('alert')).toHaveCount(0);

      const afterBrowser = await ledger(request);
      const browserReads = afterBrowser.requests.slice(afterServer.requests.length);
      const privateReads = browserReads.filter(isPrivateRead);
      expect(privateReads.filter((entry) => entry.path === scenario.fixture.path)).toEqual([
        expect.objectContaining({
          method: 'GET',
          path: scenario.fixture.path,
          status: 200,
          origin: appOrigin,
        }),
      ]);
      expect(privateReads.map((entry) => entry.path).toSorted()).toEqual(
        fixtures.map((fixture) => fixture.path).toSorted(),
      );
      for (const fixture of scenario.visibleFilterFixtures ?? [])
        expect(privateReads.filter((entry) => entry.path === fixture.path)).toEqual([
          expect.objectContaining({ method: 'GET', status: 200, origin: appOrigin }),
        ]);
      expect(afterBrowser.unexpected).toEqual([]);
      expect(errors).toEqual([]);
      const directory = resolve(evidenceRoot, info.project.name);
      await mkdir(directory, { recursive: true });
      await writeFile(
        resolve(directory, `v2-private-${scenario.name}.json`),
        JSON.stringify(
          {
            runtimeSource: sourceFingerprint(),
            build: await readFile(resolve(evidenceRoot, 'server/build.json'), 'utf8').then(
              JSON.parse,
            ),
            path,
            serverReads,
            browserReads,
            errors,
          },
          null,
          2,
        ),
      );
    } finally {
      await context.close();
      await registerFixtures(request, []);
    }
  });
}

test('waits for an explicit financial dossier or settings choice before any maintenance-cost read', async ({
  browser,
  request,
}) => {
  await registerFixtures(request, []);
  const context = await privateContext(browser);
  try {
    const before = await ledger(request);
    const path = '/organizations/e2e-org-1/maintenance-costs';
    const response = await context.request.get(path);
    expect(response.status()).toBe(200);
    assertPrivateHtml(await response.text());
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.getByTestId('maintenance-costs-page')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Choose an intervention', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: 'Intervention costs', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('alert')).toHaveCount(0);
    const after = await ledger(request);
    expect(after.requests.slice(before.requests.length).filter(isPrivateRead)).toEqual([]);
    expect(after.unexpected).toEqual([]);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
