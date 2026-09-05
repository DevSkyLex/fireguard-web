/* eslint-disable no-await-in-loop -- Dismissal scenarios intentionally operate the same dialog in sequence. */
import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { equipmentOutput } from '../support/fixtures/equipment-fixtures';
import {
  E2E_MEMBER_IRI,
  interventionOutput,
  interventionWorkItemOutput,
} from '../support/fixtures/intervention-fixtures';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

const captures = 'test-results/intervention-plan-captures';
for (const width of [390, 768, 1440]) {
  for (const dark of [false, true]) {
    test(`keeps equipment results and the checklist editor usable at ${width}px in ${dark ? 'dark' : 'light'} mode`, async ({
      page,
      context,
      baseURL,
    }) => {
      await mkdir(captures, { recursive: true });
      await page.setViewportSize({ width, height: 900 });
      if (dark) await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
      const api = new ApiMock(page);
      await api.mockAuthenticatedSession();
      await api.mockEquipmentList(
        E2E_ORGANIZATION_ID,
        Array.from({ length: 6 }, (_, index) =>
          equipmentOutput({ id: `equipment-${index}`, serialNumber: `EQ-${index}` }),
        ),
      );
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/equipments`);
      const rows = page
        .locator('[data-testid="equipment-table-card"], [data-testid="equipment-table-row"]')
        .filter({ visible: true });
      await expect(rows).toHaveCount(6);
      await rows.last().scrollIntoViewIfNeeded();
      await expect(rows.last()).toBeInViewport();
      await expectNoHorizontalOverflow(page);
      const height = await rows
        .first()
        .evaluate(
          (element) =>
            element.closest('app-collection-surface')?.getBoundingClientRect().height ?? 0,
        );
      expect(height).toBeGreaterThan(100);
      await page.screenshot({
        path: `${captures}/equipment-${width}-${dark ? 'dark' : 'light'}.png`,
        animations: 'disabled',
      });
      const checklist = {
        id: 'long-checklist',
        name: 'Quarterly fire safety checklist',
        status: 'active',
        version: '1.0',
        items: Array.from({ length: 18 }, (_, index) => ({
          id: `item-${index}`,
          position: index,
          label: `Check ${index + 1} — access and identification`,
          description: 'Check access, condition and readable identification.',
          required: true,
        })),
      };
      await page.route(
        /\/api\/organizations\/[^/]+\/checklists\/long-checklist(?:\?.*)?$/,
        async (route) => {
          await route.fulfill({
            status: route.request().method() === 'PATCH' ? 422 : 200,
            contentType: 'application/json',
            body: JSON.stringify(
              route.request().method() === 'PATCH'
                ? {
                    '@type': 'Error',
                    status: 422,
                    title: 'Checklist unavailable',
                    detail: 'Checklist is referenced by an inspection.',
                  }
                : checklist,
            ),
          });
        },
      );
      await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/checklists/long-checklist`);
      await expect(page.getByTestId('checklist-edit-name')).toHaveValue(checklist.name);
      expect(
        (await page.getByTestId('checklist-edit-name').boundingBox())?.width ?? 0,
      ).toBeGreaterThan(width === 390 ? 290 : 500);
      await page.locator('#checklist-row-label-0').fill('Keep this edited label');
      await expect(page.locator('#checklist-row-label-0')).toHaveValue('Keep this edited label');
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        path: `${captures}/checklist-${width}-${dark ? 'dark' : 'light'}.png`,
        animations: 'disabled',
      });
      await page.getByTestId('checklist-edit-submit').click();
      await expect(
        page.getByRole('alert').filter({ hasText: 'referenced by an inspection' }).first(),
      ).toBeVisible();
      await expect(page.locator('#checklist-row-label-0')).toHaveValue('Keep this edited label');
      await page.getByRole('button', { name: 'Back to checklists' }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
    });
  }
}

