import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  interventionOutput,
  interventionWorkItemOutput,
} from '../support/fixtures/intervention-fixtures';
import { E2E_INTERVENTION_ID } from '../support/fixtures/intervention-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { arrangeInterventionTables as arrange } from '../support/helpers/intervention-detail-tables';

test('removes a rejected change from Proposed without replacing the whole workspace', async ({
  page,
}) => {
  const path = await arrange(page, true, (api) =>
    api.mockInterventionChangeUpdate('table-change', {
      '@id': '/api/intervention-changes/table-change',
      '@type': 'InterventionChange',
      id: 'table-change',
      intervention: '/api/interventions/' + E2E_INTERVENTION_ID,
      resource: '/api/equipment/table-equipment',
      workItem: null,
      patch: { status: 'decommissioned' },
      status: 'rejected',
      revision: 2,
    }),
  );
  await page.goto(path + '?tab=changes');
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
  await page.getByTestId('intervention-change-reject').click();
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Resource changes' })).toBeVisible();
});

test('retains previous changes after a query error and retries unchanged criteria', async ({
  page,
}, info) => {
  const path = await arrange(page);
  let fail = true;
  await page.route(/\/api\/intervention-changes\?/, async (route) => {
    if (new URL(route.request().url()).searchParams.get('search') === 'decommissioned' && fail) {
      return route.fulfill({
        status: 500,
        contentType: 'application/ld+json',
        body: JSON.stringify({ title: 'Unavailable', detail: 'Retry this query.' }),
      });
    }
    return route.fallback();
  });
  await page.goto(path + '?tab=changes');
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
  await page.getByTestId('intervention-changes-search').fill('decommissioned');
  const alert = page.getByTestId('intervention-table-refresh-error');
  await expect(alert).toBeVisible();
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
  await page.screenshot({ path: info.outputPath('refresh-error.png'), animations: 'disabled' });
  fail = false;
  await alert.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByTestId('intervention-changes-search')).toHaveValue('decommissioned');
});

test('keeps an empty result on refresh failure and distinguishes search emptiness', async ({
  page,
}) => {
  const path = await arrange(page, true, (api) =>
    api.mockInterventionChanges(E2E_INTERVENTION_ID, []),
  );
  let fail = true;
  await page.route(/\/api\/intervention-changes\?/, (route) => {
    if (new URL(route.request().url()).searchParams.get('search') === 'empty-search' && fail)
      return route.fulfill({
        status: 500,
        contentType: 'application/ld+json',
        body: JSON.stringify({ detail: 'Query failed.' }),
      });
    return route.fallback();
  });
  await page.goto(path + '?tab=changes');
  await expect(page.getByText('No resource changes yet', { exact: true })).toBeVisible();
  await page.getByTestId('intervention-changes-search').fill('empty-search');
  const alert = page.getByTestId('intervention-table-refresh-error');
  await expect(alert).toBeVisible();
  await expect(page.locator('app-intervention-change-table hlm-skeleton')).toHaveCount(0);
  fail = false;
  await alert.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByText('No changes match this search', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear search', exact: true }).last().click();
  await expect(page.getByText('No resource changes yet', { exact: true })).toBeVisible();
});

test('offers a working retry after the initial Work query fails', async ({ page }) => {
  const path = await arrange(page);
  let fail = true;
  await page.route(/\/api\/intervention-work-items\?/, (route) => {
    if (new URL(route.request().url()).searchParams.has('status[]') && fail)
      return route.fulfill({
        status: 500,
        contentType: 'application/ld+json',
        body: JSON.stringify({ detail: 'Query failed.' }),
      });
    return route.fallback();
  });
  await page.goto(path);
  const error = page.locator('app-intervention-work-item-table [surfaceError]');
  await expect(error).toBeVisible();
  await expect(page.getByTestId('intervention-work-item-table-row')).toHaveCount(0);
  fail = false;
  await error.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByTestId('intervention-work-item-table-row')).toHaveCount(1);
  await expect(error).toHaveCount(0);
});

