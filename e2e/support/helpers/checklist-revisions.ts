import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow } from './appearance';

/** Verifies metadata-only PATCH, retained revision drafts, and the linked create payload. */
export async function verifyChecklistRevisions(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  const path = `/api/organizations/${E2E_ORGANIZATION_ID}/checklists`;
  let original = {
    '@id': `${path}/checklist-original`,
    '@type': 'Checklist',
    id: 'checklist-original',
    organizationId: E2E_ORGANIZATION_ID,
    name: 'Annual pressure check',
    version: '1.0',
    referenceCode: 'PRESSURE-V1',
    previousChecklistId: null as string | null,
    status: 'active',
    canEditMetadata: true,
    canEditItems: false,
    canCreateRevision: true,
    items: [
      {
        id: 'pressure-item',
        label: 'Check pressure gauge',
        description: null,
        position: 0,
        required: true,
      },
    ],
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-09-20T09:00:00Z',
  };
  let created: typeof original | undefined;
  let attempts = 0;
  await page.route(`**${path}/checklist-original`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const body = route.request().postDataJSON();
      expect(body).toEqual({ name: 'Annual pressure check – updated' });
      original = { ...original, name: body.name };
    }
    await route.fulfill({ json: original });
  });
  await page.route(`**${path}/checklist-revised`, (route) => route.fulfill({ json: created }));
  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    const body = route.request().postDataJSON();
    expect(body.previousChecklistId).toBe(original.id);
    expect(body.version).toBe('2.0');
    expect(body.referenceCode).toBe('PRESSURE-V2');
    expect(body.items[0].label).toBe('Check pressure and seal');
    if (++attempts === 1) {
      await route.fulfill({
        status: 409,
        json: {
          status: 409,
          detail: 'Reference is already used.',
          code: 'checklist_reference_conflict',
        },
      });
      return;
    }
    created = {
      ...original,
      ...body,
      id: 'checklist-revised',
      '@id': `${path}/checklist-revised`,
      canEditItems: true,
    };
    await route.fulfill({ status: 201, json: created });
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/checklists/checklist-original`);
  await expect(page.getByTestId('checklist-detail-page')).toContainText('Version 1.0');
  await expect(page.locator('#checklist-row-label-0')).toBeDisabled();
  await page.getByTestId('checklist-edit-name').fill('Annual pressure check – updated');
  const updated = page.waitForResponse(
    (response) =>
      response.request().method() === 'PATCH' && response.url().endsWith('/checklist-original'),
  );
  await page.getByTestId('checklist-edit-submit').focus();
  await page.keyboard.press('Enter');
  await updated;
  await expect(page.getByTestId('checklist-edit-submit')).toBeDisabled();
  const capture = `e2e/artifacts/reliability/checklists-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({
    path: `${capture}-metadata.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Create a new revision', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New revision', exact: true })).toBeVisible();
  await expect(page.locator('#checklist-reference')).toHaveValue('');
  await expect(page.locator('#checklist-row-label-0')).toBeEnabled();
  await page.locator('#checklist-version').fill('2.0');
  await page.locator('#checklist-reference').fill('PRESSURE-V2');
  await page.locator('#checklist-row-label-0').fill('Check pressure and seal');
  await page.getByTestId('checklist-edit-submit').click();
  await expect(page.getByRole('alert')).toContainText('Reference is already used');
  await expect(page.locator('#checklist-version')).toHaveValue('2.0');
  await expect(page.locator('#checklist-row-label-0')).toHaveValue('Check pressure and seal');
  await page.getByRole('heading', { name: 'New revision', exact: true }).scrollIntoViewIfNeeded();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({
    path: `${capture}-revision.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByTestId('checklist-edit-submit').click();
  await expect(page).toHaveURL(/checklists\/checklist-revised$/);
  await expect(page.getByRole('link', { name: 'Previous revision', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Previous revision', exact: true }).click();
  await expect(page.locator('#checklist-row-label-0')).toHaveValue('Check pressure gauge');
}
