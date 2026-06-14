import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, type VersionEvent } from '@angular/service-worker';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { MissionOfflineService } from '../../mission-offline';
import { MissionPwaUpdateService } from '../mission-pwa-update.service';

describe('MissionPwaUpdateService', () => {
  let service: MissionPwaUpdateService;
  let versionUpdates: Subject<VersionEvent>;
  let messages: { add: ReturnType<typeof vi.fn> };
  let confirmation: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    versionUpdates = new Subject<VersionEvent>();
    messages = { add: vi.fn() };
    confirmation = { confirm: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        MissionPwaUpdateService,
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
          provide: MissionOfflineService,
          useValue: { hasUnsyncedChanges: signal(true) },
        },
      ],
    });

    service = TestBed.inject(MissionPwaUpdateService);
  });

  it('should register update monitoring only once', () => {
    service.start();
    service.start();

    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'current' },
      latestVersion: { hash: 'latest' },
    });

    expect(messages.add).toHaveBeenCalledTimes(1);
    expect(confirmation.confirm).not.toHaveBeenCalled();
  });
});
