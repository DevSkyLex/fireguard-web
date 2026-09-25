import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../support/fixtures/api-fixtures';
import { mockMessagesWorkspace } from '../support/helpers/direct-messages';
import { emulateMobilePlatform } from '../support/helpers/interaction-mode';

test('keeps the visible Send message label in the accessible name while sending', async ({
  page,
  context,
}) => {
  await emulateMobilePlatform(context, 'android');
  await mockMessagesWorkspace(page);
  let releasePost!: () => void;
  const heldPost = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  let pendingWriteSeen = false;
  await page.route(/\/api\/conversations\/e2e-direct-2\/messages\/[^/?]+$/, async (route) => {
    if (route.request().method() === 'PUT') {
      pendingWriteSeen = true;
      await heldPost;
    }
    await route.fallback();
  });
  await page.goto(`/organizations/${E2E_ORGANIZATION_ID}/messages/e2e-direct-2`);

  const send = page.getByRole('button', { name: 'Send message' });
  const visibleLabel = send.getByText('Send message', { exact: true });
  await expect(send).toBeVisible();
  await expect(visibleLabel).toBeVisible();
  await page.getByTestId('message-composer-input').fill('Status is ready.');
  await expect(send).toBeEnabled();
  await mkdir('e2e/artifacts/sonar-maintainability-a11y', { recursive: true });
  await send.screenshot({
    path: 'e2e/artifacts/sonar-maintainability-a11y/mobile-send-ready.png',
    animations: 'disabled',
  });

  try {
    await send.click();
    await expect.poll(() => pendingWriteSeen).toBe(true);
    await expect(send).toHaveAttribute('aria-busy', 'true');
    await expect(visibleLabel).toBeVisible();
    await expect(send.locator('hlm-spinner[aria-hidden="true"]')).toBeVisible();
    await send.screenshot({
      path: 'e2e/artifacts/sonar-maintainability-a11y/mobile-send-pending.png',
      animations: 'disabled',
    });
  } finally {
    releasePost();
  }
  await expect(page.getByTestId('message-thread').getByText('Status is ready.')).toBeVisible();
});
