import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { facilityOutput } from '../support/fixtures/facility-fixtures';
import {
  interventionOutput,
  interventionStatisticsOutput,
  interventionTemplateOutput,
  interventionWorkItemOutput,
} from '../support/fixtures/intervention-fixtures';
import { acceptedOrganizationMemberOutput } from '../support/fixtures/invitation-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

const CAPTURES = 'test-results/uiux-desktop-review-20260903/interventions';
const facility = facilityOutput({
  name: 'Centre logistique Saint-Étienne — bâtiment de maintenance nord',
});
const member = acceptedOrganizationMemberOutput({
  '@id': `/api/organizations/${E2E_ORGANIZATION_ID}/members/e2e-member-2`,
  firstName: 'Alexandre',
  lastName: 'de Saint-Exupéry',
  displayName: 'Alexandre de Saint-Exupéry',
});
const today = new Date();
today.setHours(12, 0, 0, 0);
const due = new Date(today);
due.setDate(due.getDate() + 12);
const intervention = interventionOutput({
  name: 'Contrôle des colonnes incendie — bâtiment de maintenance et réserves',
  site: facility['@id'],
  responsible: member['@id'],
  plannedStartAt: today.toISOString(),
  dueAt: due.toISOString(),
  updatedAt: today.toISOString(),
  workItemsCount: 6,
  description:
    'Vérifier les accès aux équipements et consigner les anomalies avec une photographie. Prévenir le responsable du site avant toute mise hors service.',
});

