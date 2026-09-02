import type { Locator, Page } from '@playwright/test';

/**
 * Page object ChecklistsPage
 *
 * @description
 * Wraps the checklist template library route
 * (`/organizations/:organizationId/checklists`) behind named locators and
 * one method per user intent: expanding the filter bar and adding a field
 * from its "+ Filter" menu.
 */
export class ChecklistsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#checklists');
  public readonly filtersToggle: Locator = this.page.getByTestId('checklists-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('checklists-filters-add');
  public readonly filterChips: Locator = this.page.getByTestId('checklists-filter-chip');
  public readonly newButton: Locator = this.page.getByTestId('checklists-new');
  public readonly createRoot: Locator = this.page.getByTestId('checklist-create-sheet');
  public readonly createName: Locator = this.page.getByTestId('checklist-create-name');

  /** The "Status" chip's toggle-group, targeted by its accessible group name (`aria-label="Filter by status"`) rather than `data-testid` — see `ApprovalsPage.actionTypeFilter` for why a role locator is the robust choice for an internal value control. */
  public readonly statusFilter: Locator = this.page.getByRole('group', {
    name: 'Filter by status',
  });

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/checklists`);
  }

  /** Expands the filter bar via the toolbar's "Filters" toggle, when it is not already open. */
  public async openFilters(): Promise<void> {
    if ((await this.filtersToggle.getAttribute('aria-expanded')) === 'true') return;
    await this.filtersToggle.click();
  }

  /** Opens the "+ Filter" menu and picks the field named `fieldLabel`, e.g. `"Status"`. */
  public async addFilter(fieldLabel: string): Promise<void> {
    await this.addFilterTrigger.click();
    await this.page
      .getByTestId('checklists-filters-add-option')
      .filter({ hasText: fieldLabel })
      .click();
  }

  /** The segmented filter chip naming `fieldLabel`, e.g. `"Status"`. */
  public filterChip(fieldLabel: string): Locator {
    return this.filterChips.filter({ hasText: fieldLabel });
  }

  /** Removes the filter chip naming `fieldLabel`, clearing just that narrowing. */
  public async removeFilterChip(fieldLabel: string): Promise<void> {
    await this.filterChip(fieldLabel).getByTestId('checklists-filter-chip-remove').click();
  }
}
