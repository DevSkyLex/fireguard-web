import type { Locator, Page } from '@playwright/test';

/**
 * Page object ImportsPage
 *
 * @description
 * Wraps the bulk CSV import route (`/organizations/:organizationId/imports`)
 * behind named locators and one method per user intent: expanding the
 * filter bar and adding a field from its "+ Filter" menu.
 */
export class ImportsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#imports');
  public readonly filtersToggle: Locator = this.page.getByTestId('imports-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('imports-filters-add');
  public readonly filterChips: Locator = this.page.getByTestId('imports-filter-chip');
  public readonly report: Locator = this.page.getByTestId('import-job-detail-sheet');
  public readonly resume: Locator = this.page.getByTestId('import-resume');
  public readonly summary: Locator = this.page.getByTestId('import-job-detail-summary');

  /** Opens the report of the named uploaded file. */
  public async openReport(filename: string): Promise<void> {
    await this.root
      .getByRole('button', { name: `View report for ${filename}`, exact: true })
      .click();
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/imports`);
  }

  /** Expands the filter bar via the toolbar's "Filters" toggle, when it is not already open. */
  public async openFilters(): Promise<void> {
    if ((await this.filtersToggle.getAttribute('aria-expanded')) === 'true') return;
    await this.filtersToggle.click();
  }

  /** Opens the "+ Filter" menu and picks the field named `fieldLabel`, e.g. `"Kind"`. */
  public async addFilter(fieldLabel: string): Promise<void> {
    await this.addFilterTrigger.click();
    await this.page
      .getByTestId('imports-filters-add-option')
      .filter({ hasText: fieldLabel })
      .click();
  }

  /** The segmented filter chip naming `fieldLabel`, e.g. `"Kind"`. */
  public filterChip(fieldLabel: string): Locator {
    return this.filterChips.filter({ hasText: fieldLabel });
  }

  /** Removes the filter chip naming `fieldLabel`, clearing just that narrowing. */
  public async removeFilterChip(fieldLabel: string): Promise<void> {
    await this.filterChip(fieldLabel).getByTestId('imports-filter-chip-remove').click();
  }
}
