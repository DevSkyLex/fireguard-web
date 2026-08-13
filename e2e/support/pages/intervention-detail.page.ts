import type { Locator, Page } from '@playwright/test';

/**
 * Page object InterventionDetailPage
 *
 * @description
 * Wraps the intervention detail route
 * (`/organizations/:organizationId/interventions/:interventionId`) behind
 * named locators and one method per user intent: reading the publication
 * issues checklist, activating a blocker, and completing a field-work item.
 *
 * Two copies of `app-intervention-issues-checklist` render in the DOM at
 * once (a `lg:hidden` mobile instance and a `max-lg:hidden` desktop one, each
 * carrying the same `data-testid`) — every locator here scopes to the
 * `:visible` one, matching the desktop viewport this suite runs at.
 */
export class InterventionDetailPage {
  public constructor(private readonly page: Page) {}

  public readonly root: Locator = this.page.locator('#intervention-detail');
  public readonly issuesChecklist: Locator = this.page.locator(
    '[data-testid="intervention-issues-checklist"]:visible',
  );
  public readonly blockerItems: Locator = this.page.locator(
    '[data-testid="intervention-issues-checklist-blocker-item"]:visible',
  );
  public readonly fieldWorkSection: Locator = this.page.getByTestId(
    'intervention-detail-field-work',
  );
  public readonly workItemRows: Locator = this.page.getByTestId('intervention-work-item-row');
  public readonly commandButton: Locator = this.page.locator(
    '[data-testid="intervention-detail-command"]:visible',
  );

  public async goto(organizationId: string, interventionId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions/${interventionId}`);
  }

  /** Activates the first listed blocker, sending the operator to its resolving address. */
  public async activateFirstBlocker(): Promise<void> {
    await this.blockerItems.first().click();
  }

  /** Toggles a work item row's completion by its visible label. */
  public async toggleWorkItem(label: string): Promise<void> {
    await this.workItemRows
      .filter({ hasText: label })
      .getByTestId('intervention-work-item-toggle')
      .click();
  }
}
