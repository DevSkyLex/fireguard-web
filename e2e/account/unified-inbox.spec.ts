import { test } from '@playwright/test';
import { verifyUnifiedInbox } from '../support/helpers/unified-inbox';

test('recovers and paginates the unified inbox with source-owned reads', async ({ page }, info) => {
  await verifyUnifiedInbox(page, info);
});
