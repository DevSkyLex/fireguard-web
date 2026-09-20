import type { Locator, Page } from '@playwright/test';
import { E2E_ORGANIZATION_ID } from '../fixtures/api-fixtures';

/** User-facing workload navigation and native Spartan detail surfaces. */
export class WorkloadPage {
  public constructor(private readonly page: Page) {}
  public readonly root: Locator = this.page.getByTestId('workload-page');
  public readonly matrix: Locator = this.page.getByTestId('workload-matrix');
  public readonly mobileList: Locator = this.page.getByTestId('workload-mobile-list');
  public readonly detail: Locator = this.page.locator('hlm-sheet-content');
  public async goto(): Promise<void> {
    await this.page.goto('/organizations/' + E2E_ORGANIZATION_ID + '/workload');
  }
  public overloadedDay(): Locator {
    return this.root.getByRole('button').filter({ hasText: 'Overload: 1 h' });
  }

  /** Uses the shared filter picker and its native desktop or tactile option surface. */
  public async filterBy(
    field: 'Member' | 'Team' | 'Load',
    option: string,
    touch = false,
  ): Promise<void> {
    const toggle = this.page.getByTestId('workload-filters-toggle');
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      if (touch) await toggle.tap();
      else await toggle.click();
    }
    const add = this.page.getByTestId('workload-filters-add');
    if (touch) await add.tap();
    else await add.click();
    const choice = this.page
      .getByTestId('workload-filters-add-option')
      .filter({ hasText: new RegExp('^' + field + '$') });
    if (touch) await choice.tap();
    else await choice.click();
    const value = this.page
      .getByRole('option')
      .filter({ has: this.page.getByText(option, { exact: true }) });
    if (touch) await value.tap();
    else await value.click();
  }
}
