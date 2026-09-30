import type { Locator, Page } from '@playwright/test';

/**
 * Page object MaintenanceSchedulesPage
 *
 * @description
 * Wraps the maintenance schedule board route
 * (`/organizations/:organizationId/maintenance`) behind named locators and
 * one method per user intent: expanding the filter bar and adding a field
 * from its "+ Filter" menu.
 */
export class MaintenanceSchedulesPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#maintenance-schedules');
  public readonly filtersToggle: Locator = this.page.getByTestId('maintenance-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('maintenance-filters-add');
  public readonly filterChips: Locator = this.page.getByTestId('maintenance-filter-chip');

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/maintenance`);
  }

  /** Expands the filter bar via the toolbar's "Filters" toggle, when it is not already open. */
  public async openFilters(): Promise<void> {
    if ((await this.filtersToggle.getAttribute('aria-expanded')) === 'true') return;
    await this.filtersToggle.click();
  }

  /** Opens the "+ Filter" menu and picks the field named `fieldLabel`, e.g. `"Due status"`. */
  public async addFilter(fieldLabel: string): Promise<void> {
    await this.addFilterTrigger.click();
    await this.page
      .getByTestId('maintenance-filters-add-option')
      .filter({ hasText: fieldLabel })
      .click();
  }

  /** The segmented filter chip naming `fieldLabel`, e.g. `"Due status"`. */
  public filterChip(fieldLabel: string): Locator {
    return this.filterChips.filter({ hasText: fieldLabel });
  }

  /** Removes the filter chip naming `fieldLabel`, clearing just that narrowing. */
  public async removeFilterChip(fieldLabel: string): Promise<void> {
    await this.filterChip(fieldLabel).getByTestId('maintenance-filter-chip-remove').click();
  }
}
