import { computed, Service, inject, signal, type Signal, type WritableSignal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';

/**
 * Service InterventionPwaUpdateService
 * @class InterventionPwaUpdateService
 *
 * @description
 * Coordinates service-worker update prompts with intervention offline safety.
 *
 * The service listens to Angular service-worker version events and only
 * proposes reload when the intervention outbox has no field operations still
 * waiting to synchronize. It defers on `pending` operations only — never on
 * `conflict`/`failed` operations, which can never sync on their own and would
 * otherwise deadlock the update indefinitely.
 *
 * @version 1.0.0
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
   * Property offline
   * @readonly
   *
   * @description
   * Intervention offline service exposing the unsynced outbox state.
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
   * Property updateReady
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
   * Whether the waiting version may be applied right now, which requires the
   * intervention outbox to be free of pending operations. This is the offline
   * safety rule of this service: a reload while field changes are queued would
   * lose them.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly canApplyUpdate: Signal<boolean> = computed<boolean>(
    () => this.pendingVersion() && !this.offline.hasPendingChanges(),
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

  //#region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Starts service-worker update monitoring.
   *
   * On `VERSION_READY`, raises {@link updateReady}. When the intervention
   * offline outbox still holds pending operations, it also queues an
   * informational message: the update stays available but must wait for the
   * queued field changes to synchronize, which {@link canApplyUpdate} tracks.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {void}
   */
  public start(): void {
    if (this.started || !this.updates.isEnabled) return;
    this.started = true;
    this.updates.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.pendingVersion.set(true);
        if (this.offline.hasPendingChanges()) {
          this.feedback.info(
            $localize`:@@intervention.pwa.waitingDetail:Field changes are still syncing. The update will install once they are saved.`,
            $localize`:@@intervention.pwa.waitingSummary:Update waiting`,
          );
        }
      });
  }

  /**
   * Method applyUpdate
   * @method applyUpdate
   *
   * @description
   * Activates the waiting version and reloads the page.
   *
   * Applying is left to the caller rather than triggered automatically: a
   * reload the user did not ask for interrupts field work, so the decision
   * belongs to whoever can ask them. Refuses while
   * {@link canApplyUpdate} is false.
   *
   * @access public
   * @since 2.0.0
   *
   * @return {Promise<void>} Resolves once the new version has been activated.
   */
  public async applyUpdate(): Promise<void> {
    if (!this.canApplyUpdate()) return;

    this.pendingVersion.set(false);
    await this.updates.activateUpdate();
    location.reload();
  }
  //#endregion
}