test('retries a failed next page and keeps earlier facility rows without duplicates', async ({
  page,
}) => {
  const path = await arrange(page, true, (api) =>
    api.mockInterventionFacilities(
      E2E_INTERVENTION_ID,
      Array.from({ length: 31 }, (_, index) =>
        facilityOutput({ id: 'facility-' + index, name: 'Facility ' + index }),
      ),
    ),
  );
  let fail = true;
  await page.route(/\/api\/facilities\?/, (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('intervention') && url.searchParams.get('page') === '2' && fail) {
      return route.fulfill({
        status: 500,
        contentType: 'application/ld+json',
        body: JSON.stringify({ detail: 'Page unavailable.' }),
      });
    }
    return route.fallback();
  });
  await page.goto(path + '?tab=facilities');
  const rows = page.getByTestId('intervention-facilities-table-row');
  await expect(rows).toHaveCount(30);
  await page.getByTestId('intervention-facilities-load-more').click();
  await expect(page.getByTestId('intervention-table-refresh-error')).toBeVisible();
  await expect(rows).toHaveCount(30);
  fail = false;
  await page
    .getByTestId('intervention-table-refresh-error')
    .getByRole('button', { name: 'Retry' })
    .click();
  await expect(rows).toHaveCount(31);
});

test('filters the saved workspace offline and restores API queries on reconnect', async ({
  page,
  context,
}) => {
  const path = await arrange(page);
  await page.goto(path);
  await expect(page.getByTestId('intervention-work-item-table-row')).toHaveCount(1);
  await page.getByRole('tab', { name: /^Changes/ }).click();
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
  await page.getByRole('tab', { name: /^Work$/ }).click();
  await context.setOffline(true);
  await expect(page.getByTestId('intervention-table-saved')).toBeVisible();
  await page.getByTestId('intervention-work-items-search').fill('no-saved-match');
  await expect(page.getByTestId('intervention-work-item-table-row')).toHaveCount(0);
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().includes('/api/intervention-work-items?') &&
      new URL(response.url()).searchParams.get('search') === 'no-saved-match',
  );
  await context.setOffline(false);
  await refreshed;
  await expect(page.getByTestId('intervention-table-saved')).toHaveCount(0);
  await expect(page.getByTestId('intervention-work-items-search')).toHaveValue('no-saved-match');
});

for (const { tab, actions } of [
  { tab: 'work-item', actions: true },
  { tab: 'changes', actions: true },
  { tab: 'changes', actions: false },
] as const) {
  test(
    'holds the ' +
      tab +
      ' first query to inspect its real skeleton' +
      (actions ? '' : ' without actions'),
    async ({ page }, info) => {
      await page.setViewportSize({ width: 1280, height: 938 });
      const path = await arrange(page, actions);
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const endpoint = tab === 'work-item' ? 'intervention-work-items' : 'intervention-changes';
      await page.route(new RegExp('/api/' + endpoint + '\\?'), async (route) => {
        const searchParams = new URL(route.request().url()).searchParams;
        if (!searchParams.has('status') && !searchParams.has('status[]')) {
          return route.fallback();
        }
        await held;
        return route.fallback();
      });
      await page.goto(path + (tab === 'changes' ? '?tab=changes' : ''));
      const table = page.getByTestId('intervention-' + tab + '-table');
      await expect(table.locator('tbody hlm-skeleton').first()).toBeVisible();
      const columns = await table
        .locator('thead th')
        .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
      expect(columns).toHaveLength(tab === 'work-item' ? 7 : actions ? 5 : 4);
      const height = await table
        .locator('tbody tr')
        .first()
        .evaluate((row) => row.getBoundingClientRect().height);
      const toggleCenter =
        tab === 'work-item'
          ? await table
              .locator('tbody hlm-skeleton')
              .first()
              .evaluate((element) => {
                const box = element.getBoundingClientRect();
                return box.x + box.width / 2;
              })
          : null;
      await page.screenshot({
        path: info.outputPath(tab + '-skeleton.png'),
        animations: 'disabled',
      });
      release();
      await expect(table.locator('tbody hlm-skeleton')).toHaveCount(0);
      expect(
        await table
          .locator('thead th')
          .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width)),
      ).toEqual(columns);
      expect(
        Math.abs(
          (await table
            .locator('tbody tr')
            .last()
            .evaluate((row) => row.getBoundingClientRect().height)) - height,
        ),
      ).toBeLessThanOrEqual(1);
      if (toggleCenter !== null) {
        const center = await table
          .getByRole('checkbox')
          .first()
          .evaluate((element) => {
            const box = element.getBoundingClientRect();
            return box.x + box.width / 2;
          });
        expect(Math.abs(center - toggleCenter)).toBeLessThanOrEqual(1);
      }
      await page.screenshot({ path: info.outputPath(tab + '-loaded.png'), animations: 'disabled' });
    },
  );
}

