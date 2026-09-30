import { test } from '@playwright/test';
import { verifyChecklistRevisions } from '../support/helpers/checklist-revisions';
test('edits metadata and creates a linked revision on desktop', async ({ page }, info) => {
  await verifyChecklistRevisions(page, info);
});
