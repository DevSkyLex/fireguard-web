import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { ApprovalRequestService } from '@features/organization/features/approvals/data-access';
import type {
  ApprovalActionTypeOutput,
  ApprovalRequestOutput,
} from '@features/organization/features/approvals/models';
import { ApprovalRequestsStore } from '../approval-requests.store';

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

describe('ApprovalRequestsStore', () => {
  let store: InstanceType<typeof ApprovalRequestsStore>;
  let mockService: {
    list: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    approve: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
    listActionTypes: ReturnType<typeof vi.fn>;
  };
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };

  const organizationId = 'org-1';

  const request: ApprovalRequestOutput = {
    '@id': `/api/organizations/${organizationId}/approval-requests/request-1`,
    '@type': 'ApprovalRequest',
    id: 'request-1',
    organizationId,
    actionType: 'equipment_decommission',
    subjectId: 'equipment-1',
    status: 'pending',
    requestedByMemberId: 'member-1',
    requestedByUserId: 'user-1',
    expiresAt: '2026-02-01T00:00:00+00:00',
    createdAt: '2026-01-18T00:00:00+00:00',
    updatedAt: '2026-01-18T00:00:00+00:00',
  };

  const collection: HydraCollection<ApprovalRequestOutput> = {
    '@id': `/api/organizations/${organizationId}/approval-requests`,
    '@type': 'Collection',
    totalItems: 1,
    member: [request],
  };

  const actionTypes: ApprovalActionTypeOutput[] = [
    {
      '@id': '/api/approvals/action-types/nc_waiver',
      '@type': 'ApprovalActionType',
      value: 'nc_waiver',
      label: 'Non-conformity waiver',
    },
  ];

  beforeEach(() => {
    mockService = {
      list: vi.fn().mockReturnValue(of(collection)),
      get: vi.fn().mockReturnValue(of(request)),
      approve: vi.fn().mockReturnValue(of({ ...request, status: 'approved' })),
      reject: vi.fn().mockReturnValue(of({ ...request, status: 'rejected' })),
      listActionTypes: vi
        .fn()
        .mockReturnValue(
          of({ '@id': '', '@type': 'Collection', totalItems: 1, member: actionTypes }),
        ),
    };
    mockDispatcher = { dispatch: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        ApprovalRequestsStore,
        { provide: ApprovalRequestService, useValue: mockService },
        { provide: Dispatcher, useValue: mockDispatcher },
      ],
    });

    store = TestBed.inject(ApprovalRequestsStore);
  });

  describe('load', () => {
    it('should populate the request collection on success', async () => {
      store.load({ organizationId });
      await flushEffects();

      expect(mockService.list).toHaveBeenCalledWith(organizationId, undefined, undefined);
      expect(store.requests()).toEqual([request]);
      expect(store.isEmpty()).toBe(false);
      expect(store.hasListError()).toBe(false);
    });

    it('should record a normalized error and dispatch listFailed on failure', async () => {
      mockService.list.mockReturnValue(throwError(() => ({ status: 500, title: 'Server error' })));

      store.load({ organizationId });
      await flushEffects();

      expect(store.hasListError()).toBe(true);
      expect(mockDispatcher.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: '[Approval Requests Store] listFailed' }),
      );
    });
  });

  describe('approve', () => {
    it('should replace the decided row from the response, not refetch', async () => {
      store.load({ organizationId });
      await flushEffects();

      store.approve({ organizationId, requestId: 'request-1', note: 'Looks fine' });
      await flushEffects();

      expect(mockService.approve).toHaveBeenCalledWith(organizationId, 'request-1', {
        decisionNote: 'Looks fine',
      });
      expect(mockService.list).toHaveBeenCalledTimes(1);
      expect(store.requests()).toEqual([{ ...request, status: 'approved' }]);
      expect(store.isDeciding()).toBe(false);
    });

    it('should send no body field when no note is given', async () => {
      store.approve({ organizationId, requestId: 'request-1' });
      await flushEffects();

      expect(mockService.approve).toHaveBeenCalledWith(organizationId, 'request-1', undefined);
    });

    it('should map a 409 subject-changed failure to the cancellation copy', async () => {
      mockService.approve.mockReturnValue(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 409,
          type: 'about:blank',
          title: 'Conflict',
          detail: 'The deferred action can no longer be applied: reopened',
        })),
      );

      store.approve({ organizationId, requestId: 'request-1' });
      await flushEffects();

      expect(store.decideErrorText()).toContain('cancelled');
    });

    it('should map a 403 self-approval failure to the self-approval copy', async () => {
      mockService.approve.mockReturnValue(
        throwError(() => ({
          '@id': '',
          '@type': 'Error',
          status: 403,
          type: 'about:blank',
          title: 'Forbidden',
          detail: 'The requester cannot decide on their own approval request.',
        })),
      );

      store.approve({ organizationId, requestId: 'request-1' });
      await flushEffects();

      expect(store.decideErrorText()).toContain('yourself');
    });
  });

  describe('reject', () => {
    it('should replace the decided row from the response', async () => {
      store.load({ organizationId });
      await flushEffects();

      store.reject({ organizationId, requestId: 'request-1' });
      await flushEffects();

      expect(mockService.reject).toHaveBeenCalledWith(organizationId, 'request-1', undefined);
      expect(store.requests()).toEqual([{ ...request, status: 'rejected' }]);
    });
  });

  describe('refresh', () => {
    it('should re-read one request and replace its cached row', async () => {
      store.load({ organizationId });
      await flushEffects();

      mockService.get.mockReturnValue(of({ ...request, status: 'cancelled' }));
      store.refresh(organizationId, 'request-1');
      await flushEffects();

      expect(mockService.get).toHaveBeenCalledWith(organizationId, 'request-1');
      expect(store.requests()).toEqual([{ ...request, status: 'cancelled' }]);
    });
  });

  describe('loadActionTypes', () => {
    it('should populate the action-type catalog', async () => {
      store.loadActionTypes();
      await flushEffects();

      expect(store.actionTypes()).toEqual(actionTypes);
    });
  });

  describe('resetDecideOperation', () => {
    it('should return the decide operation to idle', async () => {
      store.approve({ organizationId, requestId: 'request-1' });
      await flushEffects();

      store.resetDecideOperation();

      expect(store.isDeciding()).toBe(false);
      expect(store.decideErrorText()).toBeNull();
    });
  });
});
