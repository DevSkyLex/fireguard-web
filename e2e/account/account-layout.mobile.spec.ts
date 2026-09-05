import { expect, test } from '@playwright/test';
import { ApiMock } from '../support/mocks/api-mock';

test.describe('Account layout', () => {
  test('keeps the account settings tabs usable without horizontal page overflow on mobile', async ({
    page,
  }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession();

    await page.goto('/account/profile');

    const tabList = page.getByRole('tablist', { name: 'Account settings sections', exact: true });
    const profileTab = tabList.getByRole('tab', { name: 'Profile', exact: true });
    const securityTab = tabList.getByRole('tab', { name: 'Security', exact: true });

    await expect(tabList).toBeVisible();
    await expect(tabList.getByRole('tab')).toHaveCount(4);
    await expect(profileTab).toHaveAttribute('aria-selected', 'true');
    await expect(securityTab).toBeVisible();

    const profileBox = await profileTab.boundingBox();
    const securityBox = await securityTab.boundingBox();

    expect(profileBox).not.toBeNull();
    expect(securityBox).not.toBeNull();
    expect(profileBox?.y).toBe(securityBox?.y);

    await securityTab.click();
    await expect(page).toHaveURL(/\/account\/security$/);
    await expect(page.getByRole('heading', { name: 'Security', exact: true })).toBeVisible();

    const hasHorizontalOverflow: boolean = await page.evaluate(
      (): boolean => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
});
