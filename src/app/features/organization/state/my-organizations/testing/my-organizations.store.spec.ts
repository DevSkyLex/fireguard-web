import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { delay, of, throwError } from 'rxjs';
import type { HydraCollection } from '@core/api/models';
import { OrganizationMemberService, OrganizationService } from '@features/organization/data-access';
import type { OrganizationOutput } from '@features/organization/models';
import { ActiveOrganizationStore } from '../../active-organization/active-organization.store';
import { myOrganizationsStoreEvents } from '../events';
import { MyOrganizationsStore } from '../my-organizations.store';

/** Event types seen by the dispatcher spy, in dispatch order. */
const dispatchedTypes = (dispatcher: { dispatch: ReturnType<typeof vi.fn> }): string[] =>
  dispatcher.dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

const flushEffects = async (): Promise<void> => {
  await Promise.resolve();
};

function organization(overrides: Partial<OrganizationOutput> = {}): OrganizationOutput {
  return {
    '@id': '/api/organizations/org-1',
    '@type': 'Organization',
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    ownerUserId: 'user-1',
    createdByUserId: 'user-1',
    status: 'active',
    isActive: true,
    memberCount: 1,
    planName: null,
    createdAt: '2026-01-01T00:00:00+00:00',
    updatedAt: '2026-01-01T00:00:00+00:00',
    ...overrides,
  } as unknown as OrganizationOutput;
}

describe('MyOrganizationsStore', () => {
  let store: MyOrganizationsStore;
  let mockDispatcher: { dispatch: ReturnType<typeof vi.fn> };
  let mockOrganizationService: { list: ReturnType<typeof vi.fn> };
  let mockMemberService: { leave: ReturnType<typeof vi.fn> };
  let mockActiveOrganizationStore: { selectedOrganizationId: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDispatcher = { dispatch: vi.fn() };
    mockOrganizationService = { list: vi.fn() };
    mockMemberService = { leave: vi.fn() };
    mockActiveOrganizationStore = { selectedOrganizationId: vi.fn().mockReturnValue(null) };

    TestBed.configureTestingModule({
      providers: [
        { provide: Dispatcher, useValue: mockDispatcher },
        { provide: OrganizationService, useValue: mockOrganizationService },
        { provide: OrganizationMemberService, useValue: mockMemberService },
        { provide: ActiveOrganizationStore, useValue: mockActiveOrganizationStore },
      ],
    });

    store = TestBed.inject(MyOrganizationsStore);
  });

  it('should transition through pending to success and hold the list on load', async () => {
    const response: HydraCollection<OrganizationOutput> = {
      member: [organization()],
      totalItems: 1,
    } as unknown as HydraCollection<OrganizationOutput>;
    mockOrganizationService.list.mockReturnValue(of(response).pipe(delay(1)));

    store.loadOrganizations();
    expect(store.listCallState().status).toBe('pending');

    await new Promise<void>((resolve) => setTimeout(resolve, 5));

    expect(store.listCallState().status).toBe('success');
    expect(store.organizations()).toEqual([organization()]);
  });

  it('should move to error and dispatch listFailed when loading fails', async () => {
    mockOrganizationService.list.mockReturnValue(throwError(() => new Error('network down')));

    store.loadOrganizations();
    await flushEffects();

    expect(store.listCallState().status).toBe('error');
    expect(dispatchedTypes(mockDispatcher)).toEqual([myOrganizationsStoreEvents.listFailed.type]);
  });

  it('should mark leave as pending while the removal is in flight', async () => {
    mockMemberService.leave.mockReturnValue(of(undefined).pipe(delay(1)));

    store.leave('org-1');

    expect(store.leaveCallState().status).toBe('pending');
    expect(store.isLeaving()).toBe(true);

    await new Promise<void>((resolve) => setTimeout(resolve, 5));
  });

  it('should remove the organization from the list and dispatch leaveSucceeded once leave resolves', async () => {
    mockOrganizationService.list.mockReturnValue(
      of({
        member: [organization(), organization({ id: 'org-2', name: 'Globex' })],
        totalItems: 2,
      }),
    );
    store.loadOrganizations();
    await flushEffects();
    expect(store.organizations().length).toBe(2);

    mockMemberService.leave.mockReturnValue(of(undefined));
    store.leave('org-1');
    await flushEffects();

    expect(store.leaveCallState().status).toBe('success');
    expect(store.organizations()).toEqual([organization({ id: 'org-2', name: 'Globex' })]);
    expect(dispatchedTypes(mockDispatcher)).toEqual([
      myOrganizationsStoreEvents.leaveSucceeded.type,
    ]);
  });

  it('should normalize the error through toStoreError and dispatch leaveFailed when leave is refused', async () => {
    mockMemberService.leave.mockReturnValue(
      throwError(() => ({
        '@type': 'Error',
        status: 409,
        title: 'Conflict',
        detail: 'You are the last administrator.',
      })),
    );

    store.leave('org-1');
    await flushEffects();

    expect(store.leaveCallState().status).toBe('error');
    expect(store.leaveError()?.code).toBe(409);
    expect(dispatchedTypes(mockDispatcher)).toEqual([myOrganizationsStoreEvents.leaveFailed.type]);
  });

  it('should reset the leave call state back to idle', async () => {
    mockMemberService.leave.mockReturnValue(throwError(() => new Error('refused')));
    store.leave('org-1');
    await flushEffects();
    expect(store.leaveCallState().status).toBe('error');

    store.resetLeaveOperation();

    expect(store.leaveCallState().status).toBe('idle');
  });

  it('should proxy activeOrganizationId from ActiveOrganizationStore', () => {
    mockActiveOrganizationStore.selectedOrganizationId.mockReturnValue('org-1');

    expect(store.activeOrganizationId()).toBe('org-1');
  });
});
