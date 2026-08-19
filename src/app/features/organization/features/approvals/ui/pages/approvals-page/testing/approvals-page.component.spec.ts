import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  errorCallState,
  idleCallState,
  successCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { ApprovalRequestOutput } from '@features/organization/features/approvals/models';
import { ApprovalRequestsStore } from '@features/organization/features/approvals/state';
import { ApprovalsPage } from '../approvals-page.component';

const createPage = async (): Promise<ComponentFixture<ApprovalsPage>> => {
  const created: ComponentFixture<ApprovalsPage> = TestBed.createComponent(ApprovalsPage);
  created.componentRef.setInput('organizationId', 'org-1');
  await created.whenStable();

  return created;
};

describe('ApprovalsPage', () => {
  let fixture: ComponentFixture<ApprovalsPage>;
  let load: ReturnType<typeof vi.fn>;
  let refresh: ReturnType<typeof vi.fn>;
  let approve: ReturnType<typeof vi.fn>;
  let reject: ReturnType<typeof vi.fn>;
  let loadActionTypes: ReturnType<typeof vi.fn>;
  let resetDecideOperation: ReturnType<typeof vi.fn>;
  let decideCallState: WritableSignal<CallState>;
  let hasPermission: ReturnType<typeof vi.fn>;

  const request: ApprovalRequestOutput = {
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
  };

  beforeEach(() => {
    load = vi.fn();
    refresh = vi.fn();
    approve = vi.fn();
    reject = vi.fn();
    loadActionTypes = vi.fn();
    resetDecideOperation = vi.fn();
    decideCallState = signal<CallState>(idleCallState());
    hasPermission = vi.fn().mockReturnValue(true);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        {
          provide: ApprovalRequestsStore,
          useValue: {
            load,
            refresh,
            approve,
            reject,
            loadActionTypes,
            resetDecideOperation,
            requests: signal<readonly ApprovalRequestOutput[]>([request]),
            totalRequests: signal(1),
            isLoading: signal(false),
            hasListError: signal(false),
            isDeciding: signal(false),
            decideErrorText: signal(null),
            actionTypes: signal([]),
            decideCallState,
          },
        },
        { provide: OrganizationPermissionService, useValue: { hasPermission } },
      ],
    });
  });

  it('should load the pending status by default on arrival', async () => {
    fixture = await createPage();

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        query: { status: 'pending', actionType: undefined },
      }),
    );
    expect(loadActionTypes).toHaveBeenCalled();
  });

  it('should give the action-type filter a persistent, associated label', async () => {
    fixture = await createPage();

    const label = fixture.nativeElement.querySelector(
      'label[for="approvals-filter-action-type"]',
    ) as HTMLLabelElement;

    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Action type');
  });

  it('should narrow the list to the picked status chip', async () => {
    fixture = await createPage();
    load.mockClear();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="approvals-filter-status-approved"]',
      ) as HTMLButtonElement
    ).click();
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ query: { status: 'approved', actionType: undefined } }),
    );
  });

  it('should open the decision dialog in approve mode and call store.approve on confirm', async () => {
    fixture = await createPage();

    (
      fixture.componentInstance as unknown as { openApprove(request: ApprovalRequestOutput): void }
    ).openApprove(request);
    (fixture.componentInstance as unknown as { submitDecision(note: string): void }).submitDecision(
      'Looks fine',
    );

    expect(approve).toHaveBeenCalledWith({
      organizationId: 'org-1',
      requestId: 'request-1',
      note: 'Looks fine',
    });
  });

  it('should close the dialog once a decision succeeds', async () => {
    fixture = await createPage();

    (
      fixture.componentInstance as unknown as { openApprove(request: ApprovalRequestOutput): void }
    ).openApprove(request);
    decideCallState.set({ status: 'pending', data: null, error: null });
    await fixture.whenStable();

    decideCallState.set(successCallState(null));
    await fixture.whenStable();

    expect(
      (fixture.componentInstance as unknown as { decisionTarget: () => unknown }).decisionTarget(),
    ).toBeNull();
    expect(resetDecideOperation).toHaveBeenCalled();
  });

  it('should refresh the row and keep the dialog open on a 409 decide failure', async () => {
    fixture = await createPage();

    (
      fixture.componentInstance as unknown as { openApprove(request: ApprovalRequestOutput): void }
    ).openApprove(request);
    decideCallState.set({ status: 'pending', data: null, error: null });
    await fixture.whenStable();

    decideCallState.set(
      errorCallState({
        error: { status: 409 },
        message: 'Someone else already decided this request.',
        code: 409,
        retryable: false,
        timestamp: Date.now(),
      }),
    );
    await fixture.whenStable();

    expect(refresh).toHaveBeenCalledWith('org-1', 'request-1');
    expect(
      (fixture.componentInstance as unknown as { decisionTarget: () => unknown }).decisionTarget(),
    ).not.toBeNull();
  });

  it('should not render decide actions on the table when the reader lacks organization.approvals.decide', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="approval-request-table-approve"]'),
    ).toBeNull();
  });
});
