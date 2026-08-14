import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import { InterventionSyncIndicator } from '../intervention-sync-indicator.component';

const trigger = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-sync-status"]');

const liveRegion = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-sync-live"]');

describe('InterventionSyncIndicator', () => {
  let fixture: ComponentFixture<InterventionSyncIndicator>;
  let online: WritableSignal<boolean>;
  let syncing: WritableSignal<boolean>;
  let blockedOperations: WritableSignal<number>;
  let lastSyncedAt: WritableSignal<Date | null>;
  let pendingCount: WritableSignal<number>;
  let syncAll: ReturnType<typeof vi.fn>;
  let retryBlocked: ReturnType<typeof vi.fn>;
  let discardBlocked: ReturnType<typeof vi.fn>;

  const open = async (): Promise<void> => {
    (trigger() as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    online = signal(true);
    syncing = signal(false);
    blockedOperations = signal(0);
    lastSyncedAt = signal<Date | null>(null);
    pendingCount = signal(0);
    syncAll = vi.fn();
    retryBlocked = vi.fn();
    discardBlocked = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ConnectivityService, useValue: { online } },
        {
          provide: InterventionSyncCoordinatorService,
          useValue: {
            syncing,
            blockedOperations,
            problem: signal(null),
            lastSyncedAt,
            syncAll,
            retryBlocked,
            discardBlocked,
          },
        },
        { provide: InterventionOfflineService, useValue: { pendingCount } },
      ],
    });

    fixture = TestBed.createComponent(InterventionSyncIndicator);
    await fixture.whenStable();
  });

  it('should read as offline first, ahead of a blocked or pending outbox', async () => {
    online.set(false);
    blockedOperations.set(2);
    pendingCount.set(3);
    await fixture.whenStable();

    expect(trigger()?.getAttribute('aria-label')).toBe('Offline, changes queued locally');
    expect(trigger()?.querySelector('[data-testid="intervention-sync-blocked-count"]')).toBeNull();
    expect(trigger()?.querySelector('[data-testid="intervention-sync-pending-count"]')).toBeNull();
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
  });

  it('should read as quietly synced with no badge once nothing is queued', async () => {
    expect(trigger()?.getAttribute('aria-label')).toBe('Up to date');
    expect(trigger()?.querySelector('[data-testid="intervention-sync-blocked-count"]')).toBeNull();
    expect(trigger()?.querySelector('[data-testid="intervention-sync-pending-count"]')).toBeNull();
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
});
