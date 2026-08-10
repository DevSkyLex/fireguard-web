import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { InterventionSyncStatus } from '../intervention-sync-status.component';

const chip = (): HTMLElement | null =>
  document.querySelector('[data-testid="intervention-sync-status"]');

describe('InterventionSyncStatus', () => {
  let fixture: ComponentFixture<InterventionSyncStatus>;

  const open = async (): Promise<void> => {
    (chip() as HTMLButtonElement).click();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionSyncStatus);
    await fixture.whenStable();
  });

  it('should show nothing when there is nothing to report', () => {
    expect(chip()).toBeNull();
  });

  it('should spin while a replay is in flight', async () => {
    fixture.componentRef.setInput('syncing', true);
    await fixture.whenStable();

    expect(chip()?.querySelector('hlm-spinner')).not.toBeNull();
    expect(chip()?.querySelector('[data-testid="intervention-sync-blocked-count"]')).toBeNull();
  });

  it('should show a pending cloud when changes wait for the network', async () => {
    fixture.componentRef.setInput('unsynced', true);
    await fixture.whenStable();

    expect(chip()).not.toBeNull();
    expect(chip()?.querySelector('hlm-spinner')).toBeNull();
    expect(chip()?.querySelector('[data-testid="intervention-sync-blocked-count"]')).toBeNull();
  });

  it('should turn destructive with a count once operations are blocked', async () => {
    fixture.componentRef.setInput('blockedCount', 3);
    await fixture.whenStable();

    const badge: HTMLElement | null = chip()?.querySelector(
      '[data-testid="intervention-sync-blocked-count"]',
    ) as HTMLElement | null;

    expect(badge?.textContent).toContain('3');
  });

  it('should ask the page to sync now', async () => {
    const requests: void[] = [];
    fixture.componentInstance.syncRequested.subscribe(() => requests.push(undefined));
    fixture.componentRef.setInput('unsynced', true);
    await fixture.whenStable();
    await open();

    document.querySelector<HTMLButtonElement>('[data-testid="intervention-sync-now"]')?.click();

    expect(requests.length).toBe(1);
  });

  it('should ask the page to retry the blocked operations', async () => {
    const requests: void[] = [];
    fixture.componentInstance.retryRequested.subscribe(() => requests.push(undefined));
    fixture.componentRef.setInput('blockedCount', 2);
    await fixture.whenStable();
    await open();

    document.querySelector<HTMLButtonElement>('[data-testid="intervention-sync-retry"]')?.click();

    expect(requests.length).toBe(1);
  });

  it('should discard the blocked operations only after the confirmation is accepted', async () => {
    const discards: void[] = [];
    fixture.componentInstance.discardRequested.subscribe(() => discards.push(undefined));
    fixture.componentRef.setInput('blockedCount', 2);
    await fixture.whenStable();
    await open();

    document.querySelector<HTMLButtonElement>('[data-testid="intervention-sync-discard"]')?.click();
    await fixture.whenStable();

    expect(discards).toEqual([]);
    expect(
      document.querySelector('[data-testid="intervention-sync-discard-dialog"]'),
    ).not.toBeNull();

    document
      .querySelector<HTMLButtonElement>('[data-testid="intervention-sync-discard-confirm"]')
      ?.click();

    expect(discards.length).toBe(1);
  });
});
