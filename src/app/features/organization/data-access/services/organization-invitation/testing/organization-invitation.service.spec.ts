import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import type { ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  AcceptOrganizationInvitationInput,
  InviteOrganizationMemberInput,
  OrganizationInvitationOutput,
  OrganizationMemberOutput,
} from '@features/organization/models';
import { OrganizationInvitationService } from '../organization-invitation.service';

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
    isActive: true,
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
});
