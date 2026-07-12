import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the intervention detail workspace
 * (`/organizations/:organizationId/interventions/:interventionId`) — the only
 * surface where the offline/sync state is observable. There are no data-testids
 * in this feature, so locators target the stable root id, ARIA roles, PrimeNG
 * classes, and i18n source text (the `e2e` build renders the source locale).
 */
export class InterventionDetailPage {
  public readonly page: Page;
  public readonly root: Locator;
  public readonly commentEditor: Locator;
  public readonly sendCommentButton: Locator;
  public readonly offlineCommentHint: Locator;
  public readonly lastCommentCard: Locator;
  public readonly syncBlockedBanner: Locator;
  public readonly waitingBanner: Locator;
  public readonly retryButton: Locator;
  public readonly discardButton: Locator;
  public readonly syncNowButton: Locator;
  public readonly firstWorkItemToggle: Locator;

  public constructor(page: Page) {
    this.page = page;
    this.root = page.locator('#intervention-workspace');
    this.commentEditor = page.locator('.ql-editor');
    this.sendCommentButton = page.getByRole('button', { name: 'Send' });
    this.offlineCommentHint = page.getByText(
      'Comments are saved locally and posted when you reconnect.',
    );
    // The most recent comment card in the activity feed (a bordered card holding
    // a `.comment-prose` body); its text includes the author label and body.
    this.lastCommentCard = page
      .locator('div.rounded-lg.border')
      .filter({ has: page.locator('.comment-prose') })
      .last();
    // The red sync-blocked banner (role=alert) — filtered off the generic error
    // alert by its distinctive copy.
    this.syncBlockedBanner = page
      .getByRole('alert')
      .filter({ hasText: 'synchronization operation' });
    // The amber "waiting to sync" banner (role=status).
    this.waitingBanner = page.getByRole('status').filter({ hasText: 'waiting to sync' });
    // Retry / Discard live inside the sync-blocked banner; scope to it so they
    // never collide with an unrelated button elsewhere on the page.
    this.retryButton = this.syncBlockedBanner.getByRole('button', { name: 'Retry' });
    this.discardButton = this.syncBlockedBanner.getByRole('button', { name: 'Discard' });
    this.syncNowButton = this.waitingBanner.getByRole('button', { name: 'Sync now' });
    this.firstWorkItemToggle = page
      .getByRole('button', { name: 'Toggle work item complete' })
      .first();
  }

  /**
   * Clicks the sync-blocked banner's Discard button and confirms the PrimeNG
   * dialog. The banner button and the dialog's accept button share the label
   * "Discard", so the accept click is scoped to the dialog.
   */
  public async discardBlocked(): Promise<void> {
    await this.discardButton.click();
    await this.page.getByRole('alertdialog').getByRole('button', { name: 'Discard' }).click();
  }

  /** Navigates to the intervention workspace and waits for it to render. */
  public async goto(organizationId: string, interventionId: string): Promise<void> {
    await this.page.goto(`/organizations/${organizationId}/interventions/${interventionId}`);
    await expect(this.root).toBeVisible();
  }

  /**
   * Types a comment into the Quill editor and sends it. Real keystrokes drive
   * Quill's `text-change` event, which is what enables the Send button (a
   * programmatic value set would leave it disabled).
   */
  public async submitComment(text: string): Promise<void> {
    await this.commentEditor.click();
    await this.commentEditor.pressSequentially(text);
    await expect(this.sendCommentButton).toBeEnabled();
    await this.sendCommentButton.click();
  }
}
