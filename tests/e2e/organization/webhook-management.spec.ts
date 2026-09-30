import { test } from '@playwright/test';
import { verifyWebhookManagement } from '../support/helpers/webhook-management';
test('manages webhooks with one-time secrets and durable delivery results', async ({
  page,
}, info) => verifyWebhookManagement(page, info));
