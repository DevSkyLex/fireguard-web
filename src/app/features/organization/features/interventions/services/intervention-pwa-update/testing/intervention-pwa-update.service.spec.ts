import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionPwaUpdateService } from '../intervention-pwa-update.service';

describe('InterventionPwaUpdateService', () => {
  let service: InterventionPwaUpdateService;
  let versionUpdates: Subject<VersionEvent>;
  let messages: { add: ReturnType<typeof vi.fn> };
  let confirmation: { confirm: ReturnType<typeof vi.fn> };
  let hasPendingChanges: WritableSignal<boolean>;

  function emitVersionReady(): void {
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'current' },
      latestVersion: { hash: 'latest' },
    });
  }

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    messages = { add: vi.fn() };
    confirmation = { confirm: vi.fn() };
    hasPendingChanges = signal(true);

    TestBed.configureTestingModule({
      providers: [
        InterventionPwaUpdateService,
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versionUpdates.asObservable(),
            activateUpdate: vi.fn().mockResolvedValue(true),
          },
        },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: MessageService, useValue: messages },
        {
          provide: InterventionOfflineService,
          // `hasUnsyncedChanges` stays true throughout to prove the service
          // gates on `hasPendingChanges` alone (the IF-20 fix).
          useValue: { hasPendingChanges, hasUnsyncedChanges: signal(true) },
        },
      ],
    });

    service = TestBed.inject(InterventionPwaUpdateService);
  });

  it('should register update monitoring only once', () => {
    service.start();
    service.start();

    emitVersionReady();

    expect(messages.add).toHaveBeenCalledTimes(1);
    expect(confirmation.confirm).not.toHaveBeenCalled();
  });

  it('should defer with an informational toast while pending changes remain', () => {
    service.start();

    emitVersionReady();

    expect(messages.add).toHaveBeenCalledTimes(1);
    expect(messages.add.mock.calls[0][0]).toMatchObject({ severity: 'info' });
    expect(confirmation.confirm).not.toHaveBeenCalled();
  });

  it('should prompt to reload immediately when nothing is pending', () => {
    hasPendingChanges.set(false);
    service.start();

    emitVersionReady();
    TestBed.tick();

    expect(messages.add).not.toHaveBeenCalled();
    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
  });

  it('should not deadlock on conflict/failed changes that can never sync on their own', () => {
    // No pending (synchronizable) operations, but unsynced ones remain
    // (conflict/failed): the update must still be offered instead of waiting
    // forever for a synchronization that can never happen unattended.
    hasPendingChanges.set(false);
    service.start();

    emitVersionReady();
    TestBed.tick();

    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
  });

  it('should re-propose a deferred update once pending changes clear', () => {
    service.start();
    emitVersionReady();
    expect(confirmation.confirm).not.toHaveBeenCalled();

    hasPendingChanges.set(false);
    TestBed.tick();

    expect(confirmation.confirm).toHaveBeenCalledTimes(1);
  });
});