test('keeps description editing and disclosure choices through desktop resize', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await prepare(page);
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}`);
  const about = page.getByRole('button', { name: 'About', exact: true });
  await expect(about).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId('intervention-description-field').getByRole('button').first().click();
  const editor = page.getByTestId('intervention-description-input');
  await expect(editor).toBeFocused();
  await editor.fill('Draft preserved while the workspace becomes narrower.');
  await page.setViewportSize({ width: 1000, height: 768 });
  await expect(about).toHaveAttribute('aria-expanded', 'true');
  await expect(editor).toBeFocused();
  await expect(editor).toBeEditable();
  await expect(editor).toHaveValue('Draft preserved while the workspace becomes narrower.');
  await page.keyboard.press('Escape');
  await about.click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(about).toHaveAttribute('aria-expanded', 'false');
});

async function prepare(page: Page): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockFacilityList(E2E_ORGANIZATION_ID, [facility]);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, [member]);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionStatistics(interventionStatisticsOutput());
  await api.mockInterventionTemplates(E2E_ORGANIZATION_ID, [interventionTemplateOutput()]);
  await api.mockInterventionList(
    E2E_ORGANIZATION_ID,
    Array.from({ length: 16 }, (_, index) =>
      interventionOutput({
        ...intervention,
        id: `desktop-${index}`,
        '@id': `/api/interventions/desktop-${index}`,
        number: 100 + index,
        status: index % 2 ? 'planned' : 'in_progress',
      }),
    ),
  );
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(
    intervention.id,
    Array.from({ length: 6 }, (_, index) =>
      interventionWorkItemOutput({
        id: `work-${index}`,
        '@id': `/api/intervention-work-items/work-${index}`,
      }),
    ),
  );
  await api.mockInterventionChanges(intervention.id, []);
  await api.mockInterventionIssues(intervention.id, []);
  await api.mockInterventionActivities(intervention.id, []);
  await api.mockInterventionAttachments(intervention.id, []);
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  for (const dark of [false, true]) {
    const mode = `${viewport.width}-${dark ? 'dark' : 'light'}`;
    test(`keeps a populated desktop collection and its overlays usable at ${mode}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await mkdir(CAPTURES, { recursive: true });
      await page.setViewportSize(viewport);
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await prepare(page);
      const list = new InterventionsPage(page);
      await list.goto(E2E_ORGANIZATION_ID);
      await expect(list.tableRows).toHaveCount(16);
      const columns = await page.getByTestId('intervention-table').evaluate((table) => ({
        header: Array.from(table.querySelectorAll('thead th')).map((cell) => ({
          text: cell.textContent?.trim(),
          x: cell.getBoundingClientRect().x,
          width: cell.getBoundingClientRect().width,
        })),
        body: Array.from(table.querySelector('tbody tr')?.querySelectorAll('td') ?? []).map(
          (cell) => ({
            text: cell.textContent?.trim(),
            x: cell.getBoundingClientRect().x,
            width: cell.getBoundingClientRect().width,
          }),
        ),
      }));
      await writeFile(`${CAPTURES}/${mode}-columns.json`, JSON.stringify(columns, null, 2));
      await expect(page.getByTestId('intervention-table-row-menu').first()).toBeInViewport();
      for (const [index, header] of columns.header.entries()) {
        expect
          .soft(columns.body[index]?.x, `${header.text} column alignment`)
          .toBeCloseTo(header.x, 0);
      }
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ animations: 'disabled', path: `${CAPTURES}/${mode}-list.png` });
      await list.openFilters();
      await list.addFilterTrigger.click();
      await expect(page.getByTestId('interventions-filters-add-option').first()).toBeInViewport();
      await page.screenshot({ animations: 'disabled', path: `${CAPTURES}/${mode}-filters.png` });
      await page.keyboard.press('Escape');
      await list.filtersToggle.click();
      await expect(page.getByTestId('intervention-statistics-analysis-trigger')).toHaveCount(0);
      await expect(page.getByTestId('intervention-kpi-strip')).toHaveCount(0);
      await expect(page.getByTestId('intervention-view-toggle')).toBeInViewport();
      await expect.soft(list.tableRows.first()).toBeInViewport();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        animations: 'disabled',
        path: `${CAPTURES}/${mode}-summary.png`,
      });
      await page.getByTestId('interventions-new').click();
      await expect(page.getByTestId('intervention-create-submit')).toBeInViewport();
      await page.screenshot({ animations: 'disabled', path: `${CAPTURES}/${mode}-create.png` });
      await page.locator('#intervention-create-site').click();
      await expect(page.getByRole('option', { name: facility.name })).toBeVisible();
      await page.screenshot({
        animations: 'disabled',
        path: `${CAPTURES}/${mode}-create-sites.png`,
      });
      await page.keyboard.press('Escape');
      await page.getByTestId('intervention-create-mode-template').click();
      await expect(page.getByTestId('intervention-create-template-confirm')).toBeInViewport();
      await page.screenshot({ animations: 'disabled', path: `${CAPTURES}/${mode}-template.png` });
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions?view=board`);
      await expect(page.getByTestId('board')).toBeInViewport();
      await page.screenshot({ animations: 'disabled', path: `${CAPTURES}/${mode}-board.png` });
      await page.getByTestId('intervention-view-toggle-calendar').click();
      await expect(page.getByTestId('intervention-calendar-toolbar')).toBeInViewport();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ animations: 'disabled', path: `${CAPTURES}/${mode}-calendar.png` });
    });

    test(`keeps desktop detail properties separated and editors reachable at ${mode}`, async ({
      page,
      context,
      baseURL,
    }) => {
      await mkdir(CAPTURES, { recursive: true });
      await page.setViewportSize(viewport);
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      await prepare(page);
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}`);
      await expect(page.getByTestId('intervention-field-responsible')).toContainText(
        member.displayName ?? '',
      );
      await page.screenshot({ animations: 'disabled', path: `${CAPTURES}/${mode}-detail.png` });
      const geometry = await page.getByTestId('intervention-detail-properties').evaluate((region) =>
        ['priority', 'site', 'responsible', 'schedule'].map((name) => {
          const cell = region.querySelector(`[data-testid="intervention-field-${name}"]`);
          const value = cell?.querySelector('[fieldValue]');
          const outer = cell?.getBoundingClientRect();
          const inner = value?.getBoundingClientRect();
          return {
            name,
            width: outer?.width,
            overflow: inner && outer ? Math.max(0, inner.right - outer.right) : null,
          };
        }),
      );
      await writeFile(
        `${CAPTURES}/${mode}-detail-measurements.json`,
        JSON.stringify(geometry, null, 2),
      );
      for (const field of geometry)
        expect.soft(field.overflow, `${field.name} stays within its cell`).toBeLessThanOrEqual(1);
      await page.getByTestId('intervention-field-responsible').getByRole('button').first().click();
      await expect(page.locator('#intervention-prop-responsible')).toBeFocused();
      await page.locator('#intervention-prop-responsible').click();
      await expect(page.getByRole('option', { name: /Alexandre/ })).toBeVisible();
      await page.screenshot({
        animations: 'disabled',
        path: `${CAPTURES}/${mode}-responsible-editor.png`,
      });
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'More details', exact: true }).click();
      await expect(page.getByRole('button', { name: 'About', exact: true })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
      await page.screenshot({
        animations: 'disabled',
        path: `${CAPTURES}/${mode}-details-expanded.png`,
      });
      await expectNoHorizontalOverflow(page);
      await page.getByRole('tab', { name: 'Inspections', exact: false }).click();
      await expect(page.getByRole('tab', { name: 'Inspections', exact: false })).toBeInViewport();
    });
  }
}
