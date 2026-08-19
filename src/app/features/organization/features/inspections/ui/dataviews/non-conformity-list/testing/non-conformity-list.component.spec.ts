import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type {
  NonConformityOutput,
  NonConformityWaivePendingOutput,
} from '@features/organization/features/inspections/models';
import { NonConformityList } from '../non-conformity-list.component';

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

  const root = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function createList(
    items: readonly NonConformityOutput[] = [],
    overrides: { canWrite?: boolean; loading?: boolean } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(NonConformityList);
    fixture.componentRef.setInput('nonConformities', items);
    fixture.componentRef.setInput('organizationId', 'org-1');
    fixture.componentRef.setInput('canWrite', overrides.canWrite ?? false);
    fixture.componentRef.setInput('loading', overrides.loading ?? false);
    await fixture.whenStable();

    statusPicked = [];
    fixture.componentInstance.statusPicked.subscribe((event) => statusPicked.push(event));
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

  it('should render one row per non-conformity with its description', async () => {
    await createList([nonConformity(), nonConformity({ id: 'nc-2', description: 'Second' })]);

    const rows = root().querySelectorAll('[data-testid="non-conformity-row"]');
    expect(rows.length).toBe(2);
    expect(rows[1].textContent).toContain('Second');
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
    expect(links.length).toBe(2);
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
    expect(labels.length).toBe(2);
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
