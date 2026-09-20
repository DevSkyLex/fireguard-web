import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  collectConsoleErrors,
  expectNoHorizontalOverflow,
  setDarkTheme,
} from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';

test('keeps translated workload labels and the day sheet readable', async ({
  page,
  context,
  baseURL,
}, info) => {
  const touch = info.project.name === 'French touch';
  if (touch) {
    await emulateMobilePlatform(context, 'android');
    await setDarkTheme(context, baseURL ?? 'http://localhost:4274');
  }
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  const errors = collectConsoleErrors(page);
  await new ApiMock(page).mockAuthenticatedSession();
  await new WorkloadApiMock(page).projection();
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/workload');
  const root = page.getByTestId('workload-page');
  await expect(page.getByRole('heading', { name: 'Charge de travail', exact: true })).toBeVisible();
  await expect(
    root.getByRole('button', { name: 'Configurer les capacités', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId(touch ? 'workload-mobile-list' : 'workload-matrix')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const directory = join(
    'e2e/artifacts/workload-refinement',
    process.env['FG_WORKLOAD_RUN'] ?? 'inspection',
    'localized',
    touch ? 'touch-dark' : 'desktop-light',
  );
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: join(directory, 'workload.png'), animations: 'disabled' });
  const planning = page.getByRole('region', { name: 'Travail à planifier', exact: true });
  const estimates = planning.getByRole('button', {
    name: 'Estimations à renseigner 1 tâche',
    exact: true,
  });
  await estimates.click();
  await expect(
    planning.getByRole('link', { name: 'Emergency pump — estimate missing' }),
  ).toBeVisible();
  await expect(planning).toContainText(
    'Saisir du temps ne met pas automatiquement à jour le reste à faire.',
  );
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: join(directory, 'planning.png'), animations: 'disabled' });
  await estimates.click();
  await expect(estimates).toHaveAttribute('aria-expanded', 'false');
  const overloaded = root.getByRole('button').filter({ hasText: 'Surcharge : 1 h' });
  if (touch) await overloaded.tap();
  else await overloaded.click();
  const detail = page.locator('hlm-sheet-content');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText('mercredi 16 septembre 2026');
  await expect(detail.getByText('Dépassement de 1 h', { exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: join(directory, 'day.png'), animations: 'disabled' });
  await expect(
    detail.getByRole('heading', { name: 'Interventions de la journée', exact: true }),
  ).toBeVisible();
  await detail.getByRole('button', { name: 'Travail non inclus 1 tâche', exact: true }).click();
  await detail
    .getByRole('link', { name: 'Emergency pump — estimate missing', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(detail).toContainText('pas uniquement cette journée');
  await expect(detail.getByRole('heading', { name: /Alexandrie Fernández/ })).toBeInViewport({
    ratio: 1,
  });
  await expect(detail.locator('hlm-sheet-header')).toBeInViewport({ ratio: 1 });
  await expect(
    detail.locator('hlm-sheet-footer').getByRole('button', { name: 'Fermer', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: join(directory, 'day-excluded.png'), animations: 'disabled' });
  await detail.getByRole('button', { name: 'Fermer', exact: true }).first().click();
  await expect(detail).toHaveCount(0);
  await root.getByRole('button', { name: 'Configurer les capacités', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'lundi Heures', exact: true })).toHaveValue('7');
  await page.locator('#capacity-day-0-minutes').fill('30');
  await expect(page.getByTestId('workload-capacity-total')).toHaveText('35 h 30 min');
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: join(directory, 'capacity.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Enregistrer la disponibilité', exact: true }).click();
  await expect(detail).toHaveCount(0);
  expect(errors).toEqual([]);
});
