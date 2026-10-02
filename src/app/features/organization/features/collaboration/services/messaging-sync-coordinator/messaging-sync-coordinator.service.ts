import {
  DestroyRef,
  effect,
  inject,
  Service,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { ConnectivityService } from '@core/connectivity';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { MessagingOutboxRepository } from '@features/organization/features/collaboration/data-access';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { MessagingSyncService, type MessagingReplayResult } from '../messaging-sync';
import { MESSAGING_RETRY_BASE_DELAY_MS, MESSAGING_RETRY_MAX_DELAY_MS } from './constants';

/**
 * Service MessagingSyncCoordinatorService
 * @class MessagingSyncCoordinatorService
 *
 * @description
 * Decides *when* the messaging outbox is drained.
 * Coming back online is the obvious moment, and the one that matters most: a
 * member who wrote in a basement and walked back upstairs expects their
 * messages to leave without touching anything. A pass that leaves work behind
 * schedules another with capped, jittered backoff — jittered so a whole fleet
 * reconnecting after an outage does not arrive at once.
 * There is deliberately no attempt limit. A queued message that stops being
 * retried is a message silently lost, which is what the outbox exists to
 * prevent; work that genuinely cannot succeed is marked failed by the sync
 * service and leaves the loop that way.
 * `start()` is idempotent so wiring it from a feature provider is safe.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MessagingSyncCoordinatorService {
  //#region Properties
  /**
   * Property session
   * @readonly
   *
   * @description
   * Auth-owned revision binding retries to the session that started their pass.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly session: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property identity
   * @readonly
   *
   * @description
   * Account identity owning durable message operations.
   *
   * @access private
   * @since unreleased
   *
   * @type {UserIdentityPort}
   */
  private readonly identity: UserIdentityPort = inject(USER_IDENTITY_PORT);

  /**
   * Property organization
   * @readonly
   *
   * @description
   * Workspace context invalidating an obsolete retry.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  private readonly organization: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Connectivity source deciding whether background replay can start.
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
   * @description
   * Messaging-owned replay workflow.
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
   * @description
   * Durable messaging queue and published operation counts.
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
   * @description
   * Lifetime boundary cancelling pending background retries.
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

  /**
   * Property started
   *
   * @description
   * Whether the background connectivity watcher has started.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private started = false;

  /**
   * Property attempt
   *
   * @description
   * Consecutive passes leaving temporary failures behind, used for retry backoff.
   *
   * @access private
   * @since unreleased
   *
   * @type {number}
   */
  private attempt = 0;

  /**
   * Property retryTimer
   *
   * @description
   * Pending background retry timer, or null when none is scheduled.
   *
   * @access private
   * @since unreleased
   *
   * @type {ReturnType<typeof setTimeout> | null}
   */
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
   * @returns {void}
   */
  public start(): void {
    if (this.started) return;
    this.started = true;

    void this.outbox.refresh().catch((): undefined => undefined);

    effect((): void => {
      if (!this.session.isAuthenticated() || !this.identity.profile()) return;
      this.session.sessionRevision();
      this.organization.selectedOrganizationId();
      if (!this.connectivity.online()) return;

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
   * @returns {Promise<void>} A promise resolving once the pass finishes.
   */
  public async flush(): Promise<void> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent() || this.draining()) return;

    this.cancelRetry();
    this.draining.set(true);

    try {
      const result: MessagingReplayResult = await this.sync.replay();
      if (!isCurrent()) return;

      if (result.deferred > 0) {
        this.scheduleRetry(isCurrent);

        return;
      }

      this.attempt = 0;
    } catch {
      if (isCurrent()) this.scheduleRetry(isCurrent);
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
   * @param {() => boolean} isCurrent - Whether the session and workspace still own this retry.
   *
   * @returns {void}
   */
  private scheduleRetry(isCurrent: () => boolean): void {
    if (this.retryTimer !== null) return;

    const ceiling: number = Math.min(
      MESSAGING_RETRY_MAX_DELAY_MS,
      MESSAGING_RETRY_BASE_DELAY_MS * 2 ** this.attempt,
    );

    this.attempt += 1;
    this.retryTimer = setTimeout((): void => {
      this.retryTimer = null;

      if (!isCurrent() || !this.connectivity.online()) return;

      void this.flush();
    }, Math.random() * ceiling);
  }

  /**
   * Method cancelRetry
   * @method cancelRetry
   *
   * @description
   * Cancels the scheduled retry before an explicit flush or teardown.
   *
   * @access private
   * @since 1.0.0
   *
   * @returns {void}
   */
  private cancelRetry(): void {
    if (this.retryTimer === null) return;

    clearTimeout(this.retryTimer);
    this.retryTimer = null;
  }

  /**
   * Method captureReplayContext
   * @method captureReplayContext
   *
   * @description
   * Captures ownership before a flush and prevents its completion from scheduling work for another
   * session.
   *
   * @access private
   * @since unreleased
   *
   * @returns {() => boolean} Whether the initiating account, session and workspace still own this
   *   cycle.
   */
  private captureReplayContext(): () => boolean {
    const revision = this.session.sessionRevision();
    const owner = this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null;
    const organizationId = this.organization.selectedOrganizationId();
    return (): boolean =>
      owner !== null &&
      this.session.isAuthenticated() &&
      revision === this.session.sessionRevision() &&
      owner === (this.identity.profile()?.id ?? this.identity.profile()?.sub ?? null) &&
      organizationId === this.organization.selectedOrganizationId();
  }
  //#endregion
}
