import { expect, type Locator, type Page } from '@playwright/test';

/**
 * Page object for the intervention detail workspace
 * (`/organizations/:organizationId/interventions/:interventionId`) — the only
 * surface where the offline/sync state is observable.
 *
 * Every element this suite depends on is anchored on a `data-testid`. The
 * previous selectors keyed off Tailwind utility classes (`div.rounded-lg.border`)
 * and literal copy, both of which a redesign changes freely — and a page object
 * that breaks on a class rename reports a styling change as a broken sync engine.
 *
 * Two exceptions are deliberate: `.ql-editor` is Quill's own class (library-owned,
 * not ours), and the buttons stay on `getByRole` because their accessible name is
 * part of the contract this suite should be asserting.
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
    this.root = page.getByTestId('intervention-workspace');
    this.commentEditor = page.locator('.ql-editor');
    this.sendCommentButton = page.getByRole('button', { name: 'Send' });
    this.offlineCommentHint = page.getByTestId('offline-comment-hint');
    this.lastCommentCard = page.getByTestId('activity-comment').last();
    this.syncBlockedBanner = page.getByTestId('sync-blocked-banner');
    this.waitingBanner = page.getByTestId('sync-waiting-banner');
    // Retry / Discard live inside the sync-blocked banner; scope to it so they
    // never collide with an unrelated button elsewhere on the page.
    this.retryButton = this.syncBlockedBanner.getByRole('button', { name: 'Retry' });
    this.discardButton = this.syncBlockedBanner.getByRole('button', { name: 'Discard' });
    this.syncNowButton = this.waitingBanner.getByRole('button', { name: 'Sync now' });
    this.firstWorkItemToggle = page.getByTestId('work-item-toggle').first();
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
