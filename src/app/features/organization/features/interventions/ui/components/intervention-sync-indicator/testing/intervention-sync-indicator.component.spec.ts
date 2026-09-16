import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import { SLOT_PRESENTATION, type SlotPresentation } from '@shared/layout-slot';
import { InterventionSyncIndicator } from '../intervention-sync-indicator.component';

const trigger = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-sync-status"]');

const liveRegion = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-sync-live"]');

const queueItems = (): readonly Element[] =>
  Array.from(document.querySelectorAll('[data-testid="intervention-sync-queue-item"]'));

describe('InterventionSyncIndicator', () => {
  let fixture: ComponentFixture<InterventionSyncIndicator>;
  const mobile = signal(false);
  let online: WritableSignal<boolean>;
  let syncing: WritableSignal<boolean>;
  let blockedOperations: WritableSignal<number>;
  let problem: WritableSignal<string | null>;
  let lastSyncedAt: WritableSignal<Date | null>;
  let pendingCount: WritableSignal<number>;
  let syncAll: ReturnType<typeof vi.fn>;
  let retryBlocked: ReturnType<typeof vi.fn>;
  let discardBlocked: ReturnType<typeof vi.fn>;
  let listAllOutbox: ReturnType<typeof vi.fn>;
  let retryOutbox: ReturnType<typeof vi.fn>;
  let removeOutbox: ReturnType<typeof vi.fn>;

  const open = async (): Promise<void> => {
    (trigger() as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  /**
   * Function createFixture
   * @description Creates the sync widget in an explicit layout-slot presentation using this spec's service doubles.
   * @access private
   * @since 1.0.0
   * @param {SlotPresentation} presentation - The hosting slot's native control presentation.
   * @returns {Promise<void>}
   */
  async function createFixture(presentation: SlotPresentation = 'default'): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: SLOT_PRESENTATION, useValue: presentation },
        { provide: INTERACTION_CAPABILITIES_PORT, useValue: { isMobileInteractionMode: mobile } },
        { provide: ConnectivityService, useValue: { online } },
        {
          provide: InterventionSyncCoordinatorService,
          useValue: {
            syncing,
            blockedOperations,
            problem,
            lastSyncedAt,
            syncAll,
            retryBlocked,
            discardBlocked,
          },
        },
        {
          provide: InterventionOfflineService,
          useValue: { pendingCount, listAllOutbox, retryOutbox, removeOutbox },
        },
      ],
    });

    fixture = TestBed.createComponent(InterventionSyncIndicator);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    mobile.set(false);
    online = signal(true);
    syncing = signal(false);
    blockedOperations = signal(0);
    problem = signal<string | null>(null);
    lastSyncedAt = signal<Date | null>(null);
    pendingCount = signal(0);
    syncAll = vi.fn();
    retryBlocked = vi.fn();
    discardBlocked = vi.fn();
    listAllOutbox = vi.fn().mockResolvedValue([]);
    retryOutbox = vi.fn().mockResolvedValue(undefined);
    removeOutbox = vi.fn().mockResolvedValue(undefined);

    await createFixture();
  });

  it('should expose pending work on the mobile trigger and keep the queue open through an interaction mode change', async () => {
    mobile.set(true);
    pendingCount.set(3);
    await fixture.whenStable();
    expect(trigger()?.getAttribute('data-slot')).toBe('button');
    expect(trigger()?.hasAttribute('hlmItem')).toBe(false);
    expect(trigger()?.textContent).toContain('3');
    expect(trigger()?.getAttribute('aria-label')).toBe('3 change(s) waiting to sync');
    await open();
    expect(document.querySelector('[data-testid="intervention-sync-mobile-panel"]')).not.toBeNull();
    mobile.set(false);
    await fixture.whenStable();
    expect(document.querySelector('[data-testid="intervention-sync-mobile-panel"]')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-testid="intervention-sync-now"]')?.click();
    expect(syncAll).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['offline', 'lucideCloudOff', 'Offline', 3],
    ['blocked', 'lucideTriangleAlert', 'Sync blocked', 2],
    ['syncing', null, 'Syncing', null],
    ['pending', 'lucideCloudUpload', 'Pending sync', 3],
    ['synced', 'lucideCloudCheck', 'Up to date', null],
  ] as const)(
    'renders the mobile menu as a full-width native row when %s',
    async (state, glyph, label, count) => {
      fixture.destroy();
      TestBed.resetTestingModule();
      mobile.set(true);
      online.set(state !== 'offline');
      blockedOperations.set(state === 'blocked' ? 2 : 0);
      syncing.set(state === 'syncing');
      pendingCount.set(state === 'pending' || state === 'offline' ? 3 : 0);
      await createFixture('menu');

      const row: HTMLElement | null = trigger();
      expect(row?.getAttribute('data-slot')).toBe('item');
      expect(row?.hasAttribute('hlmBtn')).toBe(false);
      expect(row?.classList.contains('w-full')).toBe(true);
      expect(row?.classList.contains('justify-start')).toBe(true);
      expect(row?.classList.contains('flex-nowrap')).toBe(true);
      expect(row?.closest('hlm-drawer')?.classList.contains('w-full')).toBe(true);
      expect(row?.closest('hlm-drawer')?.classList.contains('block')).toBe(true);
      expect(row?.querySelector('[hlmItemContent] > [hlmItemTitle]')?.textContent?.trim()).toBe(
        label,
      );

      const media: Element | null | undefined = row?.querySelector('[hlmItemMedia]');
      expect(
        media?.querySelector(glyph === null ? 'hlm-spinner' : `ng-icon[name="${glyph}"]`),
      ).not.toBeNull();
      expect(row?.getAttribute('aria-busy')).toBe(state === 'syncing' ? 'true' : null);
      if (count === null) {
        expect(row?.querySelector('[hlmItemActions]')).toBeNull();
      } else {
        expect(row?.querySelector('[hlmItemActions] [hlmBadge]')?.textContent?.trim()).toBe(
          String(count),
        );
      }

      await open();
      expect(
        document.querySelector('[data-testid="intervention-sync-mobile-panel"]'),
      ).not.toBeNull();
      expect(listAllOutbox).toHaveBeenCalledTimes(1);
    },
  );

  it('should read as offline first, ahead of a blocked or pending outbox', async () => {
    online.set(false);
    blockedOperations.set(2);
    pendingCount.set(3);
    await fixture.whenStable();

    expect(trigger()?.getAttribute('aria-label')).toBe('Offline, changes queued locally');
    expect(trigger()?.querySelector('[data-testid="intervention-sync-blocked-count"]')).toBeNull();
    expect(
      trigger()?.querySelector('[data-testid="intervention-sync-pending-count"]')?.textContent,
    ).toContain('3');
  });

  it('should read as blocked ahead of syncing or pending, with a destructive count', async () => {
    blockedOperations.set(2);
    syncing.set(true);
    pendingCount.set(3);
    await fixture.whenStable();

    expect(trigger()?.getAttribute('aria-label')).toBe(
      'Synchronization blocked, 2 change(s) could not be replayed',
    );
    expect(
      trigger()?.querySelector('[data-testid="intervention-sync-blocked-count"]')?.textContent,
    ).toContain('2');
  });

  it('should state why the replay is blocked, not just how many failed', async () => {
    blockedOperations.set(2);
    problem.set('The intervention changed on the server while you were offline.');
    await fixture.whenStable();
    await open();

    expect(
      document.querySelector('[data-testid="intervention-sync-problem"]')?.textContent,
    ).toContain('changed on the server');
  });

  it('should say nothing extra when the failure carried no message', async () => {
    blockedOperations.set(2);
    await fixture.whenStable();
    await open();

    expect(document.querySelector('[data-testid="intervention-sync-problem"]')).toBeNull();
  });

  it('should read as syncing while a replay is in flight', async () => {
    syncing.set(true);
    await fixture.whenStable();

    expect(trigger()?.getAttribute('aria-label')).toBe('Synchronizing');
    expect(trigger()?.querySelector('hlm-spinner')).not.toBeNull();
  });

  it('should read as pending with a neutral count when work is queued', async () => {
    pendingCount.set(4);
    await fixture.whenStable();

    expect(trigger()?.getAttribute('aria-label')).toBe('4 change(s) waiting to sync');
    expect(
      trigger()?.querySelector('[data-testid="intervention-sync-pending-count"]')?.textContent,
    ).toContain('4');
    expect(trigger()?.className).toContain('px-2.5');
  });

  it('should read as quietly synced with no badge once nothing is queued', async () => {
    expect(trigger()?.getAttribute('aria-label')).toBe('Up to date');
    expect(trigger()?.querySelector('[data-testid="intervention-sync-blocked-count"]')).toBeNull();
    expect(trigger()?.querySelector('[data-testid="intervention-sync-pending-count"]')).toBeNull();
    expect(trigger()?.className).toContain('size-7');
    expect(trigger()?.textContent).not.toContain('Up to date');
  });

  it('should show "Up to date" before the first clean replay', async () => {
    await open();

    expect(
      document.querySelector('[data-testid="intervention-sync-last-synced"]')?.textContent,
    ).toContain('Up to date');
  });

  it('should show a relative "last synced" label once a clean replay has completed', async () => {
    lastSyncedAt.set(new Date(Date.now() - 60_000));
    await fixture.whenStable();
    await open();

    expect(
      document.querySelector('[data-testid="intervention-sync-last-synced"]')?.textContent,
    ).toContain('1 minute ago');
  });

  it('should ask the coordinator to sync now', async () => {
    await open();

    document.querySelector<HTMLButtonElement>('[data-testid="intervention-sync-now"]')?.click();

    expect(syncAll).toHaveBeenCalledTimes(1);
  });

  it('should ask the coordinator to retry the blocked operations', async () => {
    blockedOperations.set(2);
    await fixture.whenStable();
    await open();

    document.querySelector<HTMLButtonElement>('[data-testid="intervention-sync-retry"]')?.click();

    expect(retryBlocked).toHaveBeenCalledTimes(1);
  });

  it('should discard the blocked operations only after the confirmation is accepted', async () => {
    blockedOperations.set(2);
    await fixture.whenStable();
    await open();

    document.querySelector<HTMLButtonElement>('[data-testid="intervention-sync-discard"]')?.click();
    await fixture.whenStable();

    expect(discardBlocked).not.toHaveBeenCalled();
    expect(
      document.querySelector('[data-testid="intervention-sync-discard-dialog"]'),
    ).not.toBeNull();

    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-sync-discard-confirm"]')
      ?.click();

    expect(discardBlocked).toHaveBeenCalledTimes(1);
  });

  it('should keep the trigger addressable by its original testid', () => {
    expect(trigger()).not.toBeNull();
  });

  it('should announce a blocked outbox assertively, mirroring the trigger name', async () => {
    blockedOperations.set(2);
    await fixture.whenStable();

    expect(liveRegion()?.getAttribute('role')).toBe('alert');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('assertive');
    expect(liveRegion()?.textContent).toBe(
      'Synchronization blocked, 2 change(s) could not be replayed',
    );
  });

  it('should announce every other state politely, busy only while syncing', async () => {
    expect(liveRegion()?.getAttribute('role')).toBe('status');
    expect(liveRegion()?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion()?.getAttribute('aria-busy')).toBe('false');

    syncing.set(true);
    await fixture.whenStable();

    expect(liveRegion()?.getAttribute('role')).toBe('status');
    expect(liveRegion()?.getAttribute('aria-busy')).toBe('true');
  });

  describe('the readable queue', () => {
    it('should name every queued operation instead of showing a bare count', async () => {
      listAllOutbox.mockResolvedValue([
        { id: 'a', interventionId: 'i-1', type: 'comment.create', payload: {}, createdAt: '1' },
        { id: 'b', interventionId: 'i-2', type: 'work-item.update', payload: {}, createdAt: '2' },
      ]);
      pendingCount.set(2);
      await fixture.whenStable();

      await open();
      await fixture.whenStable();

      expect(listAllOutbox).toHaveBeenCalledTimes(1);
      expect(queueItems()).toHaveLength(2);
      expect(queueItems()[0]?.textContent).toContain('New comment');
      expect(queueItems()[1]?.textContent).toContain('Work item update');
    });

    it('should surface the failure of a blocked operation and let it be retried alone', async () => {
      listAllOutbox.mockResolvedValue([
        {
          id: 'a',
          interventionId: 'i-1',
          type: 'comment.create',
          payload: {},
          createdAt: '1',
          status: 'failed',
          error: 'Comment rejected by the server',
        },
      ]);
      blockedOperations.set(1);
      await fixture.whenStable();

      await open();
      await fixture.whenStable();

      expect(queueItems()[0]?.textContent).toContain('Comment rejected by the server');

      const retryOne = document.querySelector<HTMLButtonElement>(
        '[data-testid="intervention-sync-queue-retry"]',
      );
      retryOne?.click();
      await fixture.whenStable();

      expect(retryOutbox).toHaveBeenCalledWith('a');
      expect(retryBlocked).not.toHaveBeenCalled();
    });

    it('should discard one operation without touching the rest of the queue', async () => {
      listAllOutbox.mockResolvedValue([
        {
          id: 'a',
          interventionId: 'i-1',
          type: 'media.create',
          payload: {},
          createdAt: '1',
          status: 'conflict',
        },
      ]);
      blockedOperations.set(1);
      await fixture.whenStable();

      await open();
      await fixture.whenStable();

      document
        .querySelector<HTMLButtonElement>('[data-testid="intervention-sync-queue-discard"]')
        ?.click();
      await fixture.whenStable();

      expect(removeOutbox).toHaveBeenCalledWith('a');
      expect(discardBlocked).not.toHaveBeenCalled();
    });

    it('should offer no per-operation action on work that will sync on its own', async () => {
      listAllOutbox.mockResolvedValue([
        { id: 'a', interventionId: 'i-1', type: 'comment.create', payload: {}, createdAt: '1' },
      ]);
      pendingCount.set(1);
      await fixture.whenStable();

      await open();
      await fixture.whenStable();

      expect(document.querySelector('[data-testid="intervention-sync-queue-retry"]')).toBeNull();
      expect(document.querySelector('[data-testid="intervention-sync-queue-discard"]')).toBeNull();
    });
  });
});
