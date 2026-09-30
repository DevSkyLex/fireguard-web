import { test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import {
  interventionOutput,
  interventionLabelOutput,
} from '../support/fixtures/intervention-fixtures';
import {
  expectAccessibleImage,
  expectAccessibleTooltip,
} from '../support/helpers/accessibility-evidence';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { arrangeInterventionTables } from '../support/helpers/intervention-detail-tables';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

test('discloses the proposed change instant from the mobile card using the keyboard', async ({
  page,
  context,
}, info) => {
  await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
  await page.goto(`${await arrangeInterventionTables(page)}?tab=changes`);
  await expectAccessibleTooltip(
    page,
    page.getByTestId('intervention-change-card').locator('[tabindex="0"]'),
    'intervention-change-card-timestamp',
  );
});

test('preserves the unassigned responsible image name in the mobile intervention card', async ({
  page,
  context,
}, info) => {
  await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [interventionOutput()]);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await new InterventionsPage(page).goto(E2E_ORGANIZATION_ID);
  await expectAccessibleImage(
    page,
    page
      .getByTestId('intervention-table-card')
      .getByRole('img', { name: 'No responsible assigned', exact: true }),
    'No responsible assigned',
    'intervention-unassigned-image',
  );
});

test('discloses additional labels from the mobile intervention card using the keyboard', async ({
  page,
  context,
}, info) => {
  await emulateMobilePlatform(context, info.project.name.includes('Safari') ? 'ios' : 'android');
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const labels = ['Compliance', 'North wing', 'Pressure test'].map((name, index) =>
    interventionLabelOutput({ id: `label-${index}`, name }),
  );
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [interventionOutput({ labels })]);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, labels);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await new InterventionsPage(page).goto(E2E_ORGANIZATION_ID);
  await expectAccessibleTooltip(
    page,
    page
      .getByTestId('intervention-table-card')
      .locator('span[tabindex="0"]')
      .filter({ hasText: '+1' }),
    'intervention-extra-labels',
  );
});
