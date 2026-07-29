import {
  DestroyRef,
  effect,
  inject,
  Injectable,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ConnectivityService } from '@core/connectivity';
import { MessagingOutboxRepository } from '@features/organization/features/collaboration/data-access';
import { MessagingSyncService, type MessagingReplayResult } from '../messaging-sync';
import { MESSAGING_RETRY_BASE_DELAY_MS, MESSAGING_RETRY_MAX_DELAY_MS } from './constants';

/**
 * Service MessagingSyncCoordinatorService
 * @class MessagingSyncCoordinatorService
 *
 * @description
 * Decides *when* the messaging outbox is drained.
 *
 * Coming back online is the obvious moment, and the one that matters most: a
 * member who wrote in a basement and walked back upstairs expects their
 * messages to leave without touching anything. A pass that leaves work behind
 * schedules another with capped, jittered backoff — jittered so a whole fleet
 * reconnecting after an outage does not arrive at once.
 *
 * There is deliberately no attempt limit. A queued message that stops being
 * retried is a message silently lost, which is what the outbox exists to
 * prevent; work that genuinely cannot succeed is marked failed by the sync
 * service and leaves the loop that way.
 *
 * `start()` is idempotent so wiring it from a feature provider is safe.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MessagingSyncCoordinatorService {
  //#region Properties
  /**
   * Property connectivity
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService = inject(ConnectivityService);

  /**
   * Property sync
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessagingSyncService}
   */
  private readonly sync: MessagingSyncService = inject(MessagingSyncService);

  /**
   * Property outbox
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessagingOutboxRepository}
   */
  private readonly outbox: MessagingOutboxRepository = inject(MessagingOutboxRepository);

  /**
   * Property destroyRef
   * @readonly
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property draining
   * @readonly
   *
   * @description
   * Backing signal of {@link syncing}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly draining: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property syncing
   * @readonly
   *
   * @description
   * Whether a replay pass is running, for the offline surface to show.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly syncing: Signal<boolean> = this.draining.asReadonly();

  /**
   * Property pendingCount
   * @readonly
   *
   * @description
   * How much work is still queued.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  public readonly pendingCount: Signal<number> = this.outbox.pendingCount;

  /**
   * Property failedCount
   * @readonly
   *
   * @description
   * How much work needs the member.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  public readonly failedCount: Signal<number> = this.outbox.failedCount;

  /** Whether {@link start} already ran. */
  private started = false;

  /** Consecutive passes that left work behind. */
  private attempt = 0;

  /** Scheduled retry, if any. */
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  //#endregion

  //#region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Begins watching connectivity. Idempotent.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public start(): void {
    if (this.started) return;
    this.started = true;

    void this.outbox.refresh().catch((): undefined => undefined);

    effect((): void => {
      if (!this.connectivity.online()) return;

      // Reading the count inside the effect also re-runs a drain when
      // something new is queued while already online.
      if (this.outbox.pendingCount() === 0) return;

      void this.flush();
    });

    this.destroyRef.onDestroy((): void => this.cancelRetry());
  }

  /**
   * Method flush
   * @method flush
   *
   * @description
   * Runs one pass and schedules another if it left work behind.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {Promise<void>} A promise resolving once the pass finishes.
   */
  public async flush(): Promise<void> {
    if (this.draining()) return;

    this.cancelRetry();
    this.draining.set(true);

    try {
      const result: MessagingReplayResult = await this.sync.replay();

      if (result.deferred > 0) {
        this.scheduleRetry();

        return;
      }

      this.attempt = 0;
    } catch {
      // The pass itself broke; treat it as deferred work rather than losing
      // the queue.
      this.scheduleRetry();
    } finally {
      this.draining.set(false);
    }
  }
  //#endregion

  //#region Internals
  /**
   * Method scheduleRetry
   * @method scheduleRetry
   *
   * @description
   * Books another pass after a capped, jittered delay.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {void}
   */
  private scheduleRetry(): void {
    if (this.retryTimer !== null) return;

    const ceiling: number = Math.min(
      MESSAGING_RETRY_MAX_DELAY_MS,
      MESSAGING_RETRY_BASE_DELAY_MS * 2 ** this.attempt,
    );

    this.attempt += 1;
    this.retryTimer = setTimeout((): void => {
      this.retryTimer = null;

      if (!this.connectivity.online()) return;

      void this.flush();
    }, Math.random() * ceiling);
  }

  /**
   * Method cancelRetry
   * @method cancelRetry
   *
   * @access private
   * @since 1.0.0
   *
   * @return {void}
   */
  private cancelRetry(): void {
    if (this.retryTimer === null) return;

    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }
  //#endregion
}
