import { test } from '@playwright/test';
import { verifyFailedMessages } from '../support/helpers/failed-messages';
test('opens retained failed sends and retries the original client id', async ({ page }, info) => {
  await verifyFailedMessages(page, info);
});
