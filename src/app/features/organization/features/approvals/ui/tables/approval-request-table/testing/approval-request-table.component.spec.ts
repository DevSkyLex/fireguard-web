import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { ApprovalRequestOutput } from '@features/organization/features/approvals/models';
import { ApprovalRequestTable } from '../approval-request-table.component';

function request(overrides: Partial<ApprovalRequestOutput> = {}): ApprovalRequestOutput {
  return {
    '@id': '/api/organizations/org-1/approval-requests/request-1',
    '@type': 'ApprovalRequest',
    id: 'request-1',
    organizationId: 'org-1',
    actionType: 'equipment_decommission',
    subjectId: 'equipment-1',
    status: 'pending',
    requestedByMemberId: 'member-1',
    requestedByUserId: 'user-1',
    expiresAt: '2026-02-01T00:00:00+00:00',
    createdAt: '2026-01-18T00:00:00+00:00',
    updatedAt: '2026-01-18T00:00:00+00:00',
    ...overrides,
  };
}

describe('ApprovalRequestTable', () => {
  let fixture: ComponentFixture<ApprovalRequestTable>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    });

    fixture = TestBed.createComponent(ApprovalRequestTable);
    fixture.componentRef.setInput('organizationId', 'org-1');
  });

  it('should render one row per item and hide the actions column when canDecide is false', async () => {
    fixture.componentRef.setInput('items', [request()]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[data-testid="approval-request-table-row"]').length).toBe(1);
    expect(element.querySelector('[data-testid="approval-request-table-approve"]')).toBeNull();
  });

  it('should emit approveRequested and rejectRequested from a pending row when canDecide is true', async () => {
    const item = request();
    fixture.componentRef.setInput('items', [item]);
    fixture.componentRef.setInput('canDecide', true);
    await fixture.whenStable();

    const approveSpy = vi.fn();
    const rejectSpy = vi.fn();
    fixture.componentInstance.approveRequested.subscribe(approveSpy);
    fixture.componentInstance.rejectRequested.subscribe(rejectSpy);

    const element = fixture.nativeElement as HTMLElement;
    (
      element.querySelector('[data-testid="approval-request-table-approve"]') as HTMLButtonElement
    ).click();
    (
      element.querySelector('[data-testid="approval-request-table-reject"]') as HTMLButtonElement
    ).click();

    expect(approveSpy).toHaveBeenCalledWith(item);
    expect(rejectSpy).toHaveBeenCalledWith(item);
  });

  it('should not render decide actions on a decided row even when canDecide is true', async () => {
    fixture.componentRef.setInput('items', [request({ status: 'approved' })]);
    fixture.componentRef.setInput('canDecide', true);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="approval-request-table-approve"]')).toBeNull();
  });

  it('should give each row a distinct, non-identical accessible name for its Approve and Reject buttons', async () => {
    fixture.componentRef.setInput('items', [
      request({
        id: 'request-1',
        actionType: 'equipment_decommission',
        subjectId: 'equipment-1',
        createdAt: '2026-01-18T00:00:00+00:00',
      }),
      request({
        id: 'request-2',
        actionType: 'nc_waiver',
        subjectId: 'nc-1',
        createdAt: '2026-01-19T00:00:00+00:00',
      }),
    ]);
    fixture.componentRef.setInput('canDecide', true);
    await fixture.whenStable();

    // Scoped to the table: the card layout renders the same row a second time,
    // which is the point of the shared surface, not a duplicate to assert on.
    const element = fixture.nativeElement as HTMLElement;
    const approveButtons = element.querySelectorAll(
      '[data-testid="approval-request-table"] [data-testid="approval-request-table-approve"]',
    );
    const rejectButtons = element.querySelectorAll(
      '[data-testid="approval-request-table"] [data-testid="approval-request-table-reject"]',
    );

    const firstApproveLabel = approveButtons[0].getAttribute('aria-label');
    const secondApproveLabel = approveButtons[1].getAttribute('aria-label');
    const firstRejectLabel = rejectButtons[0].getAttribute('aria-label');

    expect(firstApproveLabel).toContain('2026-01-18');
    expect(secondApproveLabel).toContain('2026-01-19');
    expect(firstApproveLabel).not.toContain('equipment-1');
    expect(firstApproveLabel).not.toBe(secondApproveLabel);
    expect(firstApproveLabel).not.toBe(firstRejectLabel);
  });

  it('should draw placeholder rows on a first load, and no data rows', async () => {
    fixture.componentRef.setInput('items', []);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="approval-request-table-row"]')).toBeNull();
    expect(element.querySelectorAll('hlm-skeleton').length).toBeGreaterThan(0);
  });

  it('should keep the rows on screen while a later page loads', async () => {
    fixture.componentRef.setInput('items', [request()]);
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();

    // The shared surface's loading contract is "first load only": flashing the
    // inbox to skeletons on page 2 loses the reader's place for nothing.
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="approval-request-table-row"]')).not.toBeNull();
    expect(element.querySelectorAll('hlm-skeleton').length).toBe(0);
  });

  it('should render the same request a second time as a card, under the row testid plus -card', async () => {
    fixture.componentRef.setInput('items', [request(), request({ id: 'request-2' })]);
    await fixture.whenStable();

    // Both layouts stay mounted — a container query, not an `@if`, picks the
    // visible one — so a card is a second render of the same row.
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('[data-testid="approval-request-table-row-card"]').length).toBe(
      2,
    );
    expect(element.querySelectorAll('[data-testid="approval-request-table-row"]').length).toBe(2);
  });

  it('should link the subject for a known action type and render a bare reference otherwise', async () => {
    fixture.componentRef.setInput('items', [
      request({ actionType: 'equipment_decommission' }),
      request({ id: 'request-2', actionType: 'nc_waiver', subjectId: 'nc-1' }),
    ]);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    const rows = element.querySelectorAll('[data-testid="approval-request-table-row"]');

    expect(rows[0].querySelector('a')).not.toBeNull();
    expect(rows[1].querySelector('a')).toBeNull();
    expect(rows[0].textContent).toContain('Equipment record');
    expect(rows[1].textContent).toContain('Non-conformity record');
    expect(rows[1].textContent).not.toContain('nc-1');
  });

  it('should resolve requester and decider member ids without rendering transport values', async () => {
    fixture.componentRef.setInput('memberLabelOf', (memberId: string): string =>
      memberId === 'member-1' ? 'Amélie Rousseau' : 'Marc Dubois',
    );
    fixture.componentRef.setInput('items', [
      request({
        status: 'approved',
        decisionByMemberId: 'member-2',
        decisionByUserId: 'user-2',
      }),
    ]);
    await fixture.whenStable();

    const row = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="approval-request-table-row"]',
    );
    expect(row?.textContent).toContain('Amélie Rousseau');
    expect(row?.textContent).toContain('Marc Dubois');
    expect(row?.textContent).not.toContain('member-1');
    expect(row?.textContent).not.toContain('user-2');
  });
});