test('keeps names stable and resets criteria while walking previous and next interventions', async ({
  page,
}) => {
  const first = interventionOutput({ name: 'Alpha intervention', status: 'in_progress' });
  const second = interventionOutput({
    id: 'table-neighbour',
    '@id': '/api/interventions/table-neighbour',
    number: 102,
    name: 'Beta intervention',
    status: 'in_progress',
  });
  await arrange(page, true, async (api) => {
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [first, second]);
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, []);
    await api.mockInterventionDetail(first);
    await api.mockInterventionDetail(second);
    await api.mockInterventionWorkItems(second.id, []);
    await api.mockInterventionChanges(second.id, []);
    await api.mockInterventionIssues(second.id, []);
    await api.mockInterventionActivities(second.id, []);
    await api.mockInterventionAttachments(second.id, []);
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions`);
  await page.getByRole('link', { name: first.name, exact: true }).click();
  await page.getByRole('tab', { name: /^Changes/ }).click();
  await page.getByTestId('intervention-changes-search').fill('decommissioned');
  await page.getByTestId('intervention-detail-next').click();
  await expect(page).toHaveURL(/table-neighbour/);
  await expect(page.locator('h1')).toHaveText(second.name);
  await expect(page.getByTestId('dashboard-breadcrumb-current')).toHaveText(second.name);
  await expect(page).toHaveTitle(/Beta intervention/);
  await expect(page.getByTestId('intervention-changes-search')).toHaveValue('');
  await page.getByTestId('intervention-detail-prev').click();
  await expect(page).toHaveURL(new RegExp(E2E_INTERVENTION_ID));
  await expect(page.locator('h1')).toHaveText(first.name);
  await expect(page.getByTestId('dashboard-breadcrumb-current')).toHaveText(first.name);
  await expect(page).toHaveTitle(/Alpha intervention/);
  await expect(page.getByTestId('intervention-changes-search')).toHaveValue('');
});

test('clears a status filter from its distinct empty state', async ({ page }) => {
  const path = await arrange(page);
  await page.goto(path + '?tab=changes');
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
  await page.getByTestId('intervention-changes-filter-status').click();
  await page.getByRole('option', { name: 'Rejected', exact: true }).click();
  await expect(page.getByText('No changes in this state', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).last().click();
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
});

test('queries the API and retains Changes criteria across tab visits', async ({ page }) => {
  const path = await arrange(page);
  await page.goto(path + '?tab=changes');
  const search = page.getByTestId('intervention-changes-search');
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
  const response = page.waitForResponse(
    (value) =>
      value.url().includes('/api/intervention-changes?') &&
      new URL(value.url()).searchParams.get('search') === 'no-match',
  );
  await search.fill('no-match');
  await response;
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(0);
  await page.getByRole('tab', { name: /^Equipment/ }).click();
  await page.getByRole('tab', { name: /^Changes/ }).click();
  await expect(search).toHaveValue('no-match');
  await search.fill('decommissioned');
  await expect(page.getByTestId('intervention-change-row')).toHaveCount(2);
});

test('keeps every detail-table search and Filters control on one desktop toolbar row', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1670, height: 938 });
  const path = await arrange(page);
  await page.goto(path);

  /* eslint-disable no-await-in-loop -- Visit each tab sequentially so its mounted toolbar is measured. */
  for (const tab of ['work-items', 'changes', 'facilities', 'equipment', 'inspections']) {
    if (tab !== 'work-items')
      await page.getByRole('tab', { name: new RegExp('^' + tab.replace('-', ' '), 'i') }).click();
    const search = page.getByTestId('intervention-' + tab + '-search');
    const filters = page.getByTestId('intervention-' + tab + '-filters-toggle');
    await expect(search).toBeVisible();
    await expect(filters).toBeVisible();
    const rows = await Promise.all(
      [search, filters].map((control) =>
        control.evaluate((element) => {
          const box = element.getBoundingClientRect();
          return { top: box.top, bottom: box.bottom };
        }),
      ),
    );
    expect(rows[0].top, tab + ' controls should share a row').toBeLessThan(rows[1].bottom);
    expect(rows[1].top, tab + ' controls should share a row').toBeLessThan(rows[0].bottom);
  }
  /* eslint-enable no-await-in-loop */
  await page.screenshot({
    path: info.outputPath('desktop-toolbar-alignment.png'),
    animations: 'disabled',
  });
});

test('removes completed work from the Remaining API query without reloading the page', async ({
  page,
}) => {
  const path = await arrange(page, true, (api) =>
    api.mockInterventionWorkItemUpdate(
      'e2e-work-item-1',
      interventionWorkItemOutput({ status: 'completed' }),
    ),
  );
  await page.goto(path);
  const row = page.getByTestId('intervention-work-item-table-row');
  await expect(row).toHaveCount(1);
  await row.getByRole('checkbox').click();
  await expect(row).toHaveCount(0);
  await expect(page.getByTestId('intervention-work-items-filtered-empty')).toBeVisible();
});

for (const width of [1949, 1280, 1024, 390]) {
  for (const dark of [false, true]) {
    test(`changes semantic rows and page navigation ${width} ${dark ? 'dark' : 'light'}`, async ({
      page,
      context,
      baseURL,
    }, info) => {
      await page.setViewportSize({ width, height: 938 });
      if (!baseURL) throw new Error('Expected the configured E2E base URL');
      if (dark) await setDarkTheme(context, baseURL);
      const path = await arrange(page, width !== 1024);
      await page.goto(`${path}?tab=changes`);
      const table = page.getByTestId('intervention-changes-table');
      await expect(table.locator('tbody tr')).toHaveCount(2);
      const row = table.locator('tbody tr').last();
      await expect(row).toContainText('Status');
      await expect(row).toContainText('decommissioned');
      expect(await table.locator('tbody tr').first().locator('td[rowspan="2"]').count()).toBe(
        width === 1024 ? 2 : 3,
      );
      const widths = await table
        .locator('thead th')
        .evaluateAll((cells) => cells.map((cell) => cell.getBoundingClientRect().width));
      expect(widths[0]).toBeGreaterThanOrEqual(127);
      expect(widths[1]).toBeGreaterThanOrEqual(127);
      expect(widths[2]).toBeGreaterThanOrEqual(239);
      expect(widths[3]).toBeGreaterThanOrEqual(111);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: info.outputPath('changes.png'), animations: 'disabled' });
      await page.locator('#dashboard-main').evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await page.getByRole('tab', { name: /^Changes/ }).focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('intervention-equipment-table')).toBeVisible();
      await expect
        .poll(() => page.locator('#dashboard-main').evaluate((element) => element.scrollTop))
        .toBe(0);
      await expect(page.locator('h1')).toContainText('Table regression intervention');
      await expect(page.getByTestId('dashboard-breadcrumb-current')).toContainText(
        'Table regression intervention',
      );
      await expect(page).toHaveTitle(/Table regression intervention/);
      const delta = await page.getByRole('tab', { name: /^Equipment/ }).evaluate((element) => {
        const style = getComputedStyle(element, '::after');
        const header = document.getElementById('dashboard-page-header');
        if (!header) throw new Error('Expected the page header');
        return (
          element.getBoundingClientRect().bottom -
          parseFloat(style.bottom) -
          header.getBoundingClientRect().bottom
        );
      });
      expect(Math.abs(delta)).toBeLessThanOrEqual(2);
    });
  }
}

for (const tab of ['facilities', 'equipment', 'inspections'] as const) {
  test(`retains ${tab} column geometry from skeleton to rows`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 938 });
    const path = await arrange(page);
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(new RegExp(`/api/${tab}(\\?.*)?$`), async (route) => {
      if (!new URL(route.request().url()).searchParams.has('intervention')) return route.fallback();
      await held;
      await route.fallback();
    });
    await page.goto(path);
    await page.getByRole('tab', { name: new RegExp(`^${tab}`, 'i') }).click();
    const table = page.getByTestId(`intervention-${tab}-table`);
    await expect(table.locator('tbody hlm-skeleton').first()).toBeVisible();
    const before = await table.locator('thead th').evaluateAll((cells) =>
      cells.map((cell) => ({
        x: cell.getBoundingClientRect().x,
        width: cell.getBoundingClientRect().width,
      })),
    );
    const rowHeight = await table
      .locator('tbody tr')
      .first()
      .evaluate((row) => row.getBoundingClientRect().height);
    await page.screenshot({ path: info.outputPath(`${tab}-skeleton.png`), animations: 'disabled' });
    release();
    await expect(table.locator('tbody hlm-skeleton')).toHaveCount(0);
    await expect(table.locator('tbody tr')).toHaveCount(1);
    const after = await table.locator('thead th').evaluateAll((cells) =>
      cells.map((cell) => ({
        x: cell.getBoundingClientRect().x,
        width: cell.getBoundingClientRect().width,
      })),
    );
    expect(after).toEqual(before);
    expect(
      Math.abs(
        (await table
          .locator('tbody tr')
          .first()
          .evaluate((row) => row.getBoundingClientRect().height)) - rowHeight,
      ),
    ).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({ path: info.outputPath(`${tab}-loaded.png`), animations: 'disabled' });
  });
}