test('cancels signature capture on Escape, backdrop and Cancel; submits only through the explicit unsigned action', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const intervention = {
    ...interventionOutput({
      status: 'in_progress',
      responsible: E2E_MEMBER_IRI,
      allowedTransitions: ['submitted'],
      workItemsCount: 1,
      completedWorkItemsCount: 1,
    }),
    hasSignature: false,
  };
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(intervention.id, [
    interventionWorkItemOutput({ status: 'completed' }),
  ]);
  await api.mockInterventionChanges(intervention.id, []);
  await api.mockInterventionIssues(intervention.id, []);
  await api.mockInterventionActivities(intervention.id, []);
  await api.mockInterventionAttachments(intervention.id, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionTransition(intervention.id, { ...intervention, status: 'submitted' });
  const writes: string[] = [];
  page.on('request', (request) => {
    if (
      request.method() === 'PATCH' &&
      request.url().includes(`/api/interventions/${intervention.id}`)
    )
      writes.push(request.url());
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}`);
  const command = page.getByTestId('intervention-detail-command');
  for (const dismissal of ['escape', 'backdrop', 'cancel']) {
    await command.click();
    await expect(page.getByTestId('intervention-signature-dialog')).toBeVisible();
    if (dismissal === 'escape') await page.keyboard.press('Escape');
    else if (dismissal === 'backdrop') await page.mouse.click(5, 5);
    else await page.getByTestId('intervention-signature-cancel').click();
    await expect(page.getByTestId('intervention-signature-dialog')).toBeHidden();
    expect(writes).toHaveLength(0);
  }
  await command.click();
  const submitted = page.waitForRequest(
    (request) =>
      request.method() === 'PATCH' &&
      request.url().includes(`/api/interventions/${intervention.id}`),
  );
  await page.getByTestId('intervention-signature-skip').click();
  expect((await submitted).postDataJSON()).toMatchObject({ status: 'submitted' });
  expect(writes).toHaveLength(1);
});

test('restores an accepted publication after an observation error and reload without a second POST', async ({
  page,
}) => {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const intervention = interventionOutput({
    status: 'submitted',
    allowedTransitions: ['changes_requested'],
    allowedActions: { canPublish: true },
    responsible: E2E_MEMBER_IRI,
  });
  await api.mockInterventionDetail(intervention);
  await api.mockInterventionWorkItems(intervention.id, []);
  await api.mockInterventionChanges(intervention.id, []);
  await api.mockInterventionIssues(intervention.id, []);
  await api.mockInterventionActivities(intervention.id, []);
  await api.mockInterventionAttachments(intervention.id, []);
  await api.mockFacilityList(E2E_ORGANIZATION_ID, []);
  await api.mockEquipmentList(E2E_ORGANIZATION_ID, []);
  await api.mockOrganizationMembers(E2E_ORGANIZATION_ID, []);
  await api.mockInterventionLabels(E2E_ORGANIZATION_ID, []);
  let posts = 0;
  let completed = false;
  await page.route(/\/api\/publications(?:\?.*)?$/, async (route) => {
    posts++;
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'recoverable-publication',
        status: 'pending',
        intervention: intervention['@id'],
      }),
    });
  });
  await page.route(/\/api\/publications\/recoverable-publication(?:\?.*)?$/, async (route) => {
    if (!completed) await route.abort('failed');
    else
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'recoverable-publication',
          status: 'completed',
          intervention: intervention['@id'],
        }),
      });
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/interventions/${intervention.id}`);
  await page.getByTestId('intervention-detail-command').click();
  await page.getByTestId('intervention-detail-publish-confirm').click();
  await expect(page.getByTestId('intervention-detail-publish-recheck')).toBeEnabled();
  expect(posts).toBe(1);
  await page.reload();
  await expect(page.getByTestId('intervention-publication-tracking')).toBeVisible();
  expect(posts).toBe(1);
  completed = true;
  await api.mockInterventionDetail({
    ...intervention,
    status: 'published',
    allowedActions: { canPublish: false },
  });
  await page
    .getByTestId('intervention-publication-tracking')
    .getByRole('button', { name: 'Check result' })
    .click();
  await expect(page.getByTestId('intervention-publication-tracking')).toBeHidden();
  expect(posts).toBe(1);
});
