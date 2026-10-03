import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  Service,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { AUTH_SESSION_PORT, LOGOUT_PROTECTION_PORT } from '@features/auth/ports';
import type { AuthSessionPort, LogoutProtectionPort } from '@features/auth/ports';

/**
 * Service InterventionPwaUpdateService
 * @class InterventionPwaUpdateService
 *
 * @description
 * Coordinates service-worker updates with every registered durable queue. Failed and conflicted
 * operations require synchronization, resolution or explicit discard before applying an update.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class InterventionPwaUpdateService {
  //#region Properties
  /**
   * Property updates
   * @readonly
   *
   * @description
   * Angular service-worker update API emitting version events.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {SwUpdate}
   */
  private readonly updates: SwUpdate = inject<SwUpdate>(SwUpdate);

  /**
   * Property feedback
   * @readonly
   *
   * @description
   * App-wide feedback queue used to tell the user an update is waiting on the
   * outbox.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {FeedbackService}
   */
  private readonly feedback: FeedbackService = inject<FeedbackService>(FeedbackService);

  /**
   * Property work
   * @readonly
   *
   * @description
   * Auth-owned registry combining intervention and messaging work without a sibling dependency.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {LogoutProtectionPort}
   */
  private readonly work: LogoutProtectionPort = inject(LOGOUT_PROTECTION_PORT);

  /**
   * Property auth
   * @readonly
   *
   * @description
   * Session identity fencing asynchronous storage inspection and activation completions.
   *
   * @access private
   * @since unreleased
   *
   * @type {AuthSessionPort}
   */
  private readonly auth: AuthSessionPort = inject(AUTH_SESSION_PORT);

  /**
   * Property document
   * @readonly
   *
   * @description
   * Browser reload boundary; a server document has no active window to reload.
   *
   * @access private
   * @since unreleased
   *
   * @type {Document}
   */
  private readonly document: Document = inject(DOCUMENT);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Lifetime boundary for version monitoring and late asynchronous inspections.
   *
   * @access private
   * @since unreleased
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  /**
   * Property inspectedEmpty
   * @readonly
   *
   * @description
   * Whether the latest persisted inspection confirmed all registered queues empty.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly inspectedEmpty: WritableSignal<boolean> = signal(false);

  /**
   * Property applying
   * @readonly
   *
   * @description
   * Serializes update requests while storage checks and service-worker activation are outstanding.
   *
   * @access private
   * @since unreleased
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly applying: WritableSignal<boolean> = signal(false);

  /**
   * Property inspectionRevision
   *
   * @description
   * Prevents an older queue inspection from advertising a newer queue as empty.
   *
   * @access private
   * @since unreleased
   *
   * @type {number}
   */
  private inspectionRevision: number = 0;

  /**
   * Property waitingNoticeShown
   *
   * @description
   * Limits waiting feedback to one notice per available service-worker version.
   *
   * @access private
   * @since unreleased
   *
   * @type {boolean}
   */
  private waitingNoticeShown: boolean = false;

  /**
   * Property pendingVersion
   * @readonly
   *
   * @description
   * Whether a service-worker version is waiting for a clean outbox.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {WritableSignal<boolean>}
   */
  private readonly pendingVersion: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property updateReady
   * @readonly
   *
   * @description
   * Whether a new application version is waiting to be applied.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly updateReady: Signal<boolean> = this.pendingVersion.asReadonly();

  /**
   * Property canApplyUpdate
   * @readonly
   *
   * @description
   * Whether the latest inspection found no intervention or messaging operations. Activation
   * rechecks persisted work; this signal is an offer rather than authorization to reload.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly canApplyUpdate: Signal<boolean> = computed<boolean>(
    () =>
      this.pendingVersion() &&
      this.inspectedEmpty() &&
      !this.work.hasUnsyncedWork() &&
      !this.applying(),
  );

  /**
   * Property started
   *
   * @description
   * Whether service-worker update monitoring has already been registered.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private started: boolean = false;
  //#endregion

  //#region Constructor
  /**
   * Constructor
   * @constructor
   *
   * @description
   * Reinspects persisted work whenever queue indicators or the authenticated session change.
   *
   * @access public
   * @since unreleased
   */
  public constructor() {
    effect(() => {
      this.work.hasUnsyncedWork();
      this.auth.sessionRevision();
      if (this.pendingVersion()) void this.inspectWork();
    });
    this.destroyRef.onDestroy(() => ++this.inspectionRevision);
  }
  //#endregion

  //#region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Starts service-worker update monitoring.
   * On `VERSION_READY`, raises {@link updateReady}. The persisted inspection keeps the offer
   * blocked until both feature queues are empty, including failed and conflicted operations.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public start(): void {
    if (this.started || !this.updates.isEnabled) return;
    this.started = true;
    this.updates.versionUpdates
      .pipe(
        filter((event) => event.type === 'VERSION_READY'),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.pendingVersion.set(true);
        this.inspectedEmpty.set(false);
        this.waitingNoticeShown = false;
      });
  }

  /**
   * Method applyUpdate
   * @method applyUpdate
   *
   * @description
   * Activates the waiting version and reloads the page.
   * Applying is explicit. Fresh persisted inspections authorize activation and reload even when
   * the reactive offer is still stale; unreadable storage or remaining work refuses both.
   *
   * @access public
   * @since 2.0.0
   *
   * @returns {Promise<void>} Resolves once storage checks and activation settle.
   */
  public async applyUpdate(): Promise<void> {
    if (!this.pendingVersion() || this.applying() || !this.document.defaultView) return;
    this.applying.set(true);
    const revision = this.auth.sessionRevision();
    try {
      if (!(await this.isWorkClear(revision))) return;
      await this.updates.activateUpdate();
      if (!(await this.isWorkClear(revision))) return;
      this.pendingVersion.set(false);
      this.document.defaultView.location.reload();
    } finally {
      this.applying.set(false);
    }
  }

  /**
   * Method inspectWork
   * @method inspectWork
   *
   * @description
   * Refreshes the update offer from durable storage while ignoring obsolete completions.
   *
   * @access private
   * @since unreleased
   *
   * @returns {Promise<void>} Inspection completion.
   */
  private async inspectWork(): Promise<void> {
    const inspection = ++this.inspectionRevision;
    const revision = this.auth.sessionRevision();
    this.inspectedEmpty.set(false);
    const empty = await this.isWorkClear(revision);
    if (inspection !== this.inspectionRevision || revision !== this.auth.sessionRevision()) return;
    this.inspectedEmpty.set(empty);
    if (!empty && !this.waitingNoticeShown) {
      this.waitingNoticeShown = true;
      this.feedback.info(
        $localize`:@@intervention.pwa.waitingLocalWork:Local changes must be synchronized or reviewed before applying this update.`,
        $localize`:@@intervention.pwa.waitingSummary:Update waiting`,
      );
    }
  }

  /**
   * Method isWorkClear
   * @method isWorkClear
   *
   * @description
   * Rejects reload when storage cannot be read, any work remains, or the original session ended.
   *
   * @access private
   * @since unreleased
   *
   * @param {number} revision - Session captured before inspecting storage.
   *
   * @returns {Promise<boolean>} Whether reloading is permitted for this session.
   */
  private async isWorkClear(revision: number): Promise<boolean> {
    try {
      return (
        (await this.work.countPendingWork()) === 0 &&
        revision === this.auth.sessionRevision() &&
        !this.destroyRef.destroyed &&
        !this.work.hasUnsyncedWork()
      );
    } catch {
      return false;
    }
  }
  //#endregion
}
