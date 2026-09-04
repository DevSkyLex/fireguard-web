import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import { organizationMemberOutput } from '../support/fixtures/member-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The board holds seven fixed status columns — always wider than the content
 * column — so it lives or dies on filling its height and reaching the hidden
 * columns. The view controls precede the board, the columns stretch to
 * the track height, and the prev/next controls actually scroll a container whose
 * `scroll-behavior` no longer swallows programmatic scrolls.
 */

const STATUSES = [
  'draft',
  'planned',
  'in_progress',
  'submitted',
  'changes_requested',
  'published',
  'abandoned',
] as const;

async function mockBoard(api: ApiMock): Promise<void> {
  const today = new Date();
  const dueAt = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 2,
    12,
  ).toISOString();
  await api.mockAuthenticatedSession();
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionList(
    E2E_ORGANIZATION_ID,
    STATUSES.flatMap((status, s) =>
      Array.from({ length: s === 0 ? 8 : 2 }, (_, i) =>
        interventionOutput({
          id: `bs-${s}-${i}`,
          '@id': `/api/interventions/bs-${s}-${i}`,
          number: 100 + s * 10 + i,
          name:
            i === 0
              ? 'Inspection des équipements de sécurité incendie dans les circulations techniques du bâtiment principal'
              : `Riser inspection ${status} ${i}`,
          status,
          priority: i === 1 ? 'high' : 'normal',
          responsible:
            i === 1 ? `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-1` : null,
          dueAt: i === 1 ? dueAt : null,
        }),
      ),
    ),
  );
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [organizationMemberOutput()]);
  await api.mockInterventionWorkItems(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionChanges(E2E_ORGANIZATION_ID, []);
}

const scrollLeft = (page: Page): Promise<number> =>
  page.evaluate(() =>
    Math.round((document.querySelector('[data-testid="board"]') as HTMLElement).scrollLeft),
  );

test.describe('Interventions board — fills its column and scrolls to the hidden columns', () => {
  test('starts with view controls and scrolls its columns both ways without metric cards', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 812 });
    const api = new ApiMock(page);
    await mockBoard(api);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=board`);

    const board = page.getByTestId('board');
    await expect(board).toBeVisible();

    await expect(page.getByTestId('intervention-kpi-strip')).toHaveCount(0);
    await expect(page.getByTestId('intervention-statistics-analysis-trigger')).toHaveCount(0);

    await expect(page.getByTestId('board-scroll-right')).toBeEnabled();
    await expect(
      page.getByTestId('board-column').getByRole('heading').locator('ng-icon svg'),
    ).toHaveCount(7);
    await expectNoHorizontalOverflow(page);

    const geo = await page.evaluate(() => {
      const track = document.querySelector('[data-testid="board"]') as HTMLElement;
      const column = document.querySelector('[data-testid="board-column"]') as HTMLElement;
      return {
        trackH: Math.round(track.getBoundingClientRect().height),
        colH: Math.round(column.getBoundingClientRect().height),
        hidden: track.scrollWidth - track.clientWidth,
      };
    });
    expect(geo.colH).toBeGreaterThan(geo.trackH - 20);
    expect(geo.hidden).toBeGreaterThan(1000);

    const left = page.getByTestId('board-scroll-left');
    const right = page.getByTestId('board-scroll-right');
    await expect(left).toBeDisabled();
    await expect(right).toBeEnabled();

    const list = page.getByTestId('board-column-list').first();
    const vertical = await list.evaluate((element) => ({
      scroll: element.scrollHeight,
      client: element.clientHeight,
    }));
    expect(vertical.scroll).toBeGreaterThan(vertical.client);
    await list.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(page.getByTestId('board-column').first().getByRole('heading')).toBeInViewport();
    await list.evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.screenshot({
      path: 'e2e/artifacts/shared-board/desktop-light.png',
      animations: 'disabled',
    });
    await setDarkTheme(page.context(), 'http://localhost:4273');
    await page.reload();
    await expect(board).toBeVisible();
    await page.screenshot({
      path: 'e2e/artifacts/shared-board/desktop-dark.png',
      animations: 'disabled',
    });
    await right.click();
    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(200);
    await expect(left).toBeEnabled();

    await left.click();
    await expect.poll(() => scrollLeft(page)).toBeLessThan(50);
  });

  test('at 375 the board remains reachable below the view controls', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await mockBoard(api);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=board`);

    await expect(page.getByTestId('intervention-kpi-strip')).toHaveCount(0);
    const board = page.getByTestId('board');
    await expect.poll(async () => (await board.boundingBox())?.height ?? 0).toBeLessThan(600);
    await board.scrollIntoViewIfNeeded();
    await expect(board).toBeInViewport();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: 'e2e/artifacts/shared-board/mobile-light.png',
      animations: 'disabled',
    });
  });
});
