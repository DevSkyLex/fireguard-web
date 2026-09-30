import { test } from '@playwright/test';
import { verifyCalendarCompleteness } from '../support/helpers/calendar-completeness';

test('shows source failures and recovers a complete shorter calendar period', async ({
  page,
}, info) => {
  await verifyCalendarCompleteness(page, info);
});
