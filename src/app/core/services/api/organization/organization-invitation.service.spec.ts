import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { OrganizationInvitationService } from './organization-invitation.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { OrganizationInvitationOutput, InviteOrganizationMemberInput } from '@core/models/organization';
import type { ApiError } from '@core/models/api';

describe('OrganizationInvitationService', () => {
  let service: OrganizationInvitationService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const orgId = 'org-uuid-1';
  const invitationsUrl = `${mockEnv.apiUrl}/api/organizations/${orgId}/invitations`;

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
      req.flush({ status: 422, title: 'Unprocessable Entity' }, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });
});
