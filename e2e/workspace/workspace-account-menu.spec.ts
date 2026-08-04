import { expect, test } from '@playwright/test';
import { organizationOutput } from '../support/fixtures/api-fixtures';
import { ApiMock } from '../support/mocks/api-mock';
import { WorkspacePage } from '../support/pages/workspace.page';

/**
 * Workspace account menu — the seat avatar in the workspace header
 * (`AccountMenu`, `src/app/features/account/ui/components/account-menu`).
 *
 * It sat at the foot of the 60px organization rail until the shell dropped
 * that column; the header exists at every width, so profile and sign-out are
 * reachable on a phone too. Kept as its own e2e spec — not folded into a unit
 * spec — because it proves real-overlay focus management (`[autofocus]`
 * moving focus into the popover, Escape handing it back to the trigger) that
 * a component spec cannot reliably assert.
 */
test.describe('Workspace account menu', () => {
  const organization = organizationOutput();

  test('opens from the header and restores focus to the trigger on dismissal', async ({ page }) => {
    const api = new ApiMock(page);
    await api.mockAuthenticatedSession({ organizations: [organization] });

    const workspace = new WorkspacePage(page);
    await workspace.goto(organization.id);

    const trigger = page.getByTestId('account-menu-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.click();

    await expect(page.getByTestId('account-menu-profile')).toBeVisible();
    await expect(page.getByTestId('account-menu-logout')).toBeVisible();
    // The disclosure state used to be hard-coded `false`, so the menu
    // announced as collapsed however many times it had been opened.
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // PrimeNG moves focus into the overlay only for an `[autofocus]` element.
    await expect(page.getByTestId('account-menu-profile')).toBeFocused();

    // …and dismissing it has to hand focus back, or the next Tab restarts
    // from the top of the document.
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('account-menu-profile')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
