import type { Locator, Page } from '@playwright/test';

/**
 * Page object AuditPage
 *
 * @description
 * Wraps the organization audit journal route
 * (`/organizations/:organizationId/audit`) behind named locators and one
 * method per user intent: expanding the filter bar and adding a field from
 * its "+ Filter" menu.
 */
export class AuditPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#audit-page');
  public readonly filtersToggle: Locator = this.page.getByTestId('audit-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('audit-filters-add');
  public readonly filterChips: Locator = this.page.getByTestId('audit-filter-chip');

  /** The "Action" chip's search combobox, targeted by its accessible name — see `ApprovalsPage.actionTypeFilter` for why a role locator, not `data-testid`, is the robust choice for an internal value control. */
  public readonly actionFilter: Locator = this.page.getByRole('combobox', { name: 'Action' });

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/audit`);
  }

  /** Expands the filter bar via the toolbar's "Filters" toggle, when it is not already open. */
  public async openFilters(): Promise<void> {
    if ((await this.filtersToggle.getAttribute('aria-expanded')) === 'true') return;
    await this.filtersToggle.click();
  }

  /** Opens the "+ Filter" menu and picks the field named `fieldLabel`, e.g. `"Action"`. */
  public async addFilter(fieldLabel: string): Promise<void> {
    await this.addFilterTrigger.click();
    await this.page.getByTestId('audit-filters-add-option').filter({ hasText: fieldLabel }).click();
  }

  /** The segmented filter chip naming `fieldLabel`, e.g. `"Action"`. */
  public filterChip(fieldLabel: string): Locator {
    return this.filterChips.filter({ hasText: fieldLabel });
  }

  /** Removes the filter chip naming `fieldLabel`, clearing just that narrowing. */
  public async removeFilterChip(fieldLabel: string): Promise<void> {
    await this.filterChip(fieldLabel).getByTestId('audit-filter-chip-remove').click();
  }
}
