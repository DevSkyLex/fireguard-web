import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { ApiError } from '@core/models/api';
import type { UserProfileOutput } from '@features/account/models';
import { UserProfileService } from '../user-profile.service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/oauth2`;

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
        '@id': '/api/oauth2/userinfo',
        '@type': 'UserInfo',
        sub: 'user-uuid-123',
        name: 'John Doe',
        given_name: 'John',
        family_name: 'Doe',
        email: 'john.doe@example.com',
        email_verified: true,
        preferred_username: 'johndoe',
        picture: 'https://example.com/avatar.jpg',
      };

      service.getCurrentProfile().subscribe((user) => {
        expect(user.sub).toBe('user-uuid-123');
        expect(user.name).toBe('John Doe');
        expect(user.email).toBe('john.doe@example.com');
        expect(user.email_verified).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/userinfo`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Accept')).toBe('application/ld+json');

      req.flush(mockUser);
    });

    it('should handle minimal current profile response', () => {
      const mockUser: UserProfileOutput = {
        '@id': '/api/oauth2/userinfo',
        '@type': 'UserInfo',
        sub: 'user-uuid-456',
        email: 'minimal@example.com',
      };

      service.getCurrentProfile().subscribe((user) => {
        expect(user.sub).toBe('user-uuid-456');
        expect(user.name).toBeUndefined();
        expect(user.picture).toBeUndefined();
      });

      const req = httpMock.expectOne(`${baseUrl}/userinfo`);
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

      const req = httpMock.expectOne(`${baseUrl}/userinfo`);
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

      const req = httpMock.expectOne(`${baseUrl}/userinfo`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });
});