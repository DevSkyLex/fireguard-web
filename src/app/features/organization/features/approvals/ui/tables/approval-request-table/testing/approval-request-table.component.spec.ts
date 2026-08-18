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
    expect(rows[1].textContent).toContain('nc-1');
  });
});
