import { DestroyRef, ErrorHandler, inject, Service } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { authStoreEvents } from '@features/auth/state';
import { MessagingDatabaseService } from '@features/organization/features/collaboration/data-access';

/**
 * Service MessagingOfflineLifecycleService
 * @class MessagingOfflineLifecycleService
 *
 * @description
 * Coordinates authentication lifecycle events with messaging offline storage.
 * When the session ends, clears all locally persisted conversation data so the
 * next authenticated user starts clean — messages are personal data, and the
 * database outlives the client-side navigation that logging out really is.
 *
 * Mirrors `InterventionOfflineLifecycleService`; the two features own separate
 * databases and therefore separate lifecycles.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MessagingOfflineLifecycleService {
  //#region Properties
  /**
   * Property database
   * @readonly
   *
   * @description
   * IndexedDB infrastructure used to reset owner data when the session ends.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {MessagingDatabaseService}
   */
  private readonly database: MessagingDatabaseService =
    inject<MessagingDatabaseService>(MessagingDatabaseService);

  /**
   * Property destroyRef
   * @readonly
   *
   * @description
   * Angular destroy reference used to unsubscribe the session listener
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
   * NgRx signal events stream used to react to `sessionEnded`.
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
   * Registers the session listener once for the application lifecycle.
   * Subsequent calls are no-ops. On `sessionEnded`, resets all locally
   * persisted messaging data for the current owner.
   *
   * @access public
   * @since 1.0.0
   *
   * @returns {void}
   */
  public start(): void {
    if (this.started) return;
    this.started = true;
    // `sessionEnded`, not `logoutSucceeded`: a failed logout request still ends the
    // local session, and the cached conversations must not survive it.
    this.events
      .on(authStoreEvents.sessionEnded)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        void this.database.resetOwnerData().catch((error: unknown) => {
          this.errorHandler.handleError(error);
        });
      });
  }
  //#endregion
}
