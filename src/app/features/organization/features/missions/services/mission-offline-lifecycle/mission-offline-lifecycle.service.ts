import { DestroyRef, ErrorHandler, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { authStoreEvents } from '@features/auth/state';
import { MissionDatabaseService } from '../mission-offline';

/**
 * Coordinates authentication lifecycle events with mission offline storage.
 */
@Injectable({ providedIn: 'root' })
export class MissionOfflineLifecycleService {
  private readonly database: MissionDatabaseService = inject(MissionDatabaseService);
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
