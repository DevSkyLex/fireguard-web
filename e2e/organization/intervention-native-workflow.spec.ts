import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
  interventionTemplateOutput,
} from '../support/fixtures/intervention-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

const CAPTURES = 'test-results/uiux-final-20260903';
const intervention = interventionOutput();

for (const mode of [
  { name: 'desktop-light', width: 1280, dark: false },
  { name: 'desktop-dark', width: 1280, dark: true },
  { name: 'mobile-light', width: 375, dark: false },
  { name: 'mobile-dark', width: 375, dark: true },
]) {
  test(`keeps the intervention workflow compact and operable in ${mode.name}`, async ({
    page,
    context,
    baseURL,
  }) => {
    await mkdir(CAPTURES, { recursive: true });
    await page.setViewportSize({ width: mode.width, height: 800 });
    if (mode.dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const errors = collectConsoleErrors(page);
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();
    await api.mockInterventionList(E2E_ORGANIZATION_ID, [intervention]);
    await api.mockInterventionStatistics(interventionStatisticsOutput());
    await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, [
      interventionTemplateOutput({ type: 'site_setup', priority: 'normal' }),
    ]);
    await api.mockInterventionDetail(intervention);
    await api.mockInterventionWorkItems(intervention.id, []);
    await api.mockInterventionChanges(intervention.id, []);
    await api.mockInterventionIssues(intervention.id, []);
    await api.mockInterventionActivities(intervention.id, []);
    await api.mockInterventionAttachments(intervention.id, []);
    await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
    await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
    await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
    await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
    await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions`);
    const firstRow = page
      .locator(
        mode.width === 375
          ? '[data-testid="intervention-table-card"]:visible'
          : '[data-testid="intervention-table-row"]:visible',
      )
      .first();
    await expect(firstRow).toBeVisible();
    await expect(page.getByRole('region', { name: 'List', exact: true })).toBeVisible();
    await expect(firstRow).toBeInViewport();
    await expect(page.getByTestId('intervention-statistics-analysis')).toBeHidden();
    await expectNoHorizontalOverflow(page);
    const firstRowY = (await firstRow.boundingBox())?.y;
    await page.screenshot({ path: `${CAPTURES}/interventions-${mode.name}.png` });

    await page.getByTestId('interventions-new').click();
    await expect(page.getByTestId('intervention-create-sheet')).toBeVisible();
    await expect(page.getByTestId('intervention-create-submit')).toBeInViewport();
    await expect(page.getByTestId('intervention-create-template-confirm')).toBeHidden();
    await page.screenshot({ path: `${CAPTURES}/intervention-create-${mode.name}.png` });
    await page.getByTestId('intervention-create-name').fill('A retained draft');
    await page.getByTestId('intervention-create-mode-template').click();
    await expect(page.getByTestId('intervention-create-submit')).toBeHidden();
    await expect(page.getByTestId('intervention-create-template-confirm')).toBeInViewport();
    await page.getByTestId('intervention-create-mode-blank').click();
    await expect(page.getByTestId('intervention-create-name')).toHaveValue('A retained draft');

    await page.goto(
      `/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}?q=riser&view=list`,
    );
    await expect(page.getByTestId('intervention-detail-command')).toBeVisible();
    await expect(page.getByTestId('intervention-detail-command')).toBeInViewport();
    await expect(page.getByTestId('intervention-field-site')).toBeInViewport();
    await expect(
      page.getByRole('tablist', { name: 'Intervention sections', exact: true }),
    ).toHaveAttribute('data-variant', 'line');
    await expectNoHorizontalOverflow(page);
    const detail = await page.evaluate(() => ({
      scrollTop: document.getElementById('dashboard-content')?.scrollTop ?? 0,
      focus: document.activeElement?.getAttribute('data-testid') ?? document.activeElement?.tagName,
      workTop: document
        .querySelector('[data-testid="intervention-detail-field-work"]')
        ?.getBoundingClientRect().top,
      commandBottom: document
        .querySelector('[data-testid="intervention-detail-command"]')
        ?.getBoundingClientRect().bottom,
      tabOrientation: document
        .querySelector('[data-slot="tabs"]')
        ?.getAttribute('data-orientation'),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(detail.scrollTop).toBe(0);
    expect(detail.tabOrientation).toBe('horizontal');
    expect(detail.commandBottom).toBeLessThanOrEqual(800);
    await expect(page.getByTestId('intervention-work-items-add')).toHaveCount(0);
    await expect(page.getByTestId('intervention-work-items-empty-add')).toHaveCount(1);
    await page.screenshot({ path: `${CAPTURES}/intervention-detail-${mode.name}.png` });
    await page.getByTestId('intervention-detail-discussion-trigger').click();
    await expect(page.getByTestId('intervention-comment-body')).toBeFocused();
    expect(errors, errors.join('\n')).toEqual([]);
    await writeFile(
      `${CAPTURES}/interventions-${mode.name}-measurements.json`,
      JSON.stringify({ firstRowY, ...detail }, null, 2),
    );
  });
}
