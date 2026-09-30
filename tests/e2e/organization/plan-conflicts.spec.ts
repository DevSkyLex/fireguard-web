import { test } from '@playwright/test';
import { verifyPlanConflicts } from '../support/helpers/plan-conflicts';

test('keeps edited coordinates after a conflict and exposes the recorded change', async ({
  page,
}, info) => {
  await verifyPlanConflicts(page, info);
});
