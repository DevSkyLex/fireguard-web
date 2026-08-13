import type { Locator, Page } from '@playwright/test';

/**
 * Page object InterventionsPage
 *
 * @description
 * Wraps the interventions list route (`/organizations/:organizationId/interventions`)
 * behind named locators and one method per user intent: navigating with a raw
 * query string (a shared/bookmarked filtered URL), reading a row, selecting
 * rows and driving the bulk-actions dropdown.
 */
export class InterventionsPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#interventions');
  public readonly filtersTrigger: Locator = this.page.getByTestId('interventions-filters-trigger');
  public readonly mineToggle: Locator = this.page.getByTestId('interventions-mine-toggle');
  public readonly rowCount: Locator = this.page.getByTestId('interventions-row-count');
  public readonly bulkActionsTrigger: Locator = this.page.getByTestId('interventions-bulk-actions');
  public readonly tableRows: Locator = this.page.getByTestId('intervention-table-row');
  public readonly createSheet: Locator = this.page.getByTestId('intervention-create-sheet');
  public readonly selectAll: Locator = this.page.getByTestId('intervention-table-select-all');

  /** Navigates straight to the list with a raw query string, exercising a shared/bookmarked filtered URL. */
  public async gotoWithQuery(organizationId: string, query: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions?${query}`);
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions`);
  }

  /** The badge on the Filters trigger, or `null` when no narrowing is active. */
  public async activeFilterCount(): Promise<string | null> {
    return this.filtersTrigger.getByText(/^\d+$/).textContent();
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
}
