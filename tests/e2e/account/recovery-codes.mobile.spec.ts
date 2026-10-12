import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, setDarkTheme } from '../support/helpers/appearance';
import { ApiMock } from '../support/mocks/api-mock';

for (const theme of ['light', 'dark'] as const) {
  test(`generates and clears recovery codes with keyboard focus in ${theme} mode`, async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    if (theme === 'dark') await setDarkTheme(context, baseURL ?? 'http://localhost:4273');
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ profile: { totpEnabled: true } });
    await api.mockAccountVisualReads();
    const codes = Array.from(
      { length: 10 },
      (_, index) => index.toString(16).padStart(32, 'a').match(/.{4}/g)?.join('-') ?? '',
    );
    await page.route('**/api/otp/totp/recovery-codes', async (route) => {
      if (route.request().method() === 'POST') {
        expect(route.request().postDataJSON()).toEqual({ code: '123456' });
        expect(route.request().headers()['idempotency-key']).toMatch(/^[a-f0-9-]{36}$/);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            '@id': '/api/otp/totp/recovery-codes',
            '@type': 'RecoveryCodes',
            codes,
            generatedAt: '2026-10-11T12:00:00Z',
          }),
        });
      } else
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            '@id': '/api/otp/totp/recovery-codes',
            '@type': 'RecoveryStatus',
            remainingCount: 10,
            generatedAt: null,
          }),
        });
    });
    await page.goto('/account/security');
    const panel = page.locator('#account-recovery-codes');
    await expect(panel).toBeVisible();
    await panel.getByRole('button', { name: 'Generate recovery codes', exact: true }).click();
    await panel.locator('#recovery-generate-proof').fill('123456');
    await expect(panel.locator('li')).toHaveCount(10);
    const close = panel.getByRole('button', { name: 'I saved my codes', exact: true });
    await expect(close).toBeFocused();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: testInfo.outputPath(`recovery-codes-${theme}.png`),
      animations: 'disabled',
    });
    const storage = await page.evaluate(() =>
      JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
    );
    for (const code of codes) expect(storage).not.toContain(code);
    await close.press('Enter');
    await expect(panel.locator('li')).toHaveCount(0);
    await expect(
      panel.getByRole('button', { name: 'Generate recovery codes', exact: true }),
    ).toBeFocused();
    await page.reload();
    await expect(panel.locator('li')).toHaveCount(0);
  });
}
