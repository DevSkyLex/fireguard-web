import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { ACCOUNT_PERMISSION } from '@features/account/models';
import type {
  RequestEmailChangeOutput,
  UserOutput,
  UserProfileOutput,
} from '@features/account/models';
import { UserProfileService } from '../user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        UserProfileService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(UserProfileService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getCurrentProfile', () => {
    it('should send GET request and return current user profile', () => {
      const mockUser: UserProfileOutput = {
        '@id': '/api/me',
        '@type': 'User',
        id: 'user-uuid-123',
        username: 'johndoe',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        status: 'active',
        locale: 'system',
        emailVerified: true,
        totpEnabled: false,
        tenantId: 'tenant-uuid-1',
        createdAt: '2026-04-01T08:00:00+00:00',
        lastLoginAt: '2026-04-20T08:00:00+00:00',
        roles: ['ROLE_USER'],
        permissions: [ACCOUNT_PERMISSION.PROFILE_READ, ACCOUNT_PERMISSION.SESSIONS_READ],
      };

      service.getCurrentProfile().subscribe((user) => {
        expect(user.id).toBe('user-uuid-123');
        expect(user.username).toBe('johndoe');
        expect(user.email).toBe('john.doe@example.com');
        expect(user.emailVerified).toBe(true);
        expect(user.permissions).toContain(ACCOUNT_PERMISSION.PROFILE_READ);
      });

      const req = httpMock.expectOne(`${baseUrl}/me`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Accept')).toBe('application/ld+json');

      req.flush(mockUser);
    });

    it('should handle minimal current profile response', () => {
      const mockUser: UserProfileOutput = {
        '@id': '/api/me',
        '@type': 'User',
        id: 'user-uuid-456',
        username: null,
        email: 'minimal@example.com',
        firstName: null,
        lastName: null,
        avatarUrl: null,
        status: null,
        locale: 'system',
        emailVerified: false,
        totpEnabled: false,
        tenantId: null,
        createdAt: null,
        lastLoginAt: null,
        roles: [],
        permissions: [],
      };

      service.getCurrentProfile().subscribe((user) => {
        expect(user.id).toBe('user-uuid-456');
        expect(user.firstName).toBeNull();
        expect(user.avatarUrl).toBeNull();
        expect(user.permissions).toEqual([]);
      });

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush(mockUser);
    });

    it('should handle unauthorized error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 401,
        type: 'https://api.test.com/errors/unauthorized',
        title: 'Unauthorized',
        detail: 'Access token is missing or invalid.',
      };

      service.getCurrentProfile().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(401);
          expect(error.detail).toContain('Access token');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle token expired error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 401,
        type: 'https://api.test.com/errors/token-expired',
        title: 'Token Expired',
        detail: 'The access token has expired.',
      };

      service.getCurrentProfile().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(401);
          expect(error.title).toBe('Token Expired');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/me`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('updateCurrentProfile', () => {
    it('should send a merge patch to the current profile endpoint', () => {
      const input = { firstName: 'Ada' };
      const response = { firstName: 'Ada' } as UserProfileOutput;

      service.updateCurrentProfile(input).subscribe((profile) => {
        expect(profile.firstName).toBe('Ada');
      });

      const req = httpMock.expectOne(`${baseUrl}/me`);
      expect(req.request.method).toBe('PATCH');
      expect(req.request.body).toEqual(input);
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      expect(req.request.withCredentials).toBe(true);

      req.flush(response);
    });
  });

  describe('deactivateCurrentAccount', () => {
    it('should send a bodiless POST to the deactivate endpoint and return the inactive profile', () => {
      const response = { id: 'user-uuid-123', status: 'inactive' } as UserProfileOutput;

      service.deactivateCurrentAccount().subscribe((profile) => {
        expect(profile.status).toBe('inactive');
      });

      const req = httpMock.expectOne(`${baseUrl}/me/deactivate`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);

      req.flush(response);
    });

    it('should propagate a denial untouched', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 403,
        type: 'https://api.test.com/errors/forbidden',
        title: 'Forbidden',
        detail: 'Insufficient permissions.',
      };

      service.deactivateCurrentAccount().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(403);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/me/deactivate`);
      req.flush(errorResponse, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('uploadCurrentAvatar', () => {
    it('should send a multipart PUT to the current avatar endpoint', () => {
      const avatar = new File(['avatar'], 'avatar.png', { type: 'image/png' });
      const response = { avatarUrl: 'https://example.com/avatar.webp' } as UserOutput;

      service.uploadCurrentAvatar(avatar, avatar.name).subscribe((user) => {
        expect(user.avatarUrl).toBe(response.avatarUrl);
      });

      const req = httpMock.expectOne(`${baseUrl}/me/avatar`);
      const uploadedAvatar = req.request.body.get('avatar') as File;
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toBeInstanceOf(FormData);
      expect(uploadedAvatar.name).toBe(avatar.name);
      expect(uploadedAvatar.type).toBe(avatar.type);
      expect(req.request.headers.has('Content-Type')).toBe(false);
      expect(req.request.withCredentials).toBe(true);

      req.flush(response);
    });
  });
  describe('requestEmailChange', () => {
    it('should POST the new address and current password to the email-change endpoint', () => {
      const response = {
        '@id': '/api/me/email-change',
        '@type': 'RequestEmailChangeOutput',
        success: true,
        message: 'A confirmation link has been sent to the new email address.',
        expiresAt: '2026-08-28T12:00:00+00:00',
      } as RequestEmailChangeOutput;

      service
        .requestEmailChange({ newEmail: 'new@example.com', currentPassword: 'Secret123!' })
        .subscribe((result) => {
          expect(result.success).toBe(true);
          expect(result.expiresAt).toBe('2026-08-28T12:00:00+00:00');
        });

      const req = httpMock.expectOne(`${baseUrl}/me/email-change`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        newEmail: 'new@example.com',
        currentPassword: 'Secret123!',
      });
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');

      req.flush(response, { status: 202, statusText: 'Accepted' });
    });

    it('should propagate the neutral 409 untouched', () => {
      service
        .requestEmailChange({ newEmail: 'taken@example.com', currentPassword: 'Secret123!' })
        .subscribe({
          next: () => {
            throw new Error('should not succeed');
          },
          error: (error: ApiError) => {
            expect(error.status).toBe(409);
          },
        });

      const req = httpMock.expectOne(`${baseUrl}/me/email-change`);
      req.flush(
        {
          '@id': '',
          '@type': 'Error',
          status: 409,
          type: 'about:blank',
          title: 'Conflict',
          detail: 'This email address cannot be used.',
        },
        { status: 409, statusText: 'Conflict' },
      );
    });

    it('should propagate the 422 of a wrong current password untouched', () => {
      service
        .requestEmailChange({ newEmail: 'new@example.com', currentPassword: 'wrong' })
        .subscribe({
          next: () => {
            throw new Error('should not succeed');
          },
          error: (error: ApiError) => {
            expect(error.status).toBe(422);
          },
        });

      const req = httpMock.expectOne(`${baseUrl}/me/email-change`);
      req.flush(
        {
          '@id': '',
          '@type': 'Error',
          status: 422,
          type: 'about:blank',
          title: 'Unprocessable Entity',
          detail: 'Current password is incorrect.',
        },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    });
  });

  describe('cancelEmailChange', () => {
    it('should send a DELETE to the email-change endpoint and complete', () => {
      let completed = false;

      service.cancelEmailChange().subscribe({
        complete: () => {
          completed = true;
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/me/email-change`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);

      req.flush(null, { status: 204, statusText: 'No Content' });
      expect(completed).toBe(true);
    });
  });
});
