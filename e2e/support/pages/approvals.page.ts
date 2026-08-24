import type { Locator, Page } from '@playwright/test';

/**
 * Page object ApprovalsPage
 *
 * @description
 * Wraps the four-eyes approvals inbox route
 * (`/organizations/:organizationId/approvals`) behind named locators and one
 * method per user intent: expanding the filter bar and adding a field from
 * its "+ Filter" menu.
 */
export class ApprovalsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#approvals');
  public readonly filtersToggle: Locator = this.page.getByTestId('approvals-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('approvals-filters-add');
  public readonly filterChips: Locator = this.page.getByTestId('approvals-filter-chip');

  /**
   * The "Action type" chip's `hlm-select` trigger, targeted by its
   * accessible name rather than `data-testid`: `HlmSelectTrigger`'s
   * `data-testid` (when bound) lands on the inner `<button>`, but this
   * page's chip does not bind it — its `data-testid` stays a static
   * attribute on the `<hlm-select-trigger>` wrapper, one DOM node above
   * the actual focusable, clickable button. Clicking that wrapper opens
   * the popover on Chromium but not reliably on WebKit; the accessible
   * `combobox` role resolves straight to the real button on every engine.
   */
  public readonly actionTypeFilter: Locator = this.page.getByRole('combobox', {
    name: 'Action type',
  });

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/approvals`);
  }

  /** Expands the filter bar via the toolbar's "Filters" toggle, when it is not already open. */
  public async openFilters(): Promise<void> {
    if ((await this.filtersToggle.getAttribute('aria-expanded')) === 'true') return;
    await this.filtersToggle.click();
  }

  /** Opens the "+ Filter" menu and picks the field named `fieldLabel`, e.g. `"Action type"`. */
  public async addFilter(fieldLabel: string): Promise<void> {
    await this.addFilterTrigger.click();
    await this.page
      .getByTestId('approvals-filters-add-option')
      .filter({ hasText: fieldLabel })
      .click();
  }

  /** The segmented filter chip naming `fieldLabel`, e.g. `"Action type"`. */
  public filterChip(fieldLabel: string): Locator {
    return this.filterChips.filter({ hasText: fieldLabel });
  }

  /** Removes the filter chip naming `fieldLabel`, clearing just that narrowing. */
  public async removeFilterChip(fieldLabel: string): Promise<void> {
    await this.filterChip(fieldLabel).getByTestId('approvals-filter-chip-remove').click();
  }
}
