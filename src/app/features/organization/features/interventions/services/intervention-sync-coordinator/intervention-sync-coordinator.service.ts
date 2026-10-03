import {
  effect,
  inject,
  Service,
  signal,
  untracked,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { pageVisibility } from '@signality/core';
import { ConnectivityService } from '@core/connectivity';
import { USER_IDENTITY_PORT, type UserIdentityPort } from '@features/account/ports';
import { AUTH_SESSION_PORT, type AuthSessionPort } from '@features/auth/ports';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import {
  ORGANIZATION_CONTEXT_PORT,
  type OrganizationContextPort,
} from '@features/organization/ports';
import { InterventionSyncService } from '../intervention-sync';

/**
 * Service InterventionSyncCoordinatorService
 * @class InterventionSyncCoordinatorService
 *
 * @description
 * Orchestrates background replay of the intervention offline outbox.
 * Triggers outbox replay whenever the application is both online and
 * visible, exposes syncing progress and blocked-operation counts to
 * UI components, and provides imperative `syncAll` and `retryBlocked`
 * entry points for user-initiated synchronization.
 *
 * @version 1.2.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionSyncCoordinatorService {
  //#region Properties
  /**
   * Property session
   * @readonly
   *
   * @description
   * Auth-owned revision binding each synchronization cycle to its initiating session.
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
   * Account identity owning durable intervention operations.
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
   * Workspace context invalidating an obsolete synchronization cycle.
   *
   * @access private
   * @since unreleased
   *
   * @type {OrganizationContextPort}
   */
  private readonly organization: OrganizationContextPort = inject(ORGANIZATION_CONTEXT_PORT);

  /**
   * Property syncingState
   * @readonly
   *
   * @description
   * Mutable backing signal flagged while an outbox replay cycle is in flight;
   * surfaced read-only through {@link syncing}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly syncingState: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property blockedOperationsState
   * @readonly
   *
   * @description
   * Mutable backing signal for the count of conflicted or failed outbox
   * operations. Updated after each replay cycle via {@link refreshStatus}.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<number>}
   */
  private readonly blockedOperationsState: WritableSignal<number> = signal<number>(0);

  /**
   * Property problemState
   * @readonly
   *
   * @description
   * Mutable backing signal for the most recent synchronization error
   * message. Set to the first blocked operation's error string, or null
   * when all operations are clear.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<string | null>}
   */
  private readonly problemState: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Property lastSyncedAtState
   * @readonly
   *
   * @description
   * Mutable backing signal for the timestamp of the last replay cycle that
   * completed clean (no blocked operations, no problem); surfaced read-only
   * through {@link lastSyncedAt}.
   *
   * @access private
   * @since 1.2.0
   *
   * @type {WritableSignal<Date | null>}
   */
  private readonly lastSyncedAtState: WritableSignal<Date | null> = signal<Date | null>(null);

  /**
   * Property syncing
   * @readonly
   *
   * @description
   * Read-only flag indicating whether an outbox replay cycle is currently
   * running. Consumed by UI to show a syncing indicator.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly syncing: Signal<boolean> = this.syncingState.asReadonly();

  /**
   * Property blockedOperations
   * @readonly
   *
   * @description
   * Read-only count of outbox operations in a conflicted or failed state.
   * Consumed by UI components to show sync-error badges.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<number>}
   */
  public readonly blockedOperations: Signal<number> = this.blockedOperationsState.asReadonly();

  /**
   * Property problem
   * @readonly
   *
   * @description
   * Read-only error message from the most recent blocked outbox operation,
   * or null when the outbox is clear. Surfaced in sync-error banners.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  public readonly problem: Signal<string | null> = this.problemState.asReadonly();

  /**
   * Property lastSyncedAt
   * @readonly
   *
   * @description
   * Read-only timestamp of the last outbox replay cycle that finished clean,
   * or null if none has yet. Consumed by UI to show "last synced" status.
   *
   * @access public
   * @since 1.2.0
   *
   * @type {Signal<Date | null>}
   */
  public readonly lastSyncedAt: Signal<Date | null> = this.lastSyncedAtState.asReadonly();

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Offline persistence service used to enumerate pending outbox entries
   * and look up the organization context for each queued intervention.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionOfflineService}
   */
  private readonly offline: InterventionOfflineService = inject<InterventionOfflineService>(
    InterventionOfflineService,
  );

  /**
   * Property sync
   * @readonly
   *
   * @description
   * Low-level replay service that processes individual outbox operations
   * and forwards them to the API.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionSyncService}
   */
  private readonly sync: InterventionSyncService =
    inject<InterventionSyncService>(InterventionSyncService);

  /**
   * Property connectivity
   * @readonly
   *
   * @description
   * Shared connectivity source of truth. Its `online` signal drives outbox
   * replay when connectivity is regained.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {ConnectivityService}
   */
  private readonly connectivity: ConnectivityService =
    inject<ConnectivityService>(ConnectivityService);

  /**
   * Property visibility
   * @readonly
   *
   * @description
   * Reactive page visibility signal. Used to replay the outbox when the
   * user brings the application tab back to the foreground. SSR-safe.
   *
   * @access private
   * @since 1.1.0
   *
   * @type {Signal<DocumentVisibilityState>}
   */
  private readonly visibility: Signal<DocumentVisibilityState> = pageVisibility();

  /**
   * Property started
   * @readonly
   *
   * @description
   * Whether {@link start} has armed the connectivity watcher. The replay
   * effect reads this signal and stays inert until it flips to `true`, so
   * background replay only begins once the feature has bootstrapped.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly started: WritableSignal<boolean> = signal<boolean>(false);
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Registers the connectivity watcher. Once {@link start} arms it, a
   * reactive effect replays the outbox whenever the application is both
   * online and visible, covering the "connectivity regained" and "tab
   * brought back to foreground" cases previously handled by manual
   * `online` / `visibilitychange` listeners.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect((): void => {
      if (!this.started()) return;
      if (!this.session.isAuthenticated() || !this.identity.profile()) return;
      this.session.sessionRevision();
      this.organization.selectedOrganizationId();
      if (this.connectivity.online() && this.visibility() === 'visible') {
        untracked(() => void this.syncAll());
      }
    });
  }
  //#endregion

  //#region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Arms the connectivity watcher. Idempotent and a no-op on the server,
   * where background replay must never run.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public start(): void {
    if (typeof window === 'undefined') return;
    this.started.set(true);
  }

  /**
   * Method syncIntervention
   * @method syncIntervention
   *
   * @description
   * Awaits replay for one intervention before a publication or explicit operation retry.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} organizationId - Owning organization.
   * @param {string} interventionId - Intervention to synchronize.
   *
   * @returns {Promise<void>} Resolves after replay and status refresh.
   */
  public async syncIntervention(organizationId: string, interventionId: string): Promise<void> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent()) return;
    if (this.connectivity.isOffline())
      throw new Error(
        $localize`:@@intervention.sync.connectBeforePublish:Connect before publishing this intervention.`,
      );
    await this.sync.replayOutbox(organizationId, interventionId);
    if (!isCurrent()) return;
    await this.refreshStatus();
  }

  /**
   * Method syncAll
   * @method syncAll
   *
   * @description
   * Replays all pending outbox operations for every intervention that has
   * queued changes, in sequence. Guards against concurrent calls and
   * offline state. Sets {@link syncing} for the duration and updates
   * {@link blockedOperations} and {@link problem} on completion. Stamps
   * {@link lastSyncedAt} only when the cycle completes clean, that is with
   * no blocked operations and no problem.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Promise<void>} Resolves once every intervention outbox has been replayed.
   */
  public async syncAll(): Promise<void> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent() || this.connectivity.isOffline() || this.syncing()) {
      return;
    }
    this.syncingState.set(true);
    this.problemState.set(null);
    try {
      const interventionIds = await this.offline.listInterventionIdsWithOutbox();
      await interventionIds.reduce(
        (previous, interventionId) =>
          previous.then(async (): Promise<void> => {
            if (!isCurrent()) return;
            const organizationId = await this.offline.organizationIdForIntervention(interventionId);
            if (!isCurrent() || !organizationId) return;
            try {
              await this.sync.replayOutbox(organizationId, interventionId);
            } catch {
              if (!isCurrent()) return;
              this.problemState.set(
                $localize`:@@intervention.sync.problem:A temporary synchronization error interrupted this intervention.`,
              );
            }
          }),
        Promise.resolve(),
      );
    } finally {
      if (isCurrent()) await this.refreshStatus();
      if (isCurrent() && this.blockedOperationsState() === 0 && this.problemState() === null) {
        this.lastSyncedAtState.set(new Date());
      }
      this.syncingState.set(false);
    }
  }

  /**
   * Method retryBlocked
   * @method retryBlocked
   *
   * @description
   * Resets all conflicted or permanently-failed outbox operations back to
   * pending so they can be replayed on the next `syncAll` call.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Promise<void>} Resolves once blocked operations are reset and replayed.
   */
  public async retryBlocked(): Promise<void> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent()) return;
    const interventionIds = await this.offline.listInterventionIdsWithOutbox();
    if (!isCurrent()) return;
    const operations = (
      await Promise.all(
        interventionIds.map((interventionId) => this.offline.listOutbox(interventionId)),
      )
    ).flat();
    if (!isCurrent()) return;
    await Promise.all(
      operations
        .filter((operation) => operation.status === 'conflict' || operation.status === 'failed')
        .map((operation) =>
          isCurrent() ? this.offline.retryOutbox(operation.id) : Promise.resolve(),
        ),
    );
    if (!isCurrent()) return;
    await this.syncAll();
  }

  /**
   * Method discardBlocked
   * @method discardBlocked
   *
   * @description
   * Permanently removes all conflicted or failed outbox operations from the
   * queue. Used when an operation can never succeed unchanged (for example a
   * rejected payload) and the user chooses to drop it instead of retrying.
   *
   * @access public
   * @since 1.1.0
   *
   * @returns {Promise<void>} Resolves once blocked operations are removed and status refreshed.
   */
  public async discardBlocked(): Promise<void> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent()) return;
    const interventionIds = await this.offline.listInterventionIdsWithOutbox();
    if (!isCurrent()) return;
    const operations = (
      await Promise.all(
        interventionIds.map((interventionId) => this.offline.listOutbox(interventionId)),
      )
    ).flat();
    if (!isCurrent()) return;
    await Promise.all(
      operations
        .filter((operation) => operation.status === 'conflict' || operation.status === 'failed')
        .map((operation) =>
          isCurrent() ? this.offline.removeOutbox(operation.id) : Promise.resolve(),
        ),
    );
    if (!isCurrent()) return;
    await this.refreshStatus();
  }

  /**
   * Method refreshStatus
   * @method refreshStatus
   *
   * @description
   * Recomputes and exposes the count of blocked (conflicted or failed)
   * outbox operations and the most recent error message. Called after
   * each replay cycle and by the discovery service.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {Promise<void>} Resolves once the status signals are updated.
   */
  public async refreshStatus(): Promise<void> {
    const isCurrent = this.captureReplayContext();
    if (!isCurrent()) return;
    const interventionIds = await this.offline.listInterventionIdsWithOutbox();
    if (!isCurrent()) return;
    const operations = (
      await Promise.all(
        interventionIds.map((interventionId) => this.offline.listOutbox(interventionId)),
      )
    ).flat();
    if (!isCurrent()) return;
    const blocked = operations.filter(
      (operation) => operation.status === 'conflict' || operation.status === 'failed',
    );
    this.blockedOperationsState.set(blocked.length);
    this.problemState.set(blocked[0]?.error ?? null);
  }

  /**
   * Method captureReplayContext
   * @method captureReplayContext
   *
   * @description
   * Captures ownership before reading operations and keeps obsolete cycles from continuing in a
   * replacement session.
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
