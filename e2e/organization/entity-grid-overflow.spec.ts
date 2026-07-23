import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';

/**
 * Entity grids must scroll, not clip.
 *
 * The shared table shell (`TABLE_CARD_SHELL_STYLE_CLASS`) is `overflow-hidden`,
 * while every grid declares rem-based column floors (`min-w-64`, `min-w-36`, …).
 * Whenever those floors outgrow the card — a narrow viewport, a wider type
 * scale, a new column — the rightmost columns become unreachable unless the
 * table container is scrollable. `FireguardTheme` grants that centrally, in the
 * `datatable` preset's `css` block.
 *
 * This is invisible to unit tests: nothing throws, the markup is unchanged, and
 * only a real layout engine shows the clipping. Hence an e2e guard.
 */
test.describe('Entity grid overflow', () => {
  const organization = organizationOutput();

  test('scrolls the grid instead of clipping it against the card', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });

    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    await page.goto(`/organizations/${organization.id}/members`);
    await page.locator('#organization-members').waitFor({ state: 'visible' });

    const container = page.locator('.p-datatable-table-container').first();
    await container.waitFor({ state: 'attached' });

    const overflowX = await container.evaluate(
      (element: HTMLElement) => getComputedStyle(element).overflowX,
    );

    expect(overflowX).toBe('auto');

    // The card that clips is the one the shared shell marks overflow-hidden;
    // the scroller has to live inside it, not on it.
    const cardOverflow = await container.evaluate((element: HTMLElement) => {
      const card = element.closest('.p-card');

      return card ? getComputedStyle(card).overflow : null;
    });

    expect(cardOverflow).toBe('hidden');
  });
});
