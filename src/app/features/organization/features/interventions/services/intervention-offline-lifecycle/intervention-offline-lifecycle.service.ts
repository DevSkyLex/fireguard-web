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
  private readonly database: InterventionDatabaseService = inject(InterventionDatabaseService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly errorHandler: ErrorHandler = inject(ErrorHandler);
  private readonly events: Events = inject(Events);
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
