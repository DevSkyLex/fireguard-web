import { TestBed } from '@angular/core/testing';
import { Events } from '@ngrx/signals/events';
import { Subject, of, throwError } from 'rxjs';
import { EmailOwnershipService } from '@features/auth/data-access';
import { OnboardingService } from '@features/onboarding/data-access';
import { OrganizationAccessService } from '@features/organization/data-access';
import type {
  OrganizationJoinOptionsOutput,
  OrganizationAdmissionOutput,
} from '@features/organization/models';
import { organizationMembershipEvents } from '@features/organization/setup';
import { workspaceStoreEvents } from '../events';
import { WorkspaceStore } from '../workspace.store';

const options: OrganizationJoinOptionsOutput = {
  '@id': '/options',
  '@type': 'JoinOptions',
  emailProofRequired: true,
  invitations: [],
  organizations: [],
  requests: [],
};

describe('WorkspaceStore', () => {
  let store: WorkspaceStore;
  const access = {
    options: vi.fn(),
    join: vi.fn(),
    acceptInvitation: vi.fn(),
    request: vi.fn(),
    cancel: vi.fn(),
  };
  const email = { start: vi.fn(), confirm: vi.fn() };
  const onboarding = { start: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    access.options.mockReturnValue(of(options));
    TestBed.configureTestingModule({
      providers: [
        WorkspaceStore,
        { provide: OrganizationAccessService, useValue: access },
        { provide: EmailOwnershipService, useValue: email },
        { provide: OnboardingService, useValue: onboarding },
      ],
    });
    store = TestBed.inject(WorkspaceStore);
  });
  it('does not start creation or send a code when choices load', () => {
    store.load();
    expect(store.options()).toEqual(options);
    expect(email.start).not.toHaveBeenCalled();
    expect(onboarding.start).not.toHaveBeenCalled();
  });
  it('keeps a failed query distinct from an empty successful result', () => {
    access.options.mockReturnValue(throwError(() => new Error('Offline')));
    store.load();
    expect(store.optionsCallState().status).toBe('error');
    expect(store.options()).toBeNull();
    access.options.mockReturnValue(of({ ...options, emailProofRequired: false }));
    store.load();
    expect(store.optionsCallState().status).toBe('success');
    expect(store.options()?.organizations).toEqual([]);
  });
  it('prevents duplicate and competing admission commands while one is pending', () => {
    const response = new Subject<OrganizationAdmissionOutput>();
    access.join.mockReturnValue(response);
    store.admit({ id: 'organization-1', invitation: false });
    store.admit({ id: 'organization-2', invitation: false });
    store.request('organization-3');
    store.create();
    expect(access.join).toHaveBeenCalledExactlyOnceWith('organization-1');
    expect(access.request).not.toHaveBeenCalled();
    expect(onboarding.start).not.toHaveBeenCalled();
    expect(store.busy()).toBe(true);
    response.next({ '@id': '/admission', '@type': 'Admission', organizationId: 'organization-1' });
    response.complete();
    expect(store.busy()).toBe(false);
    expect(store.admissionCallState().data?.organizationId).toBe('organization-1');
  });
  it('accepts the selected invitation explicitly and does not auto-join', () => {
    access.acceptInvitation.mockReturnValue(of({ organizationId: 'org' }));
    store.admit({ id: 'invitation', invitation: true });
    expect(access.acceptInvitation).toHaveBeenCalledExactlyOnceWith('invitation');
    expect(access.join).not.toHaveBeenCalled();
  });
  it('uses the active challenge once and refreshes eligibility after proof', () => {
    store.confirmProof('123456');
    expect(email.confirm).not.toHaveBeenCalled();
    email.start.mockReturnValue(of({ challengeToken: 'page-only', canResendIn: 60 }));
    email.confirm.mockReturnValue(of({ verified: true }));
    store.startProof();
    store.confirmProof('123456');
    expect(email.confirm).toHaveBeenCalledExactlyOnceWith('page-only', '123456');
    expect(store.challengeCallState().data).toBeNull();
    expect(access.options).toHaveBeenCalledOnce();
    store.confirmProof('123456');
    expect(email.confirm).toHaveBeenCalledOnce();
  });
  it('starts creation only through an explicit creation intent', () => {
    onboarding.start.mockReturnValue(of({ state: 'in_progress' }));
    store.create();
    expect(onboarding.start).toHaveBeenCalledExactlyOnceWith({ reset: false, intent: 'create' });
    expect(store.createCallState().status).toBe('success');
  });
  it('refreshes request status after a successful cancellation', () => {
    access.cancel.mockReturnValue(of({ id: 'request', status: 'cancelled' }));
    store.cancel('request');
    expect(access.cancel).toHaveBeenCalledExactlyOnceWith('request');
    expect(store.cancelCallState().status).toBe('success');
    expect(access.options).toHaveBeenCalledOnce();
  });
  it('clears obsolete errors and proof announcements when the next command begins', () => {
    onboarding.start.mockReturnValue(throwError(() => new Error('creation failed')));
    store.create();
    expect(store.actionError()).not.toBeNull();
    email.start.mockReturnValue(of({ challengeToken: 'code', canResendIn: 60 }));
    email.confirm.mockReturnValue(of({ verified: true }));
    store.startProof();
    store.confirmProof('123456');
    expect(store.confirmCallState().status).toBe('success');
    access.request.mockReturnValue(of({ id: 'request', status: 'pending' }));
    store.request('organization');
    expect(store.actionError()).toBeNull();
    expect(store.confirmCallState().status).toBe('idle');
    expect(store.requestCallState().status).toBe('success');
    access.cancel.mockReturnValue(of({ id: 'request', status: 'cancelled' }));
    store.cancel('request');
    expect(store.requestCallState().status).toBe('idle');
    expect(store.cancelCallState().status).toBe('success');
  });
  it('publishes one result per command without replaying it on a discovery refresh', () => {
    const succeeded = vi.fn();
    const joined = vi.fn();
    const events = TestBed.inject(Events);
    const successSubscription = events
      .on(workspaceStoreEvents.commandSucceeded)
      .subscribe(succeeded);
    const membershipSubscription = events.on(organizationMembershipEvents.joined).subscribe(joined);
    onboarding.start.mockReturnValue(of({ state: 'in_progress' }));
    access.acceptInvitation.mockReturnValue(of({ organizationId: 'joined-org' }));
    access.request.mockReturnValue(of({ id: 'request', status: 'pending' }));
    access.cancel.mockReturnValue(of({ id: 'request', status: 'cancelled' }));
    email.start.mockReturnValue(of({ challengeToken: 'proof', canResendIn: 60 }));
    email.confirm.mockReturnValue(of({ verified: true }));
    store.create();
    store.admit({ id: 'invitation', invitation: true });
    store.request('organization');
    store.cancel('request');
    store.startProof();
    store.confirmProof('123456');
    expect(succeeded).toHaveBeenCalledTimes(6);
    expect(joined).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ payload: { organizationId: 'joined-org' } }),
    );
    store.load();
    expect(succeeded).toHaveBeenCalledTimes(6);
    expect(joined).toHaveBeenCalledTimes(1);
    successSubscription.unsubscribe();
    membershipSubscription.unsubscribe();
  });
  it('emits one failure feedback for every failed command while retaining retry state', () => {
    const failed = vi.fn();
    const subscription = TestBed.inject(Events)
      .on(workspaceStoreEvents.commandFailed)
      .subscribe(failed);
    const failure = throwError(() => new Error('Offline'));
    access.options.mockReturnValue(failure);
    store.load();
    expect(failed).not.toHaveBeenCalled();
    onboarding.start.mockReturnValue(failure);
    access.join.mockReturnValue(failure);
    access.request.mockReturnValue(failure);
    access.cancel.mockReturnValue(failure);
    email.start.mockReturnValue(failure);
    email.confirm.mockReturnValue(failure);
    store.create();
    store.admit({ id: 'organization', invitation: false });
    store.request('organization');
    store.cancel('request');
    store.startProof();
    expect(failed).toHaveBeenCalledTimes(5);
    email.start.mockReturnValue(of({ challengeToken: 'proof', canResendIn: 60 }));
    store.startProof();
    store.confirmProof('123456');
    expect(failed).toHaveBeenCalledTimes(6);
    expect(store.confirmCallState().status).toBe('error');
    expect(store.challengeCallState().data?.challengeToken).toBe('proof');
    subscription.unsubscribe();
  });
});
