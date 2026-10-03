import { ErrorHandler, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import { LOGOUT_PROTECTION_PORT, type LogoutPendingWork } from '@features/auth/ports';
import {
  InterventionDatabaseService,
  InterventionOfflineService,
} from '@features/organization/features/interventions/data-access';
import { InterventionSyncCoordinatorService } from '../../intervention-sync-coordinator/intervention-sync-coordinator.service';
import { InterventionOfflineLifecycleService } from '../intervention-offline-lifecycle.service';

describe('InterventionOfflineLifecycleService', () => {
  let logoutSucceeded: Subject<void>;
  let database: { resetOwnerData: ReturnType<typeof vi.fn> };
  let errorHandler: { handleError: ReturnType<typeof vi.fn> };
  let unsynced: WritableSignal<boolean>;
  let register: ReturnType<typeof vi.fn<(work: LogoutPendingWork) => () => void>>;
  let unregister: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    logoutSucceeded = new Subject<void>();
    database = { resetOwnerData: vi.fn().mockResolvedValue(undefined) };
    errorHandler = { handleError: vi.fn() };
    unsynced = signal(false);
    unregister = vi.fn<() => void>();
    register = vi.fn<(work: LogoutPendingWork) => () => void>(() => unregister);

    TestBed.configureTestingModule({
      providers: [
        InterventionOfflineLifecycleService,
        { provide: InterventionDatabaseService, useValue: database },
        { provide: LOGOUT_PROTECTION_PORT, useValue: { register } },
        {
          provide: InterventionOfflineService,
          useValue: {
            listAllOutbox: vi.fn().mockResolvedValue([{}]),
            hasUnsyncedChanges: unsynced,
          },
        },
        {
          provide: InterventionSyncCoordinatorService,
          useValue: { syncAll: vi.fn().mockResolvedValue(undefined) },
        },
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

  it('registers all intervention work and removes the indicator on destruction', async () => {
    const service = TestBed.inject(InterventionOfflineLifecycleService);
    service.start();
    service.start();
    expect(register).toHaveBeenCalledOnce();
    const work = register.mock.calls[0]?.[0];
    expect(work?.hasUnsyncedWork()).toBe(false);
    unsynced.set(true);
    expect(work?.hasUnsyncedWork()).toBe(true);
    expect(await work?.count()).toBe(1);
    TestBed.resetTestingModule();
    expect(unregister).toHaveBeenCalledOnce();
  });
});
