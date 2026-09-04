import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  expectNoInternalOverflow,
} from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';
import { AuthPages } from '../support/pages/auth.page';

test('supports touch entry, password reveal and navigation on a phone', async ({
  page,
}, testInfo) => {
  await new ApiMock(page).mockUnauthenticatedSession();
  const auth = new AuthPages(page);
  await auth.gotoLogin();
  await expect(page.locator('#split-layout-brand')).toBeVisible();
  await auth.loginPassword.fill('Passw0rd!');
  const reveal = page.getByRole('button', { name: 'Show password' });
  const revealBox = await reveal.boundingBox();
  expect(revealBox?.width).toBeGreaterThanOrEqual(44);
  expect(revealBox?.height).toBeGreaterThanOrEqual(44);
  await reveal.tap();
  await expect(auth.loginPassword).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hide password' }).tap();
  await expect(auth.loginPassword).toHaveAttribute('type', 'password');

  const createAccount = page.getByRole('link', { name: 'Create one' });
  expect((await createAccount.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await createAccount.tap();
  await expect(auth.registerRoot).toBeVisible();
  const first = await auth.registerFirstName.boundingBox();
  const last = await auth.registerLastName.boundingBox();
  if (!first || !last) throw new Error('Both name fields must be measurable.');
  expect(first.y).toBe(last.y);
  expect(first.height).toBeGreaterThanOrEqual(44);
  await auth.registerSubmit.scrollIntoViewIfNeeded();
  await expect(auth.registerSubmit).toBeInViewport();
  await expectNoHorizontalOverflow(page);
  await expectNoInternalOverflow(page.locator('#split-layout-content'));
  await page.screenshot({
    path: `e2e/artifacts/auth-ux/register-${testInfo.project.name.replaceAll(' ', '-')}.png`,
    animations: 'disabled',
  });
});
