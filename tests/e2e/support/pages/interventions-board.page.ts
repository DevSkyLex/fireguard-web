import type { Locator, Page } from '@playwright/test';

/**
 * Page object InterventionsBoardPage
 *
 * @description
 * Wraps the Kanban board route
 * (`/organizations/:organizationId/interventions/board`): navigating to it,
 * reading a column's cards, and driving a card's "Move to…" menu — the
 * keyboard/AT-equivalent path this suite uses instead of simulating a CDK
 * pointer drag (flaky in Playwright; see the spec's own docblock).
 */
export class InterventionsBoardPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#interventions-board');
  public readonly columns: Locator = this.page.getByTestId('board-column');
  public readonly cards: Locator = this.page.getByTestId('intervention-board-card');

  public async goto(organizationId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions/board`);
  }

  /** The column for a given `InterventionStatus`, e.g. `"planned"`. */
  public column(status: string): Locator {
    return this.page.locator(`[data-testid="board-column"][data-column-id="${status}"]`);
  }

  /** The card whose title contains `name`, wherever it currently is. */
  public card(name: string): Locator {
    return this.cards.filter({ hasText: name });
  }

  /** The cards currently rendered inside a given column. */
  public cardsIn(status: string): Locator {
    return this.column(status).getByTestId('intervention-board-card');
  }

  /** Opens a card's own "Move to…" menu. */
  public async openCardMenu(name: string): Promise<void> {
    await this.card(name).getByTestId('intervention-board-card-menu').click();
  }

  /** Picks a status target from an already-open card menu, e.g. `"Submitted"`. */
  public async chooseMove(statusLabel: string): Promise<void> {
    await this.page
      .getByTestId('intervention-board-card-move')
      .filter({ hasText: statusLabel })
      .click();
  }

  /** The visually-hidden `aria-live="polite"` region announcing the last optimistic move. */
  public readonly liveRegion: Locator = this.page.getByTestId('board-live-region');
}
