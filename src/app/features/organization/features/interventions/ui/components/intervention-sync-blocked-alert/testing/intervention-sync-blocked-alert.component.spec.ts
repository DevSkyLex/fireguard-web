import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import type { InterventionOutboxOperation } from '@features/organization/features/interventions/models';
import { InterventionSyncBlockedAlert } from '../intervention-sync-blocked-alert.component';

const operations: readonly InterventionOutboxOperation[] = [
  {
    id: 'op-1',
    interventionId: 'int-1',
    type: 'work-item.update',
    payload: { workItemId: 'wi-1', status: 'completed' },
    createdAt: '2026-08-28T09:00:00.000Z',
    status: 'failed',
    error: 'The work item was changed by someone else.',
  },
  {
    id: 'op-2',
    interventionId: 'int-1',
    type: 'comment.create',
    payload: { body: 'Riser valve replaced.' },
    createdAt: '2026-08-28T09:04:00.000Z',
    status: 'failed',
    error: null,
  },
];

describe('InterventionSyncBlockedAlert', () => {
  let fixture: ComponentFixture<InterventionSyncBlockedAlert>;
  let retries: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const alert = (): HTMLElement | null =>
    root().querySelector('[data-testid="intervention-sync-blocked-alert"]');
  const rows = (): HTMLLIElement[] =>
    Array.from(
      root().querySelectorAll('[data-testid="intervention-sync-blocked-alert-list"] > li'),
    );
  const retry = (): HTMLButtonElement | null =>
    root().querySelector('[data-testid="intervention-sync-blocked-alert-retry"]');

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });

    fixture = TestBed.createComponent(InterventionSyncBlockedAlert);
    fixture.componentRef.setInput('operations', operations);
    await fixture.whenStable();

    retries = 0;
    fixture.componentInstance.retryRequested.subscribe(() => (retries += 1));
  });

  it('should announce itself as an alert rather than wait to be noticed', () => {
    expect(alert()?.getAttribute('role')).toBe('alert');
  });

  it('should name every blocked operation instead of reporting a bare count', () => {
    expect(rows()).toHaveLength(2);
    expect(rows()[0]?.textContent).toContain('Work item update');
    expect(rows()[1]?.textContent).toContain('New comment');
  });

  it('should carry the per-operation error when the server gave one', () => {
    expect(rows()[0]?.textContent).toContain('The work item was changed by someone else.');
  });

  it('should state the count in the title', () => {
    expect(alert()?.textContent).toContain('2 changes could not be sent');
  });

  it('should render the coordinator reason when there is one', async () => {
    fixture.componentRef.setInput('reason', 'Replay stopped after a conflict.');
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-sync-blocked-alert-reason"]')?.textContent,
    ).toContain('Replay stopped after a conflict.');
  });

  it('should not repeat the coordinator reason when a listed operation already carries it', async () => {
    fixture.componentRef.setInput('reason', 'The work item was changed by someone else.');
    await fixture.whenStable();

    expect(
      root().querySelector('[data-testid="intervention-sync-blocked-alert-reason"]'),
    ).toBeNull();
    expect(rows()[0]?.textContent).toContain('The work item was changed by someone else.');
  });

  it('should ask the page to replay the queue', () => {
    retry()?.click();

    expect(retries).toBe(1);
  });

  it('should read as busy rather than unresponsive while a replay runs', async () => {
    fixture.componentRef.setInput('retrying', true);
    await fixture.whenStable();

    expect(retry()?.disabled).toBe(true);
    expect(retry()?.getAttribute('aria-busy')).toBe('true');
    expect(retry()?.textContent).toContain('Sending…');
  });
});
