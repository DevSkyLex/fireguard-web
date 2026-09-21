import { test } from '@playwright/test';
import { verifyAssistantAttempts } from '../support/helpers/assistant-attempts';
test('cancels and retries an assistant attempt', async ({ page }, info) =>
  verifyAssistantAttempts(page, info));
