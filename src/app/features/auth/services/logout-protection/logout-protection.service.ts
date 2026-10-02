import { computed, inject, Service, signal, type Signal, type WritableSignal } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';
import { firstValueFrom } from 'rxjs';
import type { LogoutPendingWork, LogoutProtectionPort } from '@features/auth/ports';
import { LogoutPendingWorkDialog } from '@features/auth/ui/dialogs/logout-pending-work-dialog/logout-pending-work-dialog.component';
import { HlmDialogService } from '@shared/ui/dialog';

/**
 * Service LogoutProtectionService
 *
 * @description
 * Reviews feature-owned durable queues before voluntary logout. Forced revocation bypasses it.
 */
@Service()
export class LogoutProtectionService implements LogoutProtectionPort {
  /**
   * Property dialogs
   * @readonly
   *
   * @description
   * Auth-owned accessible overlay launcher.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {HlmDialogService}
   */
  private readonly dialogs: HlmDialogService = inject(HlmDialogService);
  /**
   * Property queues
   * @readonly
   *
   * @description
   * Durable queues registered by their feature lifecycle owners.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<ReadonlySet<LogoutPendingWork>>}
   */
  private readonly queues: WritableSignal<ReadonlySet<LogoutPendingWork>> = signal<
    ReadonlySet<LogoutPendingWork>
  >(new Set());

  /**
   * Property hasUnsyncedWork
   * @readonly
   *
   * @description
   * Combines durable work indicators from registered features, including blocked operations.
   *
   * @access public
   * @since unreleased
   *
   * @type {Signal<boolean>}
   */
  public readonly hasUnsyncedWork: Signal<boolean> = computed(() =>
    [...this.queues()].some((queue) => queue.hasUnsyncedWork()),
  );
  /**
   * Property checking
   * @readonly
   *
   * @description
   * Prevents repeated logout requests during queue inspection and confirmation.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly checking: WritableSignal<boolean> = signal(false);

  /**
   * Method register
   *
   * @description
   * Registers a durable queue and returns its lifetime cleanup.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {LogoutPendingWork} work - Feature-owned queue.
   *
   * @returns {() => void} Registration cleanup.
   */
  public register(work: LogoutPendingWork): () => void {
    this.queues.update((queues) => new Set([...queues, work]));
    return () =>
      this.queues.update((queues) => new Set([...queues].filter((queue) => queue !== work)));
  }

  /**
   * Method requestLogout
   *
   * @description
   * Reads actual persisted work and guards late confirmations against session replacement.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {() => void} logout - Auth-owned logout command.
   * @param {() => boolean} current - Whether the original authenticated session remains current.
   *
   * @returns {Promise<void>} Review completion.
   */
  public async requestLogout(logout: () => void, current: () => boolean): Promise<void> {
    if (this.checking() || !current()) return;
    this.checking.set(true);
    try {
      const count = await this.countPendingWork();
      if (!current()) return;
      if (count === 0) {
        logout();
        return;
      }
      const ref = this.dialogs.open<'discard' | 'synchronized'>(LogoutPendingWorkDialog, {
        ariaDescribedBy: 'logout-pending-work-description',
        showCloseButton: false,
        context: {
          count,
          synchronize: async (): Promise<number> => {
            if (!current()) throw new Error('The session changed during logout review');
            await Promise.all([...this.queues()].map((queue) => queue.synchronize()));
            if (!current()) throw new Error('The session changed during logout review');
            return this.countPendingWork();
          },
        },
      });
      const choice = await firstValueFrom(ref.closed$);
      if (!current()) return;
      const permitted =
        choice === 'discard' ||
        (choice === 'synchronized' && (await this.countPendingWork()) === 0);
      if (permitted && current()) logout();
    } catch {
      if (current())
        toast.error(
          $localize`:@@auth.logout.pending.unavailable:Local changes could not be checked. Signing out was cancelled.`,
        );
    } finally {
      this.checking.set(false);
    }
  }

  /**
   * Method countPendingWork
   * @method countPendingWork
   *
   * @description
   * Reads queue storage rather than relying on asynchronously refreshed UI counters.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Promise<number>} Total persisted pending operations.
   */
  public async countPendingWork(): Promise<number> {
    const counts = await Promise.all([...this.queues()].map((queue) => queue.count()));
    return counts.reduce((total, count) => total + count, 0);
  }
}
