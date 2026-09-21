import { expect, type Page, type TestInfo } from '@playwright/test';
import { E2E_ORGANIZATION_ID, hydraCollection } from '../fixtures/api-fixtures';
import { ApiMock } from '../mocks/api-mock';
import { expectNoHorizontalOverflow, expectNoInternalOverflow } from './appearance';

/** Exercises permissions, retained drafts, one-time secrets and confirmed delivery history. */
export async function verifyWebhookManagement(page: Page, info: TestInfo): Promise<void> {
  const api = new ApiMock(page);
  await api.mockAuthenticatedSession();
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, { permissions: ['organization.*'] });
  const root = `/api/organizations/${E2E_ORGANIZATION_ID}/webhooks`;
  const now = new Date().toISOString();
  let exists = false;
  let rejectCreate = true;
  let tested = false;
  let confirmed = false;
  const deliveryQueries: string[] = [];
  const writes: Array<{ path: string; body: unknown }> = [];
  let endpoint = {
    '@id': root + '/hook',
    '@type': 'WebhookSubscription',
    id: 'hook',
    organizationId: E2E_ORGANIZATION_ID,
    url: 'https://receiver.example.com/fireguard',
    description: 'Operations receiver',
    eventTypes: ['inspection.submitted'],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  const failed = {
    '@id': root + '/hook/deliveries/original',
    '@type': 'WebhookDelivery',
    id: 'original',
    subscriptionId: 'hook',
    eventType: 'inspection.submitted',
    status: 'failed',
    attempts: 5,
    httpStatus: 503,
    errorCode: 'webhook_http_error',
    createdAt: now,
  };
  await page.route(/\/api\/webhooks\/event-types(?:\?.*)?$/, (route) =>
    route.fulfill({
      json: hydraCollection(
        ['inspection.submitted', 'equipment.commissioned', 'intervention.published'].map(
          (value) => ({
            '@id': `/api/webhooks/event-types/${value}`,
            '@type': 'WebhookEventType',
            value,
            label: value,
          }),
        ),
      ),
    }),
  );
  await page.route(/\/api\/organizations\/[^/]+\/webhooks(?:.*)$/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    if (method !== 'GET') {
      const body: unknown = request.postDataJSON();
      writes.push({ path, body });
      if (method === 'DELETE') {
        exists = false;
        return route.fulfill({ status: 204 });
      }
      if (method === 'PATCH') {
        endpoint = { ...endpoint, ...(body as object) };
        return route.fulfill({ json: endpoint });
      }
      if (path.endsWith('/rotate-secret'))
        return route.fulfill({ json: { ...endpoint, secret: 'rotated-test-secret' } });
      if (path.endsWith('/ping') || path.endsWith('/redeliver')) {
        tested = true;
        return route.fulfill({
          status: 202,
          json: {
            '@id': '/receipts/test',
            '@type': 'WebhookPing',
            deliveryId: 'test',
            subscriptionId: 'hook',
            status: 'queued',
          },
        });
      }
      if (rejectCreate) {
        rejectCreate = false;
        return route.fulfill({
          status: 422,
          json: {
            status: 422,
            title: 'Invalid destination',
            detail: 'Destination refused',
            violations: [{ propertyPath: 'url', message: 'Destination refused' }],
          },
        });
      }
      endpoint = { ...endpoint, ...(body as object) };
      exists = true;
      return route.fulfill({ status: 201, json: { ...endpoint, secret: 'initial-test-secret' } });
    }
    if (path.endsWith('/deliveries')) {
      deliveryQueries.push(url.search);
      const status = url.searchParams.get('status');
      const second = url.searchParams.get('page') === '2';
      let rows = second
        ? [{ ...failed, id: 'older' }]
        : tested
          ? [
              {
                ...failed,
                id: 'test',
                eventType: 'webhook.ping',
                status: confirmed ? 'delivered' : 'pending',
                attempts: confirmed ? 1 : 0,
                httpStatus: confirmed ? 204 : null,
                errorCode: null,
              },
              failed,
            ]
          : [failed];
      if (status) rows = rows.filter((row) => row.status === status);
      return route.fulfill({
        json: hydraCollection(rows, { '@id': path, totalItems: status ? rows.length : 21 }),
      });
    }
    return route.fulfill({
      json: hydraCollection(exists ? [endpoint] : [], { '@id': root, totalItems: exists ? 1 : 0 }),
    });
  });
  const base = `e2e/artifacts/reliability/webhooks-${info.project.name.replaceAll(' ', '-').toLowerCase()}`;
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/more`);
  await page.getByRole('link', { name: 'Webhooks', exact: true }).click();
  await expect(page.getByTestId('webhook-create')).toBeEnabled();
  await page.getByTestId('webhook-create').focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('webhook-url').fill('https://receiver.example.com/fireguard');
  await page.getByTestId('webhook-description').fill('Operations receiver');
  await page.getByRole('checkbox', { name: 'inspection.submitted', exact: true }).click();
  await expect(
    page.getByRole('checkbox', { name: 'inspection.submitted', exact: true }),
  ).toBeChecked();
  await expectNoInternalOverflow(page.getByTestId('webhook-editor'));
  await page.screenshot({ path: `${base}-editor.png`, fullPage: true, animations: 'disabled' });
  await page.getByTestId('webhook-save').click();
  await expect(page.getByTestId('webhook-editor')).toContainText('Destination refused');
  await expect(page.getByTestId('webhook-url')).toHaveValue(
    'https://receiver.example.com/fireguard',
  );
  await page.getByTestId('webhook-save').click();
  await expect(page.getByTestId('webhook-secret')).toHaveValue('initial-test-secret');
  await page.getByTestId('webhook-secret-close').click();
  await expect(page.getByTestId('webhook-secret')).toHaveCount(0);
  await expect(page.getByTestId('webhook-delivery-original')).toContainText('HTTP 503');
  await page.getByTestId('webhook-deliveries-next').click();
  await expect(page.getByTestId('webhook-delivery-older')).toBeVisible();
  await page.getByTestId('webhook-filter-failed').click();
  await expect
    .poll(() => deliveryQueries.some((query) => query.includes('status=failed')))
    .toBe(true);
  await expect(page.getByTestId('webhook-delivery-original')).toBeVisible();
  await page.getByTestId('webhook-edit').click();
  await page.getByTestId('webhook-description').fill('Updated receiver');
  await page
    .getByTestId('webhook-editor')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(page.getByTestId('unsaved-changes-dialog')).toBeVisible();
  await page
    .getByTestId('unsaved-changes-dialog')
    .getByRole('button', { name: 'Cancel', exact: true })
    .click();
  await expect(page.getByTestId('webhook-description')).toHaveValue('Updated receiver');
  await page.getByTestId('webhook-save').click();
  await expect(page.getByTestId('webhook-editor')).toHaveCount(0);
  expect(writes.find((request) => request.path.endsWith('/hook'))?.body).toEqual({
    description: 'Updated receiver',
  });
  await page.getByTestId('webhook-rotate').click();
  await expect(page.getByTestId('webhook-confirmation')).toContainText('stop working immediately');
  await page.getByTestId('webhook-confirm').click();
  await expect(page.getByTestId('webhook-secret')).toHaveValue('rotated-test-secret');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('webhook-secret')).toHaveCount(0);
  await page.getByTestId('webhook-test').click();
  await expect(page.getByTestId('webhook-notice')).toContainText('queued');
  await expect(page.getByTestId('webhook-delivery-test')).toContainText('Pending');
  confirmed = true;
  await page.getByTestId('webhook-history-refresh').click();
  await expect(page.getByTestId('webhook-delivery-test')).toContainText('Delivered');
  await page.getByTestId('webhook-redeliver-original').click();
  await page.getByTestId('webhook-confirm').click();
  await expect(page.getByTestId('webhook-confirmation')).toHaveCount(0);
  expect(
    writes.filter((request) => request.path.endsWith('/deliveries/original/redeliver')),
  ).toHaveLength(1);
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: `${base}-history.png`, fullPage: true, animations: 'disabled' });
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, {
    permissions: ['organization.read', 'organization.webhooks.read'],
  });
  await page.reload();
  await expect(page.getByTestId('webhook-delivery-original')).toBeVisible();
  await expect(page.getByTestId('webhook-create')).toHaveCount(0);
  await expect(page.getByTestId('webhook-rotate')).toHaveCount(0);
  await expect(page.getByTestId('webhook-redeliver-original')).toHaveCount(0);
  await expect(page.getByTestId('webhook-secret')).toHaveCount(0);
  await api.mockOrganizationAccess(E2E_ORGANIZATION_ID, { permissions: ['organization.*'] });
  await page.reload();
  await page.getByTestId('webhook-delete').click();
  await expect(page.getByTestId('webhook-confirmation')).toContainText('permanently deleted');
  await page.getByTestId('webhook-confirm').click();
  await expect(page.getByText('No webhooks yet', { exact: true })).toBeVisible();
}
