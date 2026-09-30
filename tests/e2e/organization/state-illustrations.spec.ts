import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { collectConsoleErrors, expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { expectIllustration, mockEmptyResources } from '../support/helpers/resource-empty-states';
import type { ApiMock } from '../support/mocks/api-mock';
import { EquipmentsPage } from '../support/pages/equipments.page';

/**
 * Constant SHOTS
 * @description Captures land in `FG_SCREENSHOT_DIR` when a run names one, else under the ignored
 * `tests/e2e/artifacts/illustrations/`, namespaced by project so Chromium and WebKit never overwrite.
 */
const SHOTS = process.env['FG_SCREENSHOT_DIR'] ?? 'tests/e2e/artifacts/illustrations';

/**
 * Type Scenario
 * @description One empty region, the extra hermetic reads it needs and the artwork it must show.
 */
interface Scenario {
  readonly slug: string;
  readonly path: string;
  readonly artworks: ReadonlyArray<{
    catalog: 'resource' | 'state';
    name: string;
    size?: 'sm' | 'md';
    desktopOnly?: boolean;
  }>;
  readonly arrange?: (api: ApiMock, page: Page) => Promise<void>;
  readonly act?: (page: Page) => Promise<void>;
  readonly tolerated?: RegExp;
}

const ORGANIZATION = `/organizations/${E2E_ORGANIZATION_ID}`;

const SCENARIOS: readonly Scenario[] = [
  {
    slug: 'approvals-all-clear',
    path: `${ORGANIZATION}/approvals`,
    artworks: [{ catalog: 'state', name: 'all-clear' }],
    arrange: async (api) => {
      await api.mockApprovalRequestList(E2E_ORGANIZATION_ID, []);
      await api.mockApprovalActionTypes([]);
    },
  },
  {
    slug: 'audit-empty',
    path: `${ORGANIZATION}/audit`,
    artworks: [{ catalog: 'resource', name: 'audit' }],
    arrange: (api) => api.mockAuditEventList(E2E_ORGANIZATION_ID, []),
  },
  {
    slug: 'audit-forbidden',
    path: `${ORGANIZATION}/audit`,
    artworks: [{ catalog: 'state', name: 'access-denied' }],
    tolerated: /403/,
    arrange: async (_api, page) => {
      await page.route(/\/api\/organizations\/[^/]+\/audit-events(\?.*)?$/, (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/ld+json',
          body: JSON.stringify({ '@type': 'Error', status: 403, title: 'Access Denied' }),
        }),
      );
    },
  },
  {
    slug: 'imports-empty',
    path: `${ORGANIZATION}/imports`,
    artworks: [{ catalog: 'resource', name: 'import' }],
    arrange: (api) => api.mockImportJobList([]),
  },
  {
    slug: 'equipment-search-miss',
    path: `${ORGANIZATION}/equipments`,
    artworks: [{ catalog: 'state', name: 'no-results' }],
    act: async (page) => {
      await new EquipmentsPage(page).search.fill('no-such-extinguisher');
    },
  },
  {
    slug: 'members-invitations',
    path: `${ORGANIZATION}/members`,
    artworks: [
      { catalog: 'resource', name: 'member' },
      { catalog: 'resource', name: 'invitation' },
    ],
  },
  {
    slug: 'members-roles',
    path: `${ORGANIZATION}/members`,
    artworks: [{ catalog: 'resource', name: 'role' }],
    arrange: (api) => api.mockOrganizationPermissions(E2E_ORGANIZATION_ID, []),
    act: async (page) => {
      await page.getByTestId('organization-members-tab-roles').click();
    },
  },
  {
    slug: 'channels-empty',
    path: `${ORGANIZATION}/channels`,
    artworks: [
      { catalog: 'resource', name: 'channel', size: 'sm' },
      { catalog: 'state', name: 'no-selection', desktopOnly: true },
    ],
    arrange: (api) => api.mockChannelList([]),
  },
  {
    slug: 'account-security',
    path: '/account/security',
    artworks: [
      { catalog: 'resource', name: 'session' },
      { catalog: 'resource', name: 'device' },
    ],
    arrange: (api) => api.mockAccountVisualReads(),
  },
];

test.describe('Illustrated generic and resource empty states', () => {
  for (const scenario of SCENARIOS) {
    for (const [theme, width] of [
      ['light', 1280],
      ['dark', 375],
    ] as const) {
      test(`shows the ${scenario.slug} artwork at ${width}px in ${theme} mode`, async ({
        page,
        context,
        baseURL,
      }, testInfo) => {
        await context.addCookies([
          { name: 'theme-preference', value: theme, url: baseURL ?? 'http://localhost:4273' },
        ]);
        await page.setViewportSize({ width, height: width === 375 ? 812 : 900 });
        const errors = collectConsoleErrors(page);
        const api = await mockEmptyResources(page);
        await scenario.arrange?.(api, page);
        await page.goto(scenario.path);
        await scenario.act?.(page);
        await Promise.all(
          scenario.artworks
            .filter((artwork) => width > 375 || !artwork.desktopOnly)
            .map(({ desktopOnly: _desktop, ...artwork }) =>
              expectIllustration(page, { ...artwork, theme }),
            ),
        );
        await expectNoHorizontalOverflow(page);
        await page.screenshot({
          path: `${SHOTS}/${testInfo.project.name}/${scenario.slug}-${theme}-${width}.png`,
          fullPage: true,
          animations: 'disabled',
        });
        expect(errors.filter((error) => !scenario.tolerated?.test(error))).toEqual([]);
      });
    }
  }
});
