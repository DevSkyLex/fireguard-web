import type { Locator, Page } from '@playwright/test';

/**
 * Page object InterventionsPage
 *
 * @description
 * Wraps the interventions list route (`/organizations/:organizationId/interventions`)
 * behind named locators and one method per user intent: navigating with a raw
 * query string (a shared/bookmarked filtered URL, including the KPI strip's
 * own `?due=overdue`/`?status=submitted` tile links), reading a row,
 * selecting rows, driving the bulk-actions dropdown, adding a filter from the
 * "+ Filter" menu, reading/changing/removing a filter chip, and switching to
 * the "Recurrences" tab to open its create/edit form sheet.
 */
export class InterventionsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#interventions');
  public readonly filtersToggle: Locator = this.page.getByTestId('interventions-filters-toggle');
  public readonly addFilterTrigger: Locator = this.page.getByTestId('interventions-filters-add');
  public readonly mineToggle: Locator = this.page.getByTestId('interventions-mine-toggle');
  public readonly rowCount: Locator = this.page.getByTestId('interventions-row-count');
  public readonly bulkActionsTrigger: Locator = this.page.getByTestId('interventions-bulk-actions');
  public readonly tableRows: Locator = this.page.getByTestId('intervention-table-row');
  public readonly createSheet: Locator = this.page.getByTestId('intervention-create-sheet');
  public readonly selectAll: Locator = this.page.getByTestId('intervention-table-select-all');
  public readonly filterChips: Locator = this.page.getByTestId('interventions-filter-chip');
  public readonly clearFiltersButton: Locator = this.page.getByTestId(
    'interventions-clear-filters',
  );
  public readonly syncIndicatorTrigger: Locator = this.page.getByTestId('intervention-sync-status');
  public readonly recurrencesTrigger: Locator = this.page.getByTestId(
    'interventions-tab-recurrences',
  );
  public readonly recurrencesTable: Locator = this.page.getByTestId(
    'intervention-recurrences-table',
  );
  public readonly recurrencesNew: Locator = this.page.getByTestId('intervention-recurrences-new');
  public readonly recurrenceSheet: Locator = this.page.getByTestId('intervention-recurrence-sheet');

  /** Navigates straight to the list with a raw query string, exercising a shared/bookmarked filtered URL. */
  public async gotoWithQuery(organizationId: string, query: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions?${query}`);
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions`);
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
      .getByTestId('interventions-filters-add-option')
      .filter({ hasText: fieldLabel })
      .click();
  }

  /** The `<tr>` for a row named `name` — every row-scoped locator below reads from here. */
  public row(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /** Checks one row's leading checkbox, selecting it for the bulk toolbar. */
  public async selectRow(name: string): Promise<void> {
    await this.row(name).getByTestId('intervention-table-row-select').click();
  }

  /** The status tag currently shown on a row — the first `app-intervention-tag` cell, status being the leading optional column. */
  public rowStatus(name: string): Locator {
    return this.row(name).locator('app-intervention-tag').first();
  }

  /** Opens the bulk toolbar's "Actions" dropdown. */
  public async openBulkActions(): Promise<void> {
    await this.bulkActionsTrigger.click();
  }

  /** Clicks a bulk "Move to" entry naming `statusLabel`, e.g. `"In progress"`. */
  public async chooseBulkTransition(statusLabel: string): Promise<void> {
    await this.page
      .getByTestId('interventions-bulk-transition')
      .filter({ hasText: statusLabel })
      .click();
  }

  /** The bulk "Move to" entry naming `statusLabel`, for reading its eligible count. */
  public bulkTransitionEntry(statusLabel: string): Locator {
    return this.page.getByTestId('interventions-bulk-transition').filter({ hasText: statusLabel });
  }

  /** The app-wide toast deck's visible entries (spartan's sonner, `role="status"`). */
  public toast(text: string): Locator {
    return this.page.getByRole('status').filter({ hasText: text });
  }

  /** The segmented filter chip naming `fieldLabel`, e.g. `"Status"`. */
  public filterChip(fieldLabel: string): Locator {
    return this.filterChips.filter({ hasText: fieldLabel });
  }

  /** Removes the filter chip naming `fieldLabel`, clearing just that narrowing. */
  public async removeFilterChip(fieldLabel: string): Promise<void> {
    await this.filterChip(fieldLabel).getByTestId('interventions-filter-chip-remove').click();
  }

  /** Clicks a chip's value segment, reopening that field's selector without removing the chip. */
  public async openFilterChipValue(fieldTestId: string): Promise<void> {
    await this.page.getByTestId(fieldTestId).click();
  }

  /** Switches to the "Recurrences" tab. */
  public async openRecurrences(): Promise<void> {
    await this.recurrencesTrigger.click();
  }

  /** Switches to the "Recurrences" tab and opens the create form sheet from its "New recurrence" button. */
  public async openRecurrenceCreate(): Promise<void> {
    await this.openRecurrences();
    await this.recurrencesNew.click();
  }
}
