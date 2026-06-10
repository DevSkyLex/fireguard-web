import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { ApiError } from '@core/models/api';
import { ACCOUNT_PERMISSION } from '@features/account/models';
import type { UserOutput, UserProfileOutput } from '@features/account/models';
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
        emailVerified: true,
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
        emailVerified: false,
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
        instance: null,
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
        instance: null,
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
});
