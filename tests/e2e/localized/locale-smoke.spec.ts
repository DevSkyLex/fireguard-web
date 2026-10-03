import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkloadApiMock } from '../support/mocks/workload-api-mock';

test('renders translated workload navigation and capacity actions on desktop and touch', async ({
  page,
  context,
}, info) => {
  const spanish = process.env['E2E_LOCALE'] === 'es';
  const touch = info.project.name.endsWith('touch');
  if (touch) await emulateMobilePlatform(context, 'android');
  await page.clock.setFixedTime(new Date('2026-09-16T10:00:00Z'));
  await new ApiMock(page).mockAuthenticatedSession();
  await new WorkloadApiMock(page).projection();
  await page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/workload');
  await expect(
    page.getByRole('heading', {
      name: spanish ? 'Carga de trabajo' : 'Charge de travail',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: spanish ? 'Configurar capacidades' : 'Configurer les capacités',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByTestId(touch ? 'workload-mobile-list' : 'workload-matrix')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
