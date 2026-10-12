import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { retry } from 'rxjs';

import type { ApiError, HydraCollection, HydraItem } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  AcceptOrganizationInvitationInput,
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';
import { OrganizationInvitationService } from '../organization-invitation.service';

const mockCollection = <T extends HydraItem>(items: T[]): HydraCollection<T> => ({
  '@context': '/api/contexts/Collection',
  '@id': '/api/organizations/org-uuid-1/invitations',
  '@type': 'Collection',
  member: items,
  totalItems: items.length,
  view: {
    '@id': '/api/organizations/org-uuid-1/invitations?page=1',
    '@type': 'hydra:PartialCollectionView',
  },
});

describe('OrganizationInvitationService', () => {
  let service: OrganizationInvitationService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const invitationsUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/invitations`;
  const acceptInvitationUrl = `${mockEnv.apiUrl}/api/organizations/invitations/accept`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OrganizationInvitationService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(OrganizationInvitationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockInvitation: OrganizationInvitationOutput = {
    '@id': `/api/organizations/${orgId}/invitations/inv-uuid-1`,
    '@type': 'Invitation',
    id: 'inv-uuid-1',
    organizationId: orgId,
    email: 'newmember@example.com',
    status: 'pending',
    invitedByUserId: 'user-uuid-1',
    acceptedByUserId: null,
    revokedByUserId: null,
    expiresAt: '2026-04-01T00:00:00+00:00',
    createdAt: '2026-03-01T00:00:00+00:00',
    updatedAt: '2026-03-01T00:00:00+00:00',
    roleIds: [],
  };

  const mockAcceptedMember: OrganizationMemberOutput = {
    '@id': `/api/organizations/${orgId}/members/member-uuid-1`,
    '@type': 'OrganizationMember',
    id: 'member-uuid-1',
    organizationId: orgId,
    userId: 'user-uuid-2',
    displayName: 'Alex Martin',
    isActive: true,
    isOwner: false,
    joinedAt: '2026-03-15T00:00:00+00:00',
    roleIds: ['role-uuid-1'],
  };

  // ── accept ─────────────────────────────────────────────────────────────────

  describe('accept', () => {
    const input: AcceptOrganizationInvitationInput = {
      token: 'a4d8e8f04d3a2a59f5d8f29f6f4f25bc25d5ef8c9fef2a79328fa93ce31d5d88',
    };

    it('should send POST request and return the accepted member', () => {
      service.accept(input).subscribe((member) => {
        expect(member.id).toBe('member-uuid-1');
        expect(member.organizationId).toBe(orgId);
      });

      const req = httpMock.expectOne(acceptInvitationUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockAcceptedMember);
    });

    it('should handle validation errors for an invalid token', () => {
      service.accept({ token: 'invalid' }).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(422);
        },
      });

      const req = httpMock.expectOne(acceptInvitationUrl);
      req.flush(
        { status: 422, title: 'Unprocessable Entity' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    });
  });

  // ── invite ─────────────────────────────────────────────────────────────────

  describe('invite', () => {
    const input: InviteOrganizationMemberInput = {
      email: 'newmember@example.com',
      roleIds: [],
    };

    it('should send POST request and return created invitation', () => {
      service.invite(orgId, input).subscribe((invitation) => {
        expect(invitation.email).toBe('newmember@example.com');
        expect(invitation.status).toBe('pending');
      });

      const req = httpMock.expectOne(invitationsUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(input);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
      req.flush(mockInvitation);
    });

    it('should handle conflict when user is already a member', () => {
      service.invite(orgId, input).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(409);
        },
      });

      const req = httpMock.expectOne(invitationsUrl);
      req.flush({ status: 409, title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });

    it('should handle validation error for invalid email', () => {
      service.invite(orgId, { ...input, email: 'not-an-email' }).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(422);
        },
      });

      const req = httpMock.expectOne(invitationsUrl);
      req.flush(
        { status: 422, title: 'Unprocessable Entity' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    });
  });

  // ── list ─────────────────────────────────────────────────────────────────────

  describe('list', () => {
    it('should send GET request and return invitations collection', () => {
      service.list(orgId).subscribe((response) => {
        expect(response.member).toHaveLength(1);
        expect(response.member[0].email).toBe('newmember@example.com');
      });

      const req = httpMock.expectOne(invitationsUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      req.flush(mockCollection([mockInvitation]));
    });
  });

  // ── revoke ───────────────────────────────────────────────────────────────────

  describe('revoke', () => {
    it('should send POST action request and return the revoked invitation', () => {
      service.revoke(orgId, 'inv-uuid-1').subscribe((invitation) => {
        expect(invitation.status).toBe('revoked');
      });

      const req = httpMock.expectOne(`${invitationsUrl}/inv-uuid-1/revoke`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);
      req.flush({ ...mockInvitation, status: 'revoked' });
    });
  });
  it('captures one invitation reconciliation identity before retry or cold resubscription', () => {
    const intent = service.list(
      orgId,
      { page: 2, itemsPerPage: 25, params: { status: 'pending' } },
      { status: 'expired' },
    );
    const received = vi.fn();
    httpMock.expectNone((request) => request.url === invitationsUrl);
    intent.pipe(retry(1)).subscribe(received);
    const initial = httpMock.expectOne((request) => request.url === invitationsUrl);
    const key = initial.request.headers.get('Idempotency-Key');
    expect(key).toMatch(/^[0-9a-f-]{36}$/i);
    expect(initial.request.method).toBe('GET');
    expect(initial.request.params.get('page')).toBe('2');
    expect(initial.request.params.get('itemsPerPage')).toBe('25');
    expect(initial.request.params.get('status')).toBe('expired');
    const query = initial.request.params.toString();
    initial.error(new ProgressEvent('error'));

    const retried = httpMock.expectOne((request) => request.url === invitationsUrl);
    expect(retried.request.headers.get('Idempotency-Key')).toBe(key);
    expect(retried.request.params.toString()).toBe(query);
    const collection = mockCollection([mockInvitation]);
    retried.flush(collection);
    expect(received).toHaveBeenLastCalledWith(collection);

    intent.subscribe(received);
    const resubscribed = httpMock.expectOne((request) => request.url === invitationsUrl);
    expect(resubscribed.request.headers.get('Idempotency-Key')).toBe(key);
    resubscribed.flush(collection);

    service.list(orgId).subscribe();
    const nextIntent = httpMock.expectOne(invitationsUrl);
    expect(nextIntent.request.headers.get('Idempotency-Key')).toMatch(/^[0-9a-f-]{36}$/i);
    expect(nextIntent.request.headers.get('Idempotency-Key')).not.toBe(key);
    nextIntent.flush(collection);
    expect(received).toHaveBeenCalledTimes(2);
  });

  it('accepts a retained invitation reconciliation key without leaking transport options into the query', () => {
    const key = '2b7e3c3b-86fb-4165-aa64-2528d40589ea';
    for (let attempt = 0; attempt < 2; attempt++) {
      service
        .list(orgId, { idempotencyKey: key, headers: { 'X-Trace': 'retained' }, page: 1 })
        .subscribe();
      const request = httpMock.expectOne((candidate) => candidate.url === invitationsUrl);
      expect(request.request.headers.get('Idempotency-Key')).toBe(key);
      expect(request.request.headers.get('X-Trace')).toBe('retained');
      expect(request.request.params.keys()).toEqual(['page']);
      request.flush(mockCollection([]));
    }
  });

  it('keeps the public invitation preview as an ordinary read', () => {
    service.preview('preview-token').subscribe();
    const request = httpMock.expectOne(
      `${mockEnv.apiUrl}/api/organizations/invitations/preview-token/preview`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Idempotency-Key')).toBe(false);
    request.flush({});
  });
});
