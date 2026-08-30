import type { Locator, Page } from '@playwright/test';

/**
 * Page object InterventionDetailPage
 *
 * @description
 * Wraps the intervention detail route
 * (`/organizations/:organizationId/interventions/:interventionId`) behind
 * named locators and one method per user intent: reading the publication
 * issues checklist, activating a blocker, completing a field-work item, and
 * opening/using the live discussion sheet — including its shared
 * unsaved-changes guard (`@shared/unsaved-changes`) when a draft is pending.
 *
 * Two copies of `app-intervention-issues-checklist` render in the DOM at
 * once — a mobile instance hidden by the `@4xl/detail:hidden` container query
 * and a desktop one hidden by `@max-4xl/detail:hidden`, each carrying the same
 * `data-testid`. Every locator here scopes to the `:visible` one, matching the
 * desktop viewport this suite runs at.
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
  public readonly workItemRows: Locator = this.page.getByTestId('intervention-work-item-table-row');
  public readonly commandButton: Locator = this.page.locator(
    '[data-testid="intervention-detail-command"]:visible',
  );
  public readonly discussionTrigger: Locator = this.page.getByTestId(
    'intervention-detail-discussion-trigger',
  );
  public readonly discussionSheet: Locator = this.page.locator('#intervention-discussion-sheet');
  public readonly discussionThread: Locator = this.discussionSheet.getByTestId('message-thread');
  public readonly discussionComposerInput: Locator =
    this.discussionSheet.getByTestId('message-composer-input');
  public readonly discussionComposerSend: Locator =
    this.discussionSheet.getByTestId('message-composer-send');
  public readonly discussionCloseButton: Locator = this.discussionSheet.getByTestId(
    'intervention-discussion-sheet-close',
  );
  public readonly unsavedChangesDialog: Locator = this.page.getByTestId('unsaved-changes-dialog');
  public readonly unsavedChangesDiscardButton: Locator =
    this.page.getByTestId('unsaved-changes-discard');
  public readonly unsavedChangesCancelButton: Locator = this.unsavedChangesDialog.getByRole(
    'button',
    { name: 'Cancel' },
  );

  public async goto(organizationId: string, interventionId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions/${interventionId}`);
  }

  /** Activates the first listed blocker, sending the operator to its resolving address. */
  public async activateFirstBlocker(): Promise<void> {
    await this.blockerItems.first().click();
  }

  /**
   * Toggles a work item's completion by its visible label.
   *
   * The collection renders as a table or as cards depending on the width of
   * its own container, and the detail page's column is narrow enough that the
   * card form is what shows on a desktop too. Both forms are in the DOM — the
   * switch is CSS — so the locator matches either and takes the visible one.
   */
  public async toggleWorkItem(label: string): Promise<void> {
    await this.workItemToggle(label).click();
  }

  /** The visible completion toggle for one work item, whichever form renders it. */
  public workItemToggle(label: string): Locator {
    return this.page
      .locator(
        '[data-testid="intervention-work-item-table-row"], [data-testid="intervention-work-item-table-card"]',
      )
      .filter({ hasText: label })
      .locator(
        '[data-testid="intervention-work-item-toggle"], [data-testid="intervention-work-item-toggle-card"]',
      )
      .locator('visible=true');
  }

  /** Opens the live discussion sheet from the detail page's header trigger. */
  public async openDiscussion(): Promise<void> {
    await this.discussionTrigger.click();
  }

  /** Writes and sends one message through the discussion sheet's composer. */
  public async sendDiscussionMessage(body: string): Promise<void> {
    await this.discussionComposerInput.fill(body);
    await this.discussionComposerSend.click();
  }

  /** Attempts to close the discussion sheet through its own close button — guarded when a draft is unsaved. */
  public async closeDiscussion(): Promise<void> {
    await this.discussionCloseButton.click();
  }

  /** Confirms the shared unsaved-changes dialog's destructive action, discarding the draft and closing the sheet. */
  public async discardDraftAndClose(): Promise<void> {
    await this.unsavedChangesDiscardButton.click();
  }

  /** Cancels the shared unsaved-changes dialog, keeping the sheet open with the draft intact. */
  public async keepEditingDraft(): Promise<void> {
    await this.unsavedChangesCancelButton.click();
  }
}
