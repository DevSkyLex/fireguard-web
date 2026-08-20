import type { Locator, Page } from '@playwright/test';

/**
 * Page object InterventionsCalendarPage
 *
 * @description
 * Wraps the Calendar route
 * (`/organizations/:organizationId/interventions/calendar`): navigating to
 * it, reading the selected day's entries, and stepping the month.
 */
export class InterventionsCalendarPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#interventions-calendar');
  public readonly dayPanel: Locator = this.page.getByTestId('intervention-calendar-day-panel');
  public readonly entries: Locator = this.dayPanel.getByTestId('intervention-calendar-entry');

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions/calendar`);
  }

  /** The month grid's cell for a given `yyyy-MM-dd` day. */
  public day(iso: string): Locator {
    return this.page.locator(`[data-testid="calendar-day"][data-day="${iso}"]`);
  }

  /** Selects a day on the grid, revealing its entries in the day panel. */
  public async selectDay(iso: string): Promise<void> {
    await this.day(iso).click();
  }

  /** The desktop day panel's entry whose title contains `name` — scoped there since the mobile agenda renders the same entry a second time, off-screen at the default viewport. */
  public entry(name: string): Locator {
    return this.entries.filter({ hasText: name });
  }
}
