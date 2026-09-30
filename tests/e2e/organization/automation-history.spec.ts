import { test } from '@playwright/test';
import { verifyAutomationHistory } from '../support/helpers/automation-history';
test('shows automation history and fenced recovery', async ({ page }, info) =>
  verifyAutomationHistory(page, info));
