import { ErrorHandler, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { Subject } from 'rxjs';
import { LOGOUT_PROTECTION_PORT, type LogoutPendingWork } from '@features/auth/ports';
import {
  MessagingDatabaseService,
  MessagingOutboxRepository,
} from '@features/organization/features/collaboration/data-access';
import { MessagingSyncCoordinatorService } from '../../messaging-sync-coordinator/messaging-sync-coordinator.service';
import { MessagingOfflineLifecycleService } from '../messaging-offline-lifecycle.service';

describe('MessagingOfflineLifecycleService', () => {
  it('registers pending and failed work and removes the indicator when destroyed', async () => {
    const pendingCount = signal(0);
    const failedCount = signal(1);
    const unregister = vi.fn<() => void>();
    const register = vi.fn<(work: LogoutPendingWork) => () => void>(() => unregister);
    const ended = new Subject<void>();
    const resetOwnerData = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        MessagingOfflineLifecycleService,
        { provide: LOGOUT_PROTECTION_PORT, useValue: { register } },
        {
          provide: MessagingOutboxRepository,
          useValue: { pendingCount, failedCount, list: vi.fn().mockResolvedValue([{}]) },
        },
        { provide: MessagingDatabaseService, useValue: { resetOwnerData } },
        {
          provide: MessagingSyncCoordinatorService,
          useValue: { flush: vi.fn().mockResolvedValue(undefined) },
        },
        { provide: Events, useValue: { on: () => ended } },
        { provide: ErrorHandler, useValue: { handleError: vi.fn() } },
      ],
    });
    const service = TestBed.inject(MessagingOfflineLifecycleService);
    service.start();
    service.start();
    expect(register).toHaveBeenCalledOnce();
    const work = register.mock.calls[0]?.[0];
    expect(work?.hasUnsyncedWork()).toBe(true);
    expect(await work?.count()).toBe(1);
    failedCount.set(0);
    expect(work?.hasUnsyncedWork()).toBe(false);
    pendingCount.set(2);
    expect(work?.hasUnsyncedWork()).toBe(true);
    ended.next();
    await vi.waitFor(() => expect(resetOwnerData).toHaveBeenCalledOnce());
    TestBed.resetTestingModule();
    expect(unregister).toHaveBeenCalledOnce();
  });
});
