import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { THEME_PORT, type ThemePort } from '@core/theme';
import type {
  NonConformityOutput,
  NonConformityWaivePendingOutput,
} from '@features/organization/features/inspections/models';
import { NonConformityList } from '../non-conformity-list.component';

/** A `'YYYY-MM-DD'` calendar day `days` away from the real, unmocked "now" in UTC — the default `regionalFormatting` timezone — so overdue tests need no fake clock. */
function isoDaysFromToday(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

function nonConformity(overrides: Partial<NonConformityOutput> = {}): NonConformityOutput {
  return {
    '@id': '/api/organizations/org-1/inspections/inspection-1/non-conformities/nc-1',
    '@type': 'NonConformity',
    id: 'nc-1',
    inspectionId: 'inspection-1',
    description: 'Pressure gauge out of range',
    severity: 'high',
    status: 'open',
    dueAt: null,
    resolvedAt: null,
    notes: null,
    createdAt: '2026-03-01T09:00:00+00:00',
    updatedAt: '2026-03-01T09:00:00+00:00',
    ...overrides,
  };
}

describe('NonConformityList', () => {
  let fixture: ComponentFixture<NonConformityList>;
  let statusPicked: Array<{ nonConformityId: string; status: string }>;
  let retryRequested: number;

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  afterEach(() => vi.useRealTimers());

  async function createList(
    items: readonly NonConformityOutput[] = [],
    overrides: { canWrite?: boolean; loading?: boolean; error?: string | null } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: THEME_PORT,
          useValue: {
            theme: signal('light'),
            resolvedTheme: signal('light'),
            setTheme: vi.fn(),
          } satisfies ThemePort,
        },
      ],
    });

    fixture = TestBed.createComponent(NonConformityList);
    fixture.componentRef.setInput('nonConformities', items);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('canWrite', overrides.canWrite ?? false);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    fixture.componentRef.setInput('error', overrides.error ?? null);
    await fixture.whenStable();

    statusPicked = [];
    fixture.componentInstance.statusPicked.subscribe((event) => statusPicked.push(event));
    retryRequested = 0;
    fixture.componentInstance.retryRequested.subscribe(() => retryRequested++);
  }

  it('should render the empty state when there is nothing to show and no load is in flight', async () => {
    await createList([]);

    expect(root().querySelector('[data-testid="non-conformity-list-empty"]')).not.toBeNull();
    expect(root().querySelector('[data-testid="non-conformity-list"]')).toBeNull();
  });

  it('should render the skeleton instead of the empty state while loading', async () => {
    await createList([], { loading: true });

    expect(root().querySelector('[data-testid="non-conformity-list-empty"]')).toBeNull();
    expect(root().querySelector('[role="status"]')).not.toBeNull();
  });

  it('should render the load-failed state instead of the plain empty state when there is an error', async () => {
    await createList([], { error: 'Network error' });

    const failure = root().querySelector('[data-testid="non-conformity-list-error"]');
    expect(failure).not.toBeNull();
    expect(failure?.getAttribute('role')).toBe('alert');
    expect(failure?.textContent).toContain('Network error');
    expect(root().querySelector('[data-testid="non-conformity-list-empty"]')).toBeNull();
  });

  it('should emit retryRequested when the load-failed state\'s "Try again" is activated', async () => {
    await createList([], { error: 'Network error' });

    root().querySelector<HTMLButtonElement>('[data-testid="non-conformity-list-retry"]')?.click();

    expect(retryRequested).toBe(1);
  });

  it('should render one row per non-conformity with its description', async () => {
    await createList([nonConformity(), nonConformity({ id: 'nc-2', description: 'Second' })]);

    const rows = root().querySelectorAll('[data-testid="non-conformity-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[1].textContent).toContain('Second');
  });

  it('should render an API row with omitted nullable fields without date or note labels', async () => {
    await createList([
      nonConformity({ dueAt: undefined, resolvedAt: undefined, notes: undefined }),
    ]);

    expect(root().querySelector('[data-testid="non-conformity-row"]')?.textContent).toContain(
      'Pressure gauge out of range',
    );
    expect(root().querySelector('[data-testid="non-conformity-due"]')).toBeNull();
    expect(root().querySelector('[data-testid="non-conformity-resolved"]')).toBeNull();
    expect(root().querySelector('[data-testid="non-conformity-notes"]')).toBeNull();
    expect(root().textContent).not.toContain('Overdue');
  });

  it('should not render a status select for a read-only viewer', async () => {
    await createList([nonConformity()], { canWrite: false });

    expect(root().querySelector('[data-testid="non-conformity-status-select"]')).toBeNull();
  });

  it('should not render a status select for a terminal (done/waived) row even for a writer', async () => {
    await createList([nonConformity({ status: 'waived' })], { canWrite: true });

    expect(root().querySelector('[data-testid="non-conformity-status-select"]')).toBeNull();
  });

  it('should render the pending-approval notice with a link into the approvals inbox', async () => {
    await createList([nonConformity()], { canWrite: true });

    const pending: Readonly<Record<string, NonConformityWaivePendingOutput>> = {
      'nc-1': {
        status: 'pending_approval',
        approvalRequestId: 'approval-1',
        approvalStatus: 'pending',
        expiresAt: '2026-04-01T00:00:00+00:00',
      },
    };
    fixture.componentRef.setInput('pendingApprovals', pending);
    await fixture.whenStable();

    const notice = root().querySelector('[data-testid="non-conformity-pending-approval"]');
    expect(notice).not.toBeNull();
    const link = root().querySelector<HTMLAnchorElement>(
      '[data-testid="non-conformity-pending-approval-link"]',
    );
    expect(link?.getAttribute('href')).toBe('/organizations/org-1/approvals');
  });

  it('should give each row a distinct accessible name on its pending-approval link', async () => {
    await createList(
      [
        nonConformity({ id: 'nc-1', description: 'Pressure gauge out of range' }),
        nonConformity({ id: 'nc-2', description: 'Hose reel corroded at the coupling' }),
      ],
      { canWrite: true },
    );

    const pending: Readonly<Record<string, NonConformityWaivePendingOutput>> = {
      'nc-1': {
        status: 'pending_approval',
        approvalRequestId: 'approval-1',
        approvalStatus: 'pending',
        expiresAt: '2026-04-01T00:00:00+00:00',
      },
      'nc-2': {
        status: 'pending_approval',
        approvalRequestId: 'approval-2',
        approvalStatus: 'pending',
        expiresAt: '2026-04-01T00:00:00+00:00',
      },
    };
    fixture.componentRef.setInput('pendingApprovals', pending);
    await fixture.whenStable();

    const links = root().querySelectorAll<HTMLAnchorElement>(
      '[data-testid="non-conformity-pending-approval-link"]',
    );
    expect(links).toHaveLength(2);
    const labels = Array.from(links).map((link) => link.getAttribute('aria-label'));
    expect(new Set(labels).size).toBe(2);
    expect(labels[0]).toContain('Pressure gauge out of range');
    expect(labels[1]).toContain('Hose reel corroded');
  });

  it('should give each row a distinct accessible name on its status select', async () => {
    await createList(
      [
        nonConformity({ id: 'nc-1', description: 'Pressure gauge out of range' }),
        nonConformity({ id: 'nc-2', description: 'Hose reel corroded at the coupling' }),
      ],
      { canWrite: true },
    );

    const labels = root().querySelectorAll('label[for^="non-conformity-status-"]');
    expect(labels).toHaveLength(2);
    const texts = Array.from(labels).map((label) => label.textContent?.trim());
    expect(new Set(texts).size).toBe(2);
    expect(texts[0]).toContain('Pressure gauge out of range');
    expect(texts[1]).toContain('Hose reel corroded');
  });

  it('should render the status-write error inline under its own row only, described by the trigger', async () => {
    await createList(
      [nonConformity({ id: 'nc-1' }), nonConformity({ id: 'nc-2', description: 'Second' })],
      { canWrite: true },
    );

    fixture.componentRef.setInput('statusErrorId', 'nc-1');
    fixture.componentRef.setInput('statusErrorText', 'This non-conformity is already resolved.');
    await fixture.whenStable();

    const rows = root().querySelectorAll('[data-testid="non-conformity-row"]');
    const firstError = rows[0].querySelector('[data-testid="non-conformity-status-error"]');
    const secondError = rows[1].querySelector('[data-testid="non-conformity-status-error"]');
    expect(firstError?.textContent).toContain('already resolved');
    expect(secondError).toBeNull();

    const trigger = rows[0].querySelector('[data-testid="non-conformity-status-select"]');
    expect(trigger?.getAttribute('aria-describedby')).toBe(firstError?.id);
  });

  it('should not render an inline error for a row that is not the one that failed', async () => {
    await createList([nonConformity({ id: 'nc-1' })], { canWrite: true });

    fixture.componentRef.setInput('statusErrorId', 'nc-2');
    fixture.componentRef.setInput('statusErrorText', 'This non-conformity is already resolved.');
    await fixture.whenStable();

    expect(root().querySelector('[data-testid="non-conformity-status-error"]')).toBeNull();
  });

  it('should show the absolute due date visibly with a muted relative suffix, not the relative form alone', async () => {
    const dueDay: string = isoDaysFromToday(3);
    const dueAt = `${dueDay}T00:00:00Z`;
    await createList([nonConformity({ dueAt, status: 'open' })]);

    const due = root().querySelector('[data-testid="non-conformity-due"]');
    expect(due?.querySelector('time')?.textContent).toContain(dueDay);
    expect(due?.textContent).toContain('in 3 days');
  });

  it('should flag an open row past its due date as Overdue, with an icon and a text label', async () => {
    await createList([nonConformity({ dueAt: isoDaysFromToday(-5), status: 'open' })]);

    const due = root().querySelector('[data-testid="non-conformity-due"]');
    expect(due?.textContent).toContain('Overdue');
    expect(due?.querySelector('ng-icon')).not.toBeNull();
  });

  it.each([
    {
      season: 'summer',
      now: '2026-10-02T23:57:50.000Z',
      dueAt: '2026-10-02T22:00:00.000Z',
      day: '2026-10-03',
    },
    {
      season: 'winter',
      now: '2026-01-15T23:30:00.000Z',
      dueAt: '2026-01-15T23:00:00.000Z',
      day: '2026-01-16',
    },
  ])(
    "should read a due instant's calendar day through the organization's timezone in $season, not its raw UTC date",
    async ({ now, dueAt, day }) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(now));
      await createList([nonConformity({ dueAt, status: 'open' })]);
      fixture.componentRef.setInput('regionalFormatting', {
        dateFormat: 'yyyy-MM-dd',
        timezone: 'Europe/Paris',
      });
      await fixture.whenStable();

      const due = root().querySelector('[data-testid="non-conformity-due"]');
      expect(due?.querySelector('time')?.textContent).toBe(day);
      expect(due?.querySelector('time')?.getAttribute('datetime')).toBe(dueAt);
      expect(due?.textContent).not.toContain('Overdue');
    },
  );

  it.each([
    {
      season: 'summer',
      now: '2026-10-02T23:57:50.000Z',
      dueAt: '2026-10-02T21:59:00.000Z',
      day: '2026-10-02',
    },
    {
      season: 'winter',
      now: '2026-01-15T23:30:00.000Z',
      dueAt: '2026-01-15T22:59:00.000Z',
      day: '2026-01-15',
    },
  ])(
    'should flag as Overdue a due instant whose organization-timezone day has passed in $season, even when its raw UTC day has not',
    async ({ now, dueAt, day }) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(now));
      await createList([nonConformity({ dueAt, status: 'open' })]);
      fixture.componentRef.setInput('regionalFormatting', {
        dateFormat: 'yyyy-MM-dd',
        timezone: 'Europe/Paris',
      });
      await fixture.whenStable();

      const due = root().querySelector('[data-testid="non-conformity-due"]');
      expect(due?.querySelector('time')?.textContent).toBe(day);
      expect(due?.textContent).toContain('Overdue');
    },
  );

  it('should not flag a resolved (terminal) row as Overdue even past its due date', async () => {
    await createList([nonConformity({ dueAt: isoDaysFromToday(-5), status: 'done' })]);

    const due = root().querySelector('[data-testid="non-conformity-due"]');
    expect(due?.textContent).not.toContain('Overdue');
  });

  it('should emit statusPicked with the row id and the chosen status', async () => {
    await createList([nonConformity()], { canWrite: true });

    fixture.componentInstance['pickStatus'](nonConformity(), 'in_progress');

    expect(statusPicked).toEqual([{ nonConformityId: 'nc-1', status: 'in_progress' }]);
  });

  it('should not emit statusPicked when the picked status matches the stored one', async () => {
    await createList([nonConformity()], { canWrite: true });

    fixture.componentInstance['pickStatus'](nonConformity(), 'open');

    expect(statusPicked).toEqual([]);
  });
});
