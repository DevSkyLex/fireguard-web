import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { INTERACTION_CAPABILITIES_PORT } from '@core/interaction-capabilities';
import {
  errorCallState,
  idleCallState,
  successCallState,
  type CallState,
} from '@core/request-state';
import { OrganizationPermissionService } from '@features/organization/access';
import type { ApprovalRequestOutput } from '@features/organization/features/approvals/models';
import { ApprovalRequestsStore } from '@features/organization/features/approvals/state';
import { MEMBER_DIRECTORY_PORT, REGIONAL_FORMATTING_PORT } from '@features/organization/ports';
import { DEFAULT_REGIONAL_FORMAT_SETTINGS } from '@shared/regional-format';
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
  let withdraw: ReturnType<typeof vi.fn>;
  let loadActionTypes: ReturnType<typeof vi.fn>;
  let resetDecideOperation: ReturnType<typeof vi.fn>;
  let decideCallState: WritableSignal<CallState>;
  let totalRequests: WritableSignal<number>;
  let hasPermission: ReturnType<typeof vi.fn>;
  let ensureDirectoryLoaded: ReturnType<typeof vi.fn>;

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
    withdraw = vi.fn();
    loadActionTypes = vi.fn();
    resetDecideOperation = vi.fn();
    decideCallState = signal<CallState>(idleCallState());
    totalRequests = signal(1);
    hasPermission = vi.fn().mockReturnValue(true);
    ensureDirectoryLoaded = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: INTERACTION_CAPABILITIES_PORT,
          useValue: {
            interactionMode: signal('desktop'),
            isMobileInteractionMode: signal(false),
          },
        },
        {
          provide: REGIONAL_FORMATTING_PORT,
          useValue: { regionalFormatting: signal(DEFAULT_REGIONAL_FORMAT_SETTINGS) },
        },
        {
          provide: MEMBER_DIRECTORY_PORT,
          useValue: {
            byId: signal(new Map()),
            isAvailable: signal(true),
            isLoading: signal(false),
            ensureLoaded: ensureDirectoryLoaded,
            displayNameFor: (memberId: string): string =>
              memberId === 'member-1' ? 'Amélie Rousseau' : 'Unknown member',
          },
        },
        provideRouter([]),
        {
          provide: ApprovalRequestsStore,
          useValue: {
            load,
            refresh,
            approve,
            reject,
            withdraw,
            loadActionTypes,
            resetDecideOperation,
            requests: signal<readonly ApprovalRequestOutput[]>([request]),
            totalRequests,
            isLoading: signal(false),
            hasListError: signal(false),
            isListForbidden: signal(false),
            isDeciding: signal(false),
            decideErrorText: signal(null),
            actionTypes: signal([]),
            decideCallState,
            refreshCallState: signal(idleCallState()),
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
    expect(ensureDirectoryLoaded).toHaveBeenCalledWith('org-1');
  });

  it('should render search and forward a settled term from the first page', async () => {
    fixture = await createPage();
    load.mockClear();
    fixture.componentInstance['page'].set(3);

    fixture.componentInstance['onSearchQueryChanged']('  extinguisher  ');
    await new Promise((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('[data-testid="approvals-search"]')).not.toBeNull();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({
      options: { page: 1, search: 'extinguisher' },
    });
  });

  it('should give the action-type filter a persistent, associated label once its chip is picked', async () => {
    fixture = await createPage();

    (fixture.componentInstance as unknown as { onFieldPicked(key: string): void }).onFieldPicked(
      'actionType',
    );
    await fixture.whenStable();

    const label = fixture.nativeElement.querySelector(
      'label[for="approvals-filter-action-type"]',
    ) as HTMLLabelElement;

    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Action type');
  });

  it('should expose status through the generic selector and narrow to the picked value', async () => {
    fixture = await createPage();
    load.mockClear();

    expect(
      fixture.nativeElement.querySelector('[data-testid="approvals-filter-status"]'),
    ).not.toBeNull();

    (
      fixture.componentInstance as unknown as {
        applyStatus(value: string | null | undefined): void;
      }
    ).applyStatus('approved');
    await fixture.whenStable();

    expect(load).toHaveBeenCalledWith(
      expect.objectContaining({ query: { status: 'approved', actionType: undefined } }),
    );
  });

  it('ignores unknown statuses and clears both picked filters without leaving a stale page', async () => {
    fixture = await createPage();
    const page = fixture.componentInstance as unknown as {
      page: WritableSignal<number>;
      status: WritableSignal<string | null>;
      actionType: WritableSignal<string | null>;
      openFilterKey: WritableSignal<string | null>;
      applyStatus(value: string | null | undefined): void;
      applyActionType(value: string | null | undefined): void;
      onFieldPicked(key: string): void;
      onFieldRemoved(key: string): void;
    };
    page.page.set(3);
    page.applyStatus('unsupported-status');
    expect(page.status()).toBe('pending');
    expect(page.page()).toBe(3);

    page.onFieldPicked('status');
    page.applyStatus('approved');
    expect(page.openFilterKey()).toBeNull();
    expect(page.page()).toBe(1);
    page.onFieldRemoved('status');
    expect(page.status()).toBeNull();

    page.onFieldPicked('actionType');
    page.applyActionType('equipment_decommission');
    expect(page.openFilterKey()).toBeNull();
    page.onFieldRemoved('actionType');
    expect(page.actionType()).toBeNull();
  });

  it('bounds pagination and retries the current query with its active filters', async () => {
    totalRequests.set(125);
    fixture = await createPage();
    const page = fixture.componentInstance as unknown as {
      page: WritableSignal<number>;
      pageSize: WritableSignal<number>;
      searchTerm: WritableSignal<string>;
      status: WritableSignal<string | null>;
      actionType: WritableSignal<string | null>;
      goToPage(target: number): void;
      setPageSize(size: number): void;
      reload(): void;
    };
    page.goToPage(999);
    expect(page.page()).toBe(5);
    page.setPageSize(60);
    expect(page.page()).toBe(1);
    page.goToPage(999);
    expect(page.page()).toBe(3);
    page.searchTerm.set('extinguisher');
    page.status.set('approved');
    page.actionType.set('equipment_decommission');
    load.mockClear();

    page.reload();

    expect(load).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      options: { page: 3, itemsPerPage: 60, search: 'extinguisher' },
      query: { status: 'approved', actionType: 'equipment_decommission' },
    });
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

  it('routes rejection and withdrawal to their own commands and ignores submission after close', async () => {
    fixture = await createPage();
    const page = fixture.componentInstance as unknown as {
      openReject(request: ApprovalRequestOutput): void;
      openWithdraw(request: ApprovalRequestOutput): void;
      closeDecisionDialog(): void;
      submitDecision(note: string): void;
    };
    page.openReject(request);
    page.submitDecision('');
    expect(reject).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      requestId: request.id,
      note: undefined,
    });
    page.closeDecisionDialog();
    page.submitDecision('Ignored');
    expect(reject).toHaveBeenCalledTimes(1);

    page.openWithdraw(request);
    page.submitDecision('Requester cancelled');
    expect(withdraw).toHaveBeenCalledExactlyOnceWith({
      organizationId: 'org-1',
      requestId: request.id,
      note: 'Requester cancelled',
    });
    expect(approve).not.toHaveBeenCalled();
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

    expect(refresh).toHaveBeenCalledWith(['org-1', 'request-1']);
    expect(
      (fixture.componentInstance as unknown as { decisionTarget: () => unknown }).decisionTarget(),
    ).not.toBeNull();
  });

  it('drops a decision target on organization change and ignores the old conflict', async () => {
    fixture = await createPage();
    const page = fixture.componentInstance as unknown as {
      decisionTarget: WritableSignal<unknown>;
      openApprove(request: ApprovalRequestOutput): void;
    };
    page.openApprove(request);
    decideCallState.set({ status: 'pending', data: null, error: null });
    await fixture.whenStable();

    fixture.componentRef.setInput('organizationId', 'org-2');
    await fixture.whenStable();
    decideCallState.set(
      errorCallState({
        error: { status: 409 },
        message: 'Old organization conflict',
        code: 409,
        retryable: false,
        timestamp: Date.now(),
      }),
    );
    await fixture.whenStable();

    expect(page.decisionTarget()).toBeNull();
    expect(refresh).not.toHaveBeenCalled();
    expect(load.mock.calls.at(-1)?.[0]).toMatchObject({ organizationId: 'org-2' });
  });

  it('should not render decide actions on the table when the reader lacks organization.approvals.decide', async () => {
    hasPermission.mockReturnValue(false);
    fixture = await createPage();

    expect(
      fixture.nativeElement.querySelector('[data-testid="approval-request-table-approve"]'),
    ).toBeNull();
  });
});
