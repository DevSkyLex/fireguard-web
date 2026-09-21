import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../fixtures/api-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow } from './appearance';

/** Verifies durable retry history, conflict recovery and read-only access. */
export async function verifyAutomationHistory(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, { permissions: ['organization.*'] });
  const root = `/api/organizations/${E2E_ORGANIZATION_ID}/automation`;
  let canManage = true;
  let retried = false;
  let completed = false;
  const requests: unknown[] = [];
  const original = {
    '@id': `${root}/attempts/first`,
    '@type': 'AutomationAttempt',
    id: 'first',
    runId: 'action',
    organizationId: E2E_ORGANIZATION_ID,
    ruleKey: 'auto_create_intervention_on_critical_nc',
    subjectId: 'NC-2026-001',
    attemptNumber: 1,
    status: 'failed',
    createdAt: '2026-09-21T10:00:00Z',
    finishedAt: '2026-09-21T10:01:00Z',
    requestedBy: null,
    interventionId: null,
    errorCode: 'automation_action_failed',
    canRetry: true,
  };
  const latest = () => ({
    ...original,
    '@id': `${root}/attempts/second`,
    id: 'second',
    attemptNumber: 2,
    status: completed ? 'succeeded' : 'pending',
    errorCode: null,
    canRetry: false,
    createdAt: '2026-09-21T10:05:00Z',
    interventionId: completed ? 'intervention' : null,
  });
  await page.route(`**${root}**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/retry')) {
      requests.push(route.request().postDataJSON());
      retried = true;
      return route.fulfill({
        status: 409,
        json: {
          status: 409,
          title: 'Attempt already changed',
          code: 'automation_retry_conflict',
          detail: 'This attempt has already changed. History has been refreshed.',
        },
      });
    }
    if (url.pathname.endsWith('/runs'))
      return route.fulfill({
        json: hydraCollection(
          retried
            ? [latest(), { ...original, canRetry: false }]
            : [{ ...original, canRetry: canManage }],
          { '@id': root + '/runs', totalItems: retried ? 2 : 1 },
        ),
      });
    return route.fulfill({
      json: {
        '@id': root,
        '@type': 'AutomationPolicy',
        id: E2E_ORGANIZATION_ID,
        ruleKey: original.ruleKey,
        enabled: true,
        canManage,
      },
    });
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/automations`);
  await expect(page.getByTestId('automation-policy')).toContainText('Enabled');
  await expect(page.getByTestId('automation-attempt')).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
  const base = `e2e/artifacts/reliability/automation-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.screenshot({ path: `${base}-failure.png`, fullPage: true, animations: 'disabled' });
  await page.getByTestId('automation-retry').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('automation-attempt')).toHaveCount(2);
  await expect(page.getByText('Queued', { exact: true })).toBeVisible();
  expect(requests).toEqual([{ attemptId: 'first' }]);
  completed = true;
  await page.getByTestId('automation-refresh').click();
  await expect(page.getByRole('link', { name: 'Open intervention' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.screenshot({ path: `${base}-recovered.png`, fullPage: true, animations: 'disabled' });
  canManage = false;
  retried = false;
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ['organization.read', 'organization.automation.read'],
  });
  await page.reload();
  await expect(page.getByTestId('automation-attempt')).toHaveCount(1);
  await expect(page.getByTestId('automation-retry')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Manage policy' })).toHaveCount(0);
}
