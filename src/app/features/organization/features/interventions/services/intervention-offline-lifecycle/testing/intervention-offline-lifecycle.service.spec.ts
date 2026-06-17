import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import { InterventionDatabaseService } from '@features/organization/features/interventions/data-access';
import { InterventionOfflineLifecycleService } from '../intervention-offline-lifecycle.service';

describe('InterventionOfflineLifecycleService', () => {
  let logoutSucceeded: Subject<void>;
  let database: { resetOwnerData: ReturnType<typeof vi.fn> };
  let errorHandler: { handleError: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    logoutSucceeded = new Subject<void>();
    database = { resetOwnerData: vi.fn().mockResolvedValue(undefined) };
    errorHandler = { handleError: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        InterventionOfflineLifecycleService,
        { provide: InterventionDatabaseService, useValue: database },
        { provide: ErrorHandler, useValue: errorHandler },
        { provide: Events, useValue: { on: vi.fn().mockReturnValue(logoutSucceeded) } },
      ],
    });
  });

  it('purges intervention data on logout', async () => {
    TestBed.inject(InterventionOfflineLifecycleService).start();

    logoutSucceeded.next();
    await vi.waitFor(() => expect(database.resetOwnerData).toHaveBeenCalledOnce());
  });

  it('reports a failed logout purge through Angular error handling', async () => {
    const error = new Error('IndexedDB purge failed');
    database.resetOwnerData.mockRejectedValue(error);
    TestBed.inject(InterventionOfflineLifecycleService).start();

    logoutSucceeded.next();
    await vi.waitFor(() => expect(errorHandler.handleError).toHaveBeenCalledWith(error));
  });
});
