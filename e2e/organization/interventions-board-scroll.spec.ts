import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
} from '../support/fixtures/intervention-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * The board holds seven fixed status columns — always wider than the content
 * column — so it lives or dies on filling its height and reaching the hidden
 * columns. This spec proves the three structural fixes a unit test cannot: the
 * KPI strip and analysis are gone from the board tab (they belonged to the
 * list), the columns stretch to the track height instead of sitting in the top
 * third, and the prev/next controls actually scroll a container whose
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
  await api.mockAuthenticatedSession();
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionList(
    E2E_ORGANIZATION_ID,
    STATUSES.flatMap((status, s) =>
      Array.from({ length: 2 }, (_, i) =>
        interventionOutput({
          id: `bs-${s}-${i}`,
          '@id': `/api/interventions/bs-${s}-${i}`,
          number: 100 + s * 10 + i,
          name: `Riser inspection ${status} ${i}`,
          status,
        }),
      ),
    ),
  );
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionWorkItems(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionChanges(E2E_ORGANIZATION_ID, []);
}

const scrollLeft = (page: Page): Promise<number> =>
  page.evaluate(() =>
    Math.round(
      (document.querySelector('[data-testid="intervention-board"]') as HTMLElement).scrollLeft,
    ),
  );

test.describe('Interventions board — fills its column and scrolls to the hidden columns', () => {
  test('drops the list-only KPI strip and analysis, fills the height, and scrolls both ways', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 812 });
    const api = new ApiMock(page);
    await mockBoard(api);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=board`);

    const board = page.getByTestId('intervention-board');
    await expect(board).toBeVisible();

    // The summary belongs to the list, not the board.
    await expect(page.getByTestId('intervention-kpi-strip')).toHaveCount(0);
    await expect(page.getByTestId('intervention-statistics-analysis-trigger')).toHaveCount(0);

    await page.waitForTimeout(500); // let the flex layout settle

    const geo = await page.evaluate(() => {
      const track = document.querySelector('[data-testid="intervention-board"]') as HTMLElement;
      const column = document.querySelector(
        '[data-testid="intervention-board-column"]',
      ) as HTMLElement;
      return {
        trackH: Math.round(track.getBoundingClientRect().height),
        colH: Math.round(column.getBoundingClientRect().height),
        hidden: track.scrollWidth - track.clientWidth,
      };
    });
    // Columns stretch to the track (minus the scrollbar gutter), not the top third.
    expect(geo.colH).toBeGreaterThan(geo.trackH - 16);
    expect(geo.hidden).toBeGreaterThan(1000);

    const left = page.getByTestId('intervention-board-scroll-left');
    const right = page.getByTestId('intervention-board-scroll-right');
    await expect(left).toBeDisabled();
    await expect(right).toBeEnabled();

    await right.click();
    await expect.poll(() => scrollLeft(page)).toBeGreaterThan(200);
    await expect(left).toBeEnabled();

    await left.click();
    await expect.poll(() => scrollLeft(page)).toBeLessThan(50);
  });

  test('at 375 the board is reachable without a KPI strip pushing it below the fold', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const api = new ApiMock(page);
    await mockBoard(api);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=board`);

    await expect(page.getByTestId('intervention-board')).toBeInViewport();
    await expect(page.getByTestId('intervention-kpi-strip')).toHaveCount(0);
  });
});
