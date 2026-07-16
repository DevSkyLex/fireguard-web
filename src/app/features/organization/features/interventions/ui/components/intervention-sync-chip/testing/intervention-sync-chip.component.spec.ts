import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ConnectivityService } from '@core/connectivity';
import { InterventionOfflineService } from '@features/organization/features/interventions/data-access';
import { InterventionSyncCoordinatorService } from '@features/organization/features/interventions/services';
import { InterventionSyncChip } from '../intervention-sync-chip.component';

describe('InterventionSyncChip', () => {
  const online = signal(true);
  const pendingCount = signal(0);
  const blockedOperations = signal(0);
  const syncing = signal(false);
  const problem = signal<string | null>(null);

  const mockConnectivity = {
    online,
    offline: () => !online(),
    isOffline: () => !online(),
  };
  const mockOffline = {
    pendingCount,
    hasUnsyncedChanges: signal(false),
    hasPendingChanges: signal(false),
  };
  const mockSync = {
    syncing,
    blockedOperations,
    problem,
    syncAll: vi.fn().mockResolvedValue(undefined),
    retryBlocked: vi.fn().mockResolvedValue(undefined),
    refreshStatus: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    online.set(true);
    pendingCount.set(0);
    blockedOperations.set(0);
    syncing.set(false);
    problem.set(null);
    mockSync.syncAll.mockClear();
    mockSync.refreshStatus.mockClear();

    TestBed.configureTestingModule({
      imports: [InterventionSyncChip],
      providers: [
        { provide: ConnectivityService, useValue: mockConnectivity },
        { provide: InterventionOfflineService, useValue: mockOffline },
        { provide: InterventionSyncCoordinatorService, useValue: mockSync },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(InterventionSyncChip);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the up-to-date state when online with an empty outbox', () => {
    const fixture = TestBed.createComponent(InterventionSyncChip);
    fixture.detectChanges();

    const label = fixture.debugElement.query(By.css('[data-testid="sync-chip-label"]'));
    expect(label.nativeElement.textContent).toContain('Up to date');
    expect(fixture.debugElement.query(By.css('.pi-cloud'))).toBeTruthy();
  });

  it('should show the offline state with the pending count', () => {
    online.set(false);
    pendingCount.set(3);

    const fixture = TestBed.createComponent(InterventionSyncChip);
    fixture.detectChanges();

    const label = fixture.debugElement.query(By.css('[data-testid="sync-chip-label"]'));
    expect(label.nativeElement.textContent).toContain('Offline');
    expect(label.nativeElement.textContent).toContain('· 3');
  });

  it('should prioritize the blocked state when online', () => {
    blockedOperations.set(2);
    pendingCount.set(5);

    const fixture = TestBed.createComponent(InterventionSyncChip);
    fixture.detectChanges();

    const label = fixture.debugElement.query(By.css('[data-testid="sync-chip-label"]'));
    expect(label.nativeElement.textContent).toContain('2 blocked');
    expect(fixture.debugElement.query(By.css('.pi-exclamation-triangle'))).toBeTruthy();
  });

  it('should show the pending state when online with queued changes', () => {
    pendingCount.set(4);

    const fixture = TestBed.createComponent(InterventionSyncChip);
    fixture.detectChanges();

    const label = fixture.debugElement.query(By.css('[data-testid="sync-chip-label"]'));
    expect(label.nativeElement.textContent).toContain('4 pending');
  });

  it('should refresh the blocked summary when the panel is toggled', () => {
    const fixture = TestBed.createComponent(InterventionSyncChip);
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('[data-testid="sync-chip-trigger"]'));
    (trigger.nativeElement as HTMLButtonElement).click();

    expect(mockSync.refreshStatus).toHaveBeenCalledTimes(1);
  });

  it('should replay the outbox from the panel sync-now action', () => {
    pendingCount.set(1);
    const fixture = TestBed.createComponent(InterventionSyncChip);
    fixture.detectChanges();

    const trigger = fixture.debugElement.query(By.css('[data-testid="sync-chip-trigger"]'));
    (trigger.nativeElement as HTMLButtonElement).click();
    fixture.detectChanges();

    const syncNow = document.querySelector<HTMLButtonElement>(
      '[data-testid="sync-chip-sync-now"] button',
    );
    syncNow?.click();

    expect(mockSync.syncAll).toHaveBeenCalledTimes(1);
  });
});
