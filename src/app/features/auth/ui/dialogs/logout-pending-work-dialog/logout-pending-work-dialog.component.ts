import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButton } from '@shared/ui/button';
import { HlmDialogImports } from '@shared/ui/dialog';
import { HlmSpinner } from '@shared/ui/spinner';

/**
 * Interface LogoutPendingWorkContext
 * @interface LogoutPendingWorkContext
 *
 * @description
 * Pending local operations and a session-bound synchronization callback.
 */
export interface LogoutPendingWorkContext {
  /**
   * Property count
   * @readonly
   *
   * @description
   * Persisted pending operation count when the review opens.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {number}
   */
  readonly count: number;
  /**
   * Property synchronize
   * @readonly
   *
   * @description
   * Session-bound replay returning the remaining persisted operation count.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {() => Promise<number>}
   */
  readonly synchronize: () => Promise<number>;
}

/**
 * Component LogoutPendingWorkDialog
 *
 * @description
 * Requires an explicit choice before locally persisted work can be removed by logout.
 */
@Component({
  selector: 'app-logout-pending-work-dialog',
  imports: [HlmDialogImports, HlmButton, HlmSpinner],
  templateUrl: './logout-pending-work-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoutPendingWorkDialog {
  /**
   * Property context
   * @readonly
   *
   * @description
   * Pending queue snapshot and session-bound replay callback.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {LogoutPendingWorkContext}
   */
  private readonly context: LogoutPendingWorkContext =
    injectBrnDialogContext<LogoutPendingWorkContext>();
  /**
   * Property dialog
   * @readonly
   *
   * @description
   * Native overlay reference recording the user's explicit decision.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {BrnDialogRef<'discard' | 'synchronized'>}
   */
  private readonly dialog: BrnDialogRef<'discard' | 'synchronized'> =
    inject<BrnDialogRef<'discard' | 'synchronized'>>(BrnDialogRef);
  /**
   * Property count
   * @readonly
   *
   * @description
   * Current persisted operation count, refreshed after replay.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  protected readonly count: WritableSignal<number> = signal(this.context.count);
  /**
   * Property busy
   * @readonly
   *
   * @description
   * Prevents duplicate decisions while a synchronization attempt is active.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly busy: WritableSignal<boolean> = signal(false);
  /**
   * Property failed
   * @readonly
   *
   * @description
   * Announces replay failure or retained conflicts without removing local data.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  protected readonly failed: WritableSignal<boolean> = signal(false);

  /**
   * Method synchronize
   *
   * @description
   * Keeps the dialog open when replay fails or local conflicts remain.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {Promise<void>} Synchronization attempt completion.
   */
  protected async synchronize(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    try {
      const remaining = await this.context.synchronize();
      this.count.set(remaining);
      if (remaining === 0) this.dialog.close('synchronized');
      else this.failed.set(true);
    } catch {
      this.failed.set(true);
    } finally {
      this.busy.set(false);
    }
  }

  /**
   * Method cancel
   *
   * @description
   * Closes the review while retaining the session and all local operations.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected cancel(): void {
    if (!this.busy()) this.dialog.close();
  }

  /**
   * Method discard
   *
   * @description
   * Records explicit agreement to remove local operations through the normal logout lifecycle.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected discard(): void {
    if (!this.busy()) this.dialog.close('discard');
  }
}
