import { DestroyRef, ErrorHandler, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { authStoreEvents } from '@features/auth/state';
import { InterventionDatabaseService } from '../intervention-offline';

/**
 * Service InterventionOfflineLifecycleService
 * @class InterventionOfflineLifecycleService
 *
 * @description
 * Coordinates authentication lifecycle events with intervention offline
 * storage. On logout, clears all locally persisted intervention data so
 * that the next authenticated user starts with a clean state.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class InterventionOfflineLifecycleService {
  //#region Properties
  /**
   * Property database
   * @readonly
   *
   * @description
   * IndexedDB infrastructure used to reset owner data on logout.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {InterventionDatabaseService}
   */
  private readonly database: InterventionDatabaseService = inject<InterventionDatabaseService>(InterventionDatabaseService);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Angular destroy reference used to unsubscribe the logout listener
   * when the service is destroyed.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {DestroyRef}
   */
  private readonly destroyRef: DestroyRef = inject<DestroyRef>(DestroyRef);

  /**
   * Property errorHandler
   * @readonly
   *
   * @description
   * Angular error handler used to report offline cleanup failures without
   * crashing the logout flow.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ErrorHandler}
   */
  private readonly errorHandler: ErrorHandler = inject<ErrorHandler>(ErrorHandler);

  /**
   * Property events
   * @readonly
   *
   * @description
   * NgRx signal events stream used to react to `logoutSucceeded`.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Events}
   */
  private readonly events: Events = inject<Events>(Events);

  /**
   * Property started
   *
   * @description
   * Whether lifecycle listeners have already been registered; prevents
   * double-registration when `start()` is called more than once.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private started = false;
  //#endregion

  //#region Methods
  /**
   * Method start
   * @method start
   *
   * @description
   * Registers the logout listener once for the application lifecycle.
   * Subsequent calls are no-ops. On `logoutSucceeded`, resets all locally
   * persisted intervention data for the current owner.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public start(): void {
    if (this.started) return;
    this.started = true;
    this.events
      .on(authStoreEvents.logoutSucceeded)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.database.resetOwnerData().catch((error: unknown) => {
          this.errorHandler.handleError(error);
        });
      });
  }
  //#endregion
}
