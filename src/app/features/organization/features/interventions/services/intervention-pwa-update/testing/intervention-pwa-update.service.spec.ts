import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionPwaUpdateService } from '../intervention-pwa-update.service';

describe('InterventionPwaUpdateService', () => {
  let service: InterventionPwaUpdateService;
  let versionUpdates: Subject<VersionEvent>;
  let feedback: { info: ReturnType<typeof vi.fn> };
  let activateUpdate: ReturnType<typeof vi.fn>;
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
    feedback = { info: vi.fn() };
    activateUpdate = vi.fn().mockResolvedValue(true);
    hasPendingChanges = signal(true);

    TestBed.configureTestingModule({
      providers: [
        InterventionPwaUpdateService,
        {
          provide: SwUpdate,
          useValue: {
            isEnabled: true,
            versionUpdates: versionUpdates.asObservable(),
            activateUpdate,
          },
        },
        { provide: FeedbackService, useValue: feedback },
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

    expect(feedback.info).toHaveBeenCalledTimes(1);
  });

  it('should defer with an informational message while pending changes remain', () => {
    service.start();

    emitVersionReady();

    expect(service.updateReady()).toBe(true);
    expect(service.canApplyUpdate()).toBe(false);
    expect(feedback.info).toHaveBeenCalledTimes(1);
  });

  it('should be immediately applicable when nothing is pending', () => {
    hasPendingChanges.set(false);
    service.start();

    emitVersionReady();

    expect(service.canApplyUpdate()).toBe(true);
    expect(feedback.info).not.toHaveBeenCalled();
  });

  it('should not deadlock on conflict/failed changes that can never sync on their own', () => {
    // No pending (synchronizable) operations, but unsynced ones remain
    // (conflict/failed): the update must still be offered instead of waiting
    // forever for a synchronization that can never happen unattended.
    hasPendingChanges.set(false);
    service.start();

    emitVersionReady();

    expect(service.canApplyUpdate()).toBe(true);
  });

  it('should become applicable once pending changes clear', () => {
    service.start();
    emitVersionReady();
    expect(service.canApplyUpdate()).toBe(false);

    hasPendingChanges.set(false);

    expect(service.canApplyUpdate()).toBe(true);
  });

  it('should refuse to activate while changes are still pending', async () => {
    service.start();
    emitVersionReady();

    await service.applyUpdate();

    expect(activateUpdate).not.toHaveBeenCalled();
    expect(service.updateReady()).toBe(true);
  });
});
