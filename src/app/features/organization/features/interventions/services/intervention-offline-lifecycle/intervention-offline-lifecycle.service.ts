import { DestroyRef, ErrorHandler, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { authStoreEvents } from '@features/auth/state';
import { InterventionDatabaseService } from '../intervention-offline';

/**
 * Coordinates authentication lifecycle events with intervention offline storage.
 */
@Injectable({ providedIn: 'root' })
export class InterventionOfflineLifecycleService {
  /** Property database. @readonly @description Provides intervention offline persistence. @access private @since 1.0.0 @type {InterventionDatabaseService} */
  private readonly database: InterventionDatabaseService = inject(InterventionDatabaseService);
  /** Property destroyRef. @readonly @description Provides lifecycle cleanup registration. @access private @since 1.0.0 @type {DestroyRef} */
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  /** Property errorHandler. @readonly @description Reports offline cleanup failures. @access private @since 1.0.0 @type {ErrorHandler} */
  private readonly errorHandler: ErrorHandler = inject(ErrorHandler);
  /** Property events. @readonly @description Provides application lifecycle events. @access private @since 1.0.0 @type {Events} */
  private readonly events: Events = inject(Events);
  /** Property started. @description Indicates whether lifecycle listeners were registered. @access private @since 1.0.0 @type {boolean} */
  private started = false;

  /**
   * Starts the logout listener once for the application lifecycle.
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
}
