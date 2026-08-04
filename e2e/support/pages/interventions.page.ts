import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the interventions list
 * (`/organizations/:organizationId/interventions`) — the only surface that
 * renders the two largest shared concepts, `@shared/board` and
 * `@shared/calendar`.
 *
 * The board exposes `data-testid` hooks (`board`, `board-column` carrying a
 * `data-column-id`, `board-card`); the calendar is located through its element
 * selectors and its ARIA-labelled view selector, both of which are part of the
 * component's contract rather than of its Tailwind classes.
 */
export class InterventionsPage {
  public readonly page: Page;
  public readonly root: Locator;
  public readonly viewTabs: Locator;
  public readonly board: Locator;
  public readonly boardColumns: Locator;
  public readonly calendar: Locator;
  public readonly calendarViewSelector: Locator;
  public readonly calendarMonth: Locator;
  public readonly calendarWeek: Locator;
  public readonly calendarAgenda: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#interventions');
    // The view toggle is a `p-selectbutton` (role `group` of toggle buttons),
    // located by its stable testid rather than the retired tablist role.
    this.viewTabs = page.getByTestId('interventions-view-toggle');
    this.board = page.locator('[data-testid="board"]');
    this.boardColumns = page.locator('[data-testid="board-column"]');
    this.calendar = page.locator('app-calendar');
    this.calendarViewSelector = page.getByLabel('Calendar view');
    this.calendarMonth = page.locator('app-calendar-month');
    this.calendarWeek = page.locator('app-calendar-week');
    this.calendarAgenda = page.locator('app-calendar-agenda');
  }

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions`);
    await expect(this.root).toBeVisible();
  }

  /** Switches the page between its List / Board / Calendar views. */
  public async selectView(name: 'List' | 'Board' | 'Calendar'): Promise<void> {
    await this.viewTabs.getByRole('button', { name }).click();
  }

  /** The cards currently sitting in one board lane. */
  public cardsIn(columnId: string): Locator {
    return this.page
      .locator(`[data-testid="board-column"][data-column-id="${columnId}"]`)
      .locator('[data-testid="board-card"]');
  }

  /** The count badge a lane's header renders beside its label. */
  public column(columnId: string): Locator {
    return this.page.locator(`[data-testid="board-column"][data-column-id="${columnId}"]`);
  }

  /** Switches the calendar between its Month / Week / Agenda views. */
  public async selectCalendarView(name: 'Month' | 'Week' | 'Agenda'): Promise<void> {
    await this.calendarViewSelector.getByRole('button', { name }).click();
  }
}
