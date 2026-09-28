import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { E2E_MEMBER_IRI, interventionOutput } from '../support/fixtures/intervention-fixtures';
import { expectNoHorizontalOverflow } from '../support/helpers/appearance';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';
import { ApiMock } from '../support/mocks/api-mock';
import { InterventionsPage } from '../support/pages/interventions.page';

test('shows translated selection counts and actions on desktop and touch', async ({
  page,
  context,
  browserName,
}, info) => {
  const touch = info.project.name === 'French touch';
  if (touch) await emulateMobilePlatform(context, browserName === 'webkit' ? 'ios' : 'android');
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockInterventionList(E2E_ORGANIZATION_ID, [
    interventionOutput({
      id: 'localized-selection-a',
      '@id': '/api/interventions/localized-selection-a',
      name: 'Localized selection first',
      responsible: E2E_MEMBER_IRI,
    }),
    interventionOutput({
      id: 'localized-selection-b',
      '@id': '/api/interventions/localized-selection-b',
      name: 'Localized selection last',
    }),
  ]);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);

  const interventions = new InterventionsPage(page);
  await interventions.goto(E2E_ORGANIZATION_ID);
  if (touch) {
    await page.getByTestId('interventions-tools').click();
    await page.getByTestId('interventions-selection-mode').click();
    await page.getByTestId('interventions-tools-close').click();
  }
  if (touch) {
    await page
      .getByTestId('intervention-table-card')
      .filter({ hasText: 'Localized selection first' })
      .getByTestId('intervention-table-row-select')
      .click();
  } else {
    await interventions.selectRow('Localized selection first');
  }
  await expect(interventions.selectionBar).toContainText('Sélectionnées : 1');
  await expect(interventions.selectionBar).toContainText('Résultats : 2');
  await expectNoHorizontalOverflow(page);

  if (touch) {
    const triggerReceivesPointer = await page
      .getByTestId('interventions-selection-actions-trigger')
      .evaluate((button) => {
        const rect = button.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return hit !== null && button.contains(hit);
      });
    expect(triggerReceivesPointer).toBe(true);
  }

  await mkdir('e2e/artifacts/selection-bar', { recursive: true });
  await page.screenshot({
    path: `e2e/artifacts/selection-bar/interventions-${touch ? 'touch' : 'desktop'}-french.png`,
    animations: 'disabled',
  });
  if (touch) {
    await page.getByTestId('interventions-selection-actions-trigger').click();
    await expect(page.getByTestId('interventions-selection-drawer')).toContainText(
      'Actions sur les lignes sélectionnées',
    );
    await expect(page.getByTestId('interventions-selection-drawer')).toContainText('Déplacer vers');
  } else {
    await expect(interventions.bulkMoveTrigger).toContainText('Déplacer vers');
  }
});
