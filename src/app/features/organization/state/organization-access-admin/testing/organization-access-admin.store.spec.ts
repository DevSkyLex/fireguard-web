import { TestBed } from '@angular/core/testing';
import { Dispatcher } from '@ngrx/signals/events';
import { of, Subject, throwError } from 'rxjs';
import { OrganizationAccessService } from '@features/organization/data-access';
import type {
  OrganizationAccessPolicyOutput,
  OrganizationDomainOutput,
  OrganizationJoinRequestOutput,
  OrganizationJoinRequestCollectionOutput,
} from '@features/organization/models';
import {
  OrganizationAccessAdminStore,
  type OrganizationAccessAdminStoreType,
} from '../organization-access-admin.store';

const DOMAIN: OrganizationDomainOutput = {
  '@id': '/domains/d1',
  '@type': 'OrganizationDomain',
  id: 'd1',
  domain: 'company.test',
  status: 'pending',
  dnsName: '_fireguard.company.test',
  dnsValue: 'challenge',
};
const POLICY: OrganizationAccessPolicyOutput = {
  '@id': '/access-policy',
  '@type': 'OrganizationAccessPolicy',
  mode: 'invitation_only',
  domains: [DOMAIN],
  eligibleRoles: [{ id: 'member', label: 'Member' }],
};
const REQUEST: OrganizationJoinRequestOutput = {
  '@id': '/requests/r1',
  '@type': 'OrganizationJoinRequest',
  id: 'r1',
  organizationId: 'org',
  organizationName: 'Company',
  status: 'pending',
  applicantEmail: 'person@company.test',
  createdAt: '2026-09-01',
  expiresAt: '2026-10-01',
  actions: ['approve', 'reject'],
};
const COLLECTION: OrganizationJoinRequestCollectionOutput = {
  '@id': '/requests',
  '@type': 'Collection',
  member: [REQUEST],
  totalItems: 1,
  assignableRoles: [{ id: 'member', label: 'Member' }],
};

