import { effect, Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { filter } from 'rxjs';
import { MissionOfflineService } from '@features/organization/features/missions/services';

/**
 * Service MissionPwaUpdateService
 * @class MissionPwaUpdateService
 *
 * @description
 * Coordinates service-worker update prompts with mission offline safety.
 *
 * The service listens to Angular service-worker version events and only
 * proposes reload when mission outbox is clean. If unsynchronized field
 * operations exist, the update is deferred and users receive a warning.
 *
 * @version 1.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MissionPwaUpdateService {
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
  private readonly updates: SwUpdate = inject(SwUpdate);

  /**
   * Property confirmation
   * @readonly
   *
   * @description
   * PrimeNG confirmation service used to prompt the reload dialog.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ConfirmationService}
   */
  private readonly confirmation: ConfirmationService = inject(ConfirmationService);

  /**
   * Property messages
   * @readonly
   *
   * @description
   * PrimeNG message service used for user-facing toasts.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessageService}
   */
  private readonly messages: MessageService = inject(MessageService);

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Mission offline service exposing the unsynced outbox state.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MissionOfflineService}
   */
  private readonly offline: MissionOfflineService = inject(MissionOfflineService);

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
  private readonly updateReady: WritableSignal<boolean> = signal(false);

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
   * Reproposes a deferred update as soon as the mission outbox becomes clean.
   *
   * @access public
   * @since 1.0.0
   */
  public constructor() {
    effect(() => {
      if (this.updateReady() && !this.offline.hasUnsyncedChanges()) {
        this.promptUpdate();
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
   * Starts service-worker update monitoring.
   *
   * On `VERSION_READY`, prompts reload only when the mission offline outbox
   * has no pending operations; otherwise warns the user and defers the
   * update until field changes are synchronized.
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
        this.updateReady.set(true);
        if (this.offline.hasUnsyncedChanges()) {
          this.messages.add({
            severity: 'warn',
            summary: 'Update waiting',
            detail: 'Synchronize field changes before installing the new version.',
          });
        }
      });
  }

  /**
   * Method promptUpdate
   * @method promptUpdate
   *
   * @description
   * Displays the update confirmation once for the waiting version.
   *
   * @access private
   * @since 1.0.0
   *
   * @return {void} Result of the prompt update operation.
   */
  private promptUpdate(): void {
    this.updateReady.set(false);
    this.confirmation.confirm({
      header: 'Application update',
      message: 'A new version is ready. Reload now?',
      accept: () => {
        void this.updates.activateUpdate().then(() => location.reload());
      },
    });
  }
  //#endregion
}
