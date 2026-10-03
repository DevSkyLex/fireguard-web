import { DOCUMENT, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { FeedbackService } from '@core/feedback';
import { AUTH_SESSION_PORT, LOGOUT_PROTECTION_PORT } from '@features/auth/ports';
import { InterventionPwaUpdateService } from '../intervention-pwa-update.service';

describe('InterventionPwaUpdateService', () => {
  let service: InterventionPwaUpdateService;
  let versionUpdates: Subject<VersionEvent>;
  let feedback: { info: ReturnType<typeof vi.fn> };
  let activateUpdate: ReturnType<typeof vi.fn>;
  let hasUnsyncedWork: WritableSignal<boolean>;
  let sessionRevision: WritableSignal<number>;
  let countPendingWork: ReturnType<typeof vi.fn<() => Promise<number>>>;
  let persistedCount: number;
  let reload: ReturnType<typeof vi.fn>;

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
    hasUnsyncedWork = signal(true);
    sessionRevision = signal(0);
    persistedCount = 1;
    countPendingWork = vi.fn(async () => persistedCount);
    reload = vi.fn();

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
        { provide: LOGOUT_PROTECTION_PORT, useValue: { hasUnsyncedWork, countPendingWork } },
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision } },
        { provide: DOCUMENT, useValue: { defaultView: { location: { reload } } } },
      ],
    });

    service = TestBed.inject(InterventionPwaUpdateService);
  });

  it('should register update monitoring only once', async () => {
    service.start();
    service.start();

    emitVersionReady();
    TestBed.tick();
    await vi.waitFor(() => expect(feedback.info).toHaveBeenCalledTimes(1));
  });

  it('should defer with an informational message while pending changes remain', async () => {
    service.start();

    emitVersionReady();
    TestBed.tick();

    expect(service.updateReady()).toBe(true);
    expect(service.canApplyUpdate()).toBe(false);
    await vi.waitFor(() => expect(feedback.info).toHaveBeenCalledTimes(1));
  });

  it('offers the update only after persisted queues have been inspected', async () => {
    hasUnsyncedWork.set(false);
    persistedCount = 0;
    service.start();

    emitVersionReady();
    expect(service.canApplyUpdate()).toBe(false);
    TestBed.tick();
    await vi.waitFor(() => expect(service.canApplyUpdate()).toBe(true));
    expect(feedback.info).not.toHaveBeenCalled();
  });

  it.each([
    'intervention conflict',
    'intervention failed',
    'messaging pending',
    'messaging failed',
  ])('defers activation while %s work remains', async () => {
    service.start();

    emitVersionReady();
    await service.applyUpdate();
    expect(service.canApplyUpdate()).toBe(false);
    expect(activateUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('becomes applicable after every registered queue clears', async () => {
    service.start();
    emitVersionReady();
    TestBed.tick();
    expect(service.canApplyUpdate()).toBe(false);

    persistedCount = 0;
    hasUnsyncedWork.set(false);
    TestBed.tick();
    await vi.waitFor(() => expect(service.canApplyUpdate()).toBe(true));
  });

  it('should refuse to activate while changes are still pending', async () => {
    service.start();
    emitVersionReady();

    await service.applyUpdate();

    expect(activateUpdate).not.toHaveBeenCalled();
    expect(service.updateReady()).toBe(true);
  });

  it('checks persisted work even when reactive counters appear empty', async () => {
    hasUnsyncedWork.set(false);
    persistedCount = 2;
    service.start();
    emitVersionReady();
    await service.applyUpdate();
    expect(activateUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('fails closed when storage inspection rejects', async () => {
    hasUnsyncedWork.set(false);
    countPendingWork.mockRejectedValue(new Error('Storage unavailable'));
    service.start();
    emitVersionReady();
    await service.applyUpdate();
    expect(activateUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(service.updateReady()).toBe(true);
  });

  it('activates and reloads only after two successful durable inspections', async () => {
    hasUnsyncedWork.set(false);
    persistedCount = 0;
    service.start();
    emitVersionReady();
    await service.applyUpdate();
    expect(activateUpdate).toHaveBeenCalledOnce();
    expect(countPendingWork).toHaveBeenCalledTimes(2);
    expect(reload).toHaveBeenCalledOnce();
    expect(service.updateReady()).toBe(false);
  });

  it('does not reload when new work is persisted during activation', async () => {
    let release!: () => void;
    activateUpdate.mockReturnValue(
      new Promise<boolean>((resolve) => {
        release = () => resolve(true);
      }),
    );
    hasUnsyncedWork.set(false);
    persistedCount = 0;
    service.start();
    emitVersionReady();
    const applying = service.applyUpdate();
    await vi.waitFor(() => expect(activateUpdate).toHaveBeenCalledOnce());
    persistedCount = 1;
    hasUnsyncedWork.set(true);
    release();
    await applying;
    expect(reload).not.toHaveBeenCalled();
    expect(service.updateReady()).toBe(true);
  });

  it('does not reload a replacement session after held activation', async () => {
    let release!: () => void;
    activateUpdate.mockReturnValue(
      new Promise<boolean>((resolve) => {
        release = () => resolve(true);
      }),
    );
    hasUnsyncedWork.set(false);
    persistedCount = 0;
    service.start();
    emitVersionReady();
    const applying = service.applyUpdate();
    await vi.waitFor(() => expect(activateUpdate).toHaveBeenCalledOnce());
    sessionRevision.set(2);
    release();
    await applying;
    expect(reload).not.toHaveBeenCalled();
  });

  it('unsubscribes from version events on destruction', () => {
    service.start();
    TestBed.resetTestingModule();
    emitVersionReady();
    expect(service.updateReady()).toBe(false);
  });

  it('does not activate an update without a browser window', async () => {
    TestBed.resetTestingModule();
    hasUnsyncedWork.set(false);
    persistedCount = 0;
    TestBed.configureTestingModule({
      providers: [
        InterventionPwaUpdateService,
        { provide: SwUpdate, useValue: { isEnabled: true, versionUpdates, activateUpdate } },
        { provide: FeedbackService, useValue: feedback },
        { provide: LOGOUT_PROTECTION_PORT, useValue: { hasUnsyncedWork, countPendingWork } },
        { provide: AUTH_SESSION_PORT, useValue: { sessionRevision } },
        { provide: DOCUMENT, useValue: { defaultView: null } },
      ],
    });
    service = TestBed.inject(InterventionPwaUpdateService);
    service.start();
    emitVersionReady();
    await service.applyUpdate();
    expect(activateUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