describe('OrganizationAccessAdminStore', () => {
  let store: OrganizationAccessAdminStoreType;
  let service: {
    policy: ReturnType<typeof vi.fn>;
    updatePolicy: ReturnType<typeof vi.fn>;
    addDomain: ReturnType<typeof vi.fn>;
    verifyDomain: ReturnType<typeof vi.fn>;
    removeDomain: ReturnType<typeof vi.fn>;
    requests: ReturnType<typeof vi.fn>;
    approve: ReturnType<typeof vi.fn>;
    reject: ReturnType<typeof vi.fn>;
  };
  let dispatch: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    service = {
      policy: vi.fn(() => of(POLICY)),
      updatePolicy: vi.fn(() => of(POLICY)),
      addDomain: vi.fn(() => of(DOMAIN)),
      verifyDomain: vi.fn(() => of({ ...DOMAIN, status: 'verified' })),
      removeDomain: vi.fn(() => of(undefined)),
      requests: vi.fn(() => of(COLLECTION)),
      approve: vi.fn(() => of({ ...REQUEST, status: 'approved', actions: [] })),
      reject: vi.fn(() => of({ ...REQUEST, status: 'rejected', actions: [] })),
    };
    dispatch = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        OrganizationAccessAdminStore,
        { provide: OrganizationAccessService, useValue: service },
        { provide: Dispatcher, useValue: { dispatch } },
      ],
    });
    store = TestBed.inject(OrganizationAccessAdminStore);
  });
  it('retains the loaded policy and domain entities after refresh failure', () => {
    store.loadPolicy('org');
    service.policy.mockReturnValue(throwError(() => new Error('Offline')));
    store.loadPolicy('org');
    expect(store.policyCallState().status).toBe('error');
    expect(store.policy()?.domains).toEqual([DOMAIN]);
  });
  it('keeps a saved policy when its first policy read responds afterward', () => {
    const firstRead = new Subject<OrganizationAccessPolicyOutput>();
    service.policy.mockReturnValueOnce(firstRead);
    service.updatePolicy.mockReturnValueOnce(
      of({ ...POLICY, mode: 'approval_required', domains: [] }),
    );

    store.loadPolicy('org');
    expect(store.policyCallState().status).toBe('pending');
    store.savePolicy({ organizationId: 'org', input: { mode: 'approval_required' } });
    firstRead.next(POLICY);
    firstRead.complete();

    expect(store.policy()?.mode).toBe('approval_required');
    expect(store.domainEntities()).toEqual([]);
    expect(store.policyCallState().status).toBe('success');
  });
  it('adds a domain without discarding the policy draft revision', () => {
    store.loadPolicy('org');
    const formRevision = store.policyFormRevision();
    const added = { ...DOMAIN, id: 'd2', domain: 'branch.company.test' };
    service.addDomain.mockReturnValueOnce(of(added));

    store.addDomain({ organizationId: 'org', domain: added.domain });

    expect(service.addDomain).toHaveBeenCalledWith('org', added.domain);
    expect(store.domainEntities()).toEqual([DOMAIN, added]);
    expect(store.addCallState().status).toBe('success');
    expect(store.policyFormRevision()).toBe(formRevision);
  });
  it('keeps the domain when DNS verification fails and reports the error', () => {
    store.loadPolicy('org');
    service.verifyDomain.mockReturnValueOnce(throwError(() => new Error('DNS unavailable')));

    store.verifyDomain({ organizationId: 'org', domainId: DOMAIN.id });

    expect(store.domainEntities()).toEqual([DOMAIN]);
    expect(store.verifyCallState().status).toBe('error');
    expect(store.error()).toBe('Could not complete this request. Try again.');
  });
  it('clears a settled domain error when the policy is refreshed', () => {
    store.loadPolicy('org');
    service.verifyDomain.mockReturnValueOnce(throwError(() => new Error('DNS unavailable')));
    store.verifyDomain({ organizationId: 'org', domainId: DOMAIN.id });
    expect(store.verifyCallState().status).toBe('error');

    store.loadPolicy('org');

    expect(store.verifyCallState().status).toBe('idle');
    expect(store.error()).toBeNull();
    expect(store.domainEntities()).toEqual([DOMAIN]);
  });
  it('keeps the domain when removal fails and allows a retry', () => {
    store.loadPolicy('org');
    service.removeDomain.mockReturnValueOnce(throwError(() => new Error('Removal denied')));

    store.removeDomain({ organizationId: 'org', domainId: DOMAIN.id });

    expect(store.domainEntities()).toEqual([DOMAIN]);
    expect(store.removeCallState().status).toBe('error');
    store.removeDomain({ organizationId: 'org', domainId: DOMAIN.id });
    expect(store.domainEntities()).toEqual([]);
    expect(store.removeCallState().status).toBe('success');
  });
  it('resets the form revision only after saving policy or switching organizations', () => {
    store.loadPolicy('org');
    const revision = store.policyFormRevision();
    store.addDomain({ organizationId: 'org', domain: 'company.test' });
    store.verifyDomain({ organizationId: 'org', domainId: 'd1' });
    store.removeDomain({ organizationId: 'org', domainId: 'd1' });
    store.loadPolicy('org');
    expect(store.policyFormRevision()).toBe(revision);
    service.updatePolicy.mockReturnValueOnce(throwError(() => new Error('Save failed')));
    store.savePolicy({ organizationId: 'org', input: { mode: 'approval_required' } });
    expect(store.policyFormRevision()).toBe(revision);
    store.savePolicy({ organizationId: 'org', input: { mode: 'invitation_only' } });
    expect(store.policyFormRevision()).toBe(revision + 1);
    store.loadPolicy('other-org');
    expect(store.policyFormRevision()).toBe(revision + 2);
  });
  it('exhausts duplicate verification and prevents concurrent removal', () => {
    const check = new Subject<OrganizationDomainOutput>();
    service.verifyDomain.mockReturnValue(check);
    store.loadPolicy('org');
    store.verifyDomain({ organizationId: 'org', domainId: 'd1' });
    store.verifyDomain({ organizationId: 'org', domainId: 'd1' });
    store.removeDomain({ organizationId: 'org', domainId: 'd1' });
    expect(service.verifyDomain).toHaveBeenCalledTimes(1);
    expect(service.removeDomain).not.toHaveBeenCalled();
    expect(store.pending()).toBe(true);
    check.next({ ...DOMAIN, status: 'verified' });
    check.complete();
    expect(store.domainEntities()[0]?.status).toBe('verified');
    expect(store.pending()).toBe(false);
  });
  it('removes only the confirmed domain on success', () => {
    store.loadPolicy('org');
    store.removeDomain({ organizationId: 'org', domainId: 'd1' });
    expect(store.domainEntities()).toEqual([]);
    expect(store.policy()?.domains).toEqual([]);
    expect(store.removeCallState().status).toBe('success');
  });
  it('loads reviewer roles without the unrelated role catalogue', () => {
    store.loadRequests('org');
    expect(store.assignableRoles()).toEqual(COLLECTION.assignableRoles);
    expect(store.requestEntities()).toEqual([REQUEST]);
  });
  it('keeps pending requests and reviewer roles after a refresh failure', () => {
    store.loadRequests('org');
    service.requests.mockReturnValueOnce(throwError(() => new Error('Offline')));

    store.loadRequests('org');

    expect(store.requestsCallState().status).toBe('error');
    expect(store.requestEntities()).toEqual([REQUEST]);
    expect(store.assignableRoles()).toEqual(COLLECTION.assignableRoles);
  });
  it('does not send admission commands for a different organization', () => {
    store.loadPolicy('org');
    store.loadRequests('org');

    store.savePolicy({ organizationId: 'other', input: { mode: 'approval_required' } });
    store.addDomain({ organizationId: 'other', domain: 'other.test' });
    store.verifyDomain({ organizationId: 'other', domainId: DOMAIN.id });
    store.removeDomain({ organizationId: 'other', domainId: DOMAIN.id });
    store.approve({ organizationId: 'other', requestId: REQUEST.id, roleIds: ['member'] });
    store.reject({ organizationId: 'other', requestId: REQUEST.id });

    expect(service.updatePolicy).not.toHaveBeenCalled();
    expect(service.addDomain).not.toHaveBeenCalled();
    expect(service.verifyDomain).not.toHaveBeenCalled();
    expect(service.removeDomain).not.toHaveBeenCalled();
    expect(service.approve).not.toHaveBeenCalled();
    expect(service.reject).not.toHaveBeenCalled();
    expect(store.domainEntities()).toEqual([DOMAIN]);
    expect(store.requestEntities()).toEqual([REQUEST]);
  });
  it('emits membership invalidation after successful approval', () => {
    store.loadRequests('org');
    store.approve({ organizationId: 'org', requestId: 'r1', roleIds: ['member'] });
    expect(service.approve).toHaveBeenCalledWith('org', 'r1', ['member']);
    expect(store.requestEntities()[0]?.status).toBe('approved');
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { organizationId: 'org' } }),
    );
  });
  it('retains a pending request when approval fails and permits retry', () => {
    store.loadRequests('org');
    service.approve.mockReturnValueOnce(throwError(() => new Error('Quota reached')));
    store.approve({ organizationId: 'org', requestId: 'r1', roleIds: ['member'] });
    expect(store.approveCallState().status).toBe('error');
    expect(store.requestEntities()[0]?.status).toBe('pending');
    store.approve({ organizationId: 'org', requestId: 'r1', roleIds: ['member'] });
    expect(store.approveCallState().status).toBe('success');
  });
  it('does not accept a competing rejection while approval is in progress', () => {
    const command = new Subject<OrganizationJoinRequestOutput>();
    service.approve.mockReturnValue(command);
    store.loadRequests('org');
    store.approve({ organizationId: 'org', requestId: 'r1', roleIds: ['member'] });
    store.reject({ organizationId: 'org', requestId: 'r1' });
    expect(service.reject).not.toHaveBeenCalled();
    command.complete();
  });
  it('keeps a request pending after rejection fails and permits a retry', () => {
    store.loadRequests('org');
    service.reject.mockReturnValueOnce(throwError(() => new Error('Decision failed')));

    store.reject({ organizationId: 'org', requestId: REQUEST.id });
    expect(store.rejectCallState().status).toBe('error');
    expect(store.requestEntities()).toEqual([REQUEST]);
    expect(dispatch).not.toHaveBeenCalled();

    store.reject({ organizationId: 'org', requestId: REQUEST.id });
    expect(store.rejectCallState().status).toBe('success');
    expect(store.requestEntities()[0]?.status).toBe('rejected');
  });
  it('blocks a competing approval while rejection is in progress', () => {
    const command = new Subject<OrganizationJoinRequestOutput>();
    service.reject.mockReturnValueOnce(command);
    store.loadRequests('org');

    store.reject({ organizationId: 'org', requestId: REQUEST.id });
    store.approve({ organizationId: 'org', requestId: REQUEST.id, roleIds: ['member'] });

    expect(store.reviewing()).toBe(true);
    expect(service.approve).not.toHaveBeenCalled();
    command.next({ ...REQUEST, status: 'rejected', actions: [] });
    command.complete();
    expect(store.reviewing()).toBe(false);
    expect(store.requestEntities()[0]?.status).toBe('rejected');
  });
  it('keeps a rejection made during the first request read when that read finishes later', () => {
    const firstRead = new Subject<OrganizationJoinRequestCollectionOutput>();
    service.requests.mockReturnValueOnce(firstRead);

    store.loadRequests('org');
    expect(store.requestsCallState().status).toBe('pending');
    store.reject({ organizationId: 'org', requestId: REQUEST.id });
    firstRead.next(COLLECTION);
    firstRead.complete();

    expect(store.requestEntities()[0]?.status).toBe('rejected');
    expect(store.requestsCallState().status).not.toBe('pending');
  });
  it('ignores an old domain write after switching organizations', () => {
    const command = new Subject<OrganizationDomainOutput>();
    service.addDomain.mockReturnValue(command);
    store.loadPolicy('org');
    store.addDomain({ organizationId: 'org', domain: 'other.test' });
    service.policy.mockReturnValue(of({ ...POLICY, domains: [] }));
    store.loadPolicy('another');
    command.next({ ...DOMAIN, id: 'old' });
    command.complete();
    expect(store.organizationId()).toBe('another');
    expect(store.domainEntities()).toEqual([]);
  });
  it('prevents a competing domain mutation and ignores a policy save from a former organization', () => {
    const save = new Subject<OrganizationAccessPolicyOutput>();
    service.updatePolicy.mockReturnValueOnce(save);
    store.loadPolicy('org');
    store.savePolicy({ organizationId: 'org', input: { mode: 'approval_required' } });

    expect(store.pending()).toBe(true);
    store.addDomain({ organizationId: 'org', domain: 'late.test' });
    expect(service.addDomain).not.toHaveBeenCalled();

    service.policy.mockReturnValueOnce(of({ ...POLICY, mode: 'invitation_only', domains: [] }));
    store.loadPolicy('other');
    save.next({ ...POLICY, mode: 'approval_required' });
    save.complete();

    expect(store.organizationId()).toBe('other');
    expect(store.policy()?.mode).toBe('invitation_only');
    expect(store.domainEntities()).toEqual([]);
    expect(store.saveCallState().status).toBe('idle');
    expect(store.pending()).toBe(false);
  });
  it('does not verify a domain in a new organization with a late result from the previous one', () => {
    const verification = new Subject<OrganizationDomainOutput>();
    service.verifyDomain.mockReturnValueOnce(verification);
    store.loadPolicy('org');
    store.verifyDomain({ organizationId: 'org', domainId: DOMAIN.id });

    const newDomain = { ...DOMAIN, status: 'pending' as const, domain: 'other.test' };
    service.policy.mockReturnValueOnce(of({ ...POLICY, domains: [newDomain] }));
    store.loadPolicy('other');
    verification.next({ ...DOMAIN, status: 'verified' });
    verification.complete();

    expect(store.organizationId()).toBe('other');
    expect(store.domainEntities()).toEqual([newDomain]);
    expect(store.verifyCallState().status).toBe('idle');
  });
  it('does not remove a matching domain in a new organization with a late old deletion', () => {
    const deletion = new Subject<void>();
    service.removeDomain.mockReturnValueOnce(deletion);
    store.loadPolicy('org');
    store.removeDomain({ organizationId: 'org', domainId: DOMAIN.id });

    const newDomain = { ...DOMAIN, domain: 'other.test' };
    service.policy.mockReturnValueOnce(of({ ...POLICY, domains: [newDomain] }));
    store.loadPolicy('other');
    deletion.next(undefined);
    deletion.complete();

    expect(store.organizationId()).toBe('other');
    expect(store.domainEntities()).toEqual([newDomain]);
    expect(store.removeCallState().status).toBe('idle');
  });
  it('clears a previous domain command error before a different command succeeds', () => {
    store.loadPolicy('org');
    service.addDomain.mockReturnValueOnce(throwError(() => new Error('Invalid domain')));
    store.addDomain({ organizationId: 'org', domain: 'invalid.test' });
    expect(store.error()).not.toBeNull();
    store.verifyDomain({ organizationId: 'org', domainId: 'd1' });
    expect(store.verifyCallState().status).toBe('success');
    expect(store.error()).toBeNull();
  });
  it('clears an approval error when the reviewer rejects the request instead', () => {
    store.loadRequests('org');
    service.approve.mockReturnValueOnce(throwError(() => new Error('Quota reached')));
    store.approve({ organizationId: 'org', requestId: 'r1', roleIds: ['member'] });
    expect(store.requestError()).not.toBeNull();
    store.reject({ organizationId: 'org', requestId: 'r1' });
    expect(store.requestEntities()[0]?.status).toBe('rejected');
    expect(store.requestError()).toBeNull();
  });
  it('does not restore a removed domain from an older policy refresh', () => {
    store.loadPolicy('org');
    const refresh = new Subject<OrganizationAccessPolicyOutput>();
    service.policy.mockReturnValue(refresh);
    store.loadPolicy('org');
    store.removeDomain({ organizationId: 'org', domainId: 'd1' });
    refresh.next(POLICY);
    refresh.complete();
    expect(store.domainEntities()).toEqual([]);
    expect(store.policyCallState().status).not.toBe('pending');
  });
  it('does not restore a pending request from a refresh started before approval', () => {
    store.loadRequests('org');
    const refresh = new Subject<OrganizationJoinRequestCollectionOutput>();
    service.requests.mockReturnValue(refresh);
    store.loadRequests('org');
    store.approve({ organizationId: 'org', requestId: 'r1', roleIds: ['member'] });
    refresh.next(COLLECTION);
    refresh.complete();
    expect(store.requestEntities()[0]?.status).toBe('approved');
    expect(store.requestsCallState().status).not.toBe('pending');
  });
  it('ignores a policy response after requests switch to another organization', () => {
    const query = new Subject<OrganizationAccessPolicyOutput>();
    service.policy.mockReturnValue(query);
    store.loadPolicy('org');
    store.loadRequests('another');
    query.next(POLICY);
    query.complete();
    expect(store.organizationId()).toBe('another');
    expect(store.policy()).toBeNull();
    expect(store.domainEntities()).toEqual([]);
  });
  it('ignores a request error after policy switches to another organization', () => {
    const query = new Subject<OrganizationJoinRequestCollectionOutput>();
    service.requests.mockReturnValue(query);
    store.loadRequests('org');
    store.loadPolicy('another');
    query.error(new Error('Stale request error'));
    expect(store.organizationId()).toBe('another');
    expect(store.requestError()).toBeNull();
    expect(store.requestsCallState().status).toBe('idle');
  });
  it('ignores a late rejection failure after switching organizations', () => {
    const decision = new Subject<OrganizationJoinRequestOutput>();
    service.reject.mockReturnValueOnce(decision);
    store.loadRequests('org');
    store.reject({ organizationId: 'org', requestId: REQUEST.id });

    service.requests.mockReturnValueOnce(
      of({ ...COLLECTION, member: [], totalItems: 0, assignableRoles: [] }),
    );
    store.loadRequests('other');
    decision.error(new Error('Stale rejection failure'));

    expect(store.organizationId()).toBe('other');
    expect(store.requestEntities()).toEqual([]);
    expect(store.rejectCallState().status).toBe('idle');
    expect(store.requestError()).toBeNull();
  });
  it('ignores a late approval failure after switching organizations', () => {
    const decision = new Subject<OrganizationJoinRequestOutput>();
    service.approve.mockReturnValueOnce(decision);
    store.loadRequests('org');
    store.approve({ organizationId: 'org', requestId: REQUEST.id, roleIds: ['member'] });

    service.requests.mockReturnValueOnce(
      of({ ...COLLECTION, member: [], totalItems: 0, assignableRoles: [] }),
    );
    store.loadRequests('other');
    decision.error(new Error('Stale approval failure'));

    expect(store.organizationId()).toBe('other');
    expect(store.requestEntities()).toEqual([]);
    expect(store.approveCallState().status).toBe('idle');
    expect(store.requestError()).toBeNull();
    expect(dispatch).not.toHaveBeenCalled();
  });
  it('ignores a write from a previous visit when returning to the same organization', () => {
    const command = new Subject<OrganizationDomainOutput>();
    service.addDomain.mockReturnValue(command);
    store.loadPolicy('org');
    store.addDomain({ organizationId: 'org', domain: 'old.test' });
    store.loadPolicy('another');
    store.loadPolicy('org');
    command.next({ ...DOMAIN, id: 'old' });
    command.complete();
    expect(store.domainEntities()).toEqual([DOMAIN]);
    expect(store.pending()).toBe(false);
  });
  it('keeps a verified domain when a refresh started during verification returns later', () => {
    store.loadPolicy('org');
    const command = new Subject<OrganizationDomainOutput>();
    const refresh = new Subject<OrganizationAccessPolicyOutput>();
    service.verifyDomain.mockReturnValue(command);
    service.policy.mockReturnValue(refresh);
    store.verifyDomain({ organizationId: 'org', domainId: 'd1' });
    store.loadPolicy('org');
    command.next({ ...DOMAIN, status: 'verified' });
    command.complete();
    refresh.next(POLICY);
    refresh.complete();
    expect(store.domainEntities()[0]?.status).toBe('verified');
    expect(store.policyCallState().status).toBe('success');
  });
  it('keeps a rejected request when a refresh started during the decision fails later', () => {
    store.loadRequests('org');
    const command = new Subject<OrganizationJoinRequestOutput>();
    const refresh = new Subject<OrganizationJoinRequestCollectionOutput>();
    service.reject.mockReturnValue(command);
    service.requests.mockReturnValue(refresh);
    store.reject({ organizationId: 'org', requestId: 'r1' });
    store.loadRequests('org');
    command.next({ ...REQUEST, status: 'rejected', actions: [] });
    command.complete();
    refresh.error(new Error('Obsolete refresh'));
    expect(store.requestEntities()[0]?.status).toBe('rejected');
    expect(store.requestsCallState().status).toBe('success');
    expect(store.requestError()).toBeNull();
  });
  it('invalidates the approved organization even when the reviewer has switched organizations', () => {
    const command = new Subject<OrganizationJoinRequestOutput>();
    service.approve.mockReturnValue(command);
    store.loadRequests('org');
    store.approve({ organizationId: 'org', requestId: 'r1', roleIds: ['member'] });
    service.requests.mockReturnValue(of({ ...COLLECTION, member: [], totalItems: 0 }));
    store.loadRequests('another');
    command.next({ ...REQUEST, status: 'approved', actions: [] });
    command.complete();
    expect(store.requestEntities()).toEqual([]);
    expect(store.reviewing()).toBe(false);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { organizationId: 'org' } }),
    );
  });
});
