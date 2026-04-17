import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { HydraCollection, ApiError } from '@core/models/api';
import type { SessionOutput } from '@features/auth/models';
import { SessionService } from '../session.service';

describe('SessionService', () => {
  let service: SessionService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/sessions`;
  const revokeAllUrl = `${baseUrl}/revoke-all`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        SessionService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(SessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  const mockSession: SessionOutput = {
    '@id': '/api/sessions/session-uuid-1',
    '@type': 'Session',
    id: 'session-uuid-1',
    userId: 'user-uuid-123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    deviceType: 'desktop',
    browser: 'Chrome',
    createdAt: '2026-01-29T10:00:00+00:00',
    lastActivityAt: '2026-01-30T12:00:00+00:00',
    isActive: true,
    isCurrent: true,
  };

  const mockOtherSession: SessionOutput = {
    '@id': '/api/sessions/session-uuid-2',
    '@type': 'Session',
    id: 'session-uuid-2',
    userId: 'user-uuid-123',
    ipAddress: '10.0.0.5',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1',
    deviceType: 'mobile',
    browser: 'Safari',
    createdAt: '2026-01-28T08:00:00+00:00',
    lastActivityAt: '2026-01-30T09:00:00+00:00',
    isActive: true,
    isCurrent: false,
  };

  describe('list', () => {
    it('should send GET request and return sessions collection', () => {
      const mockCollection: HydraCollection<SessionOutput> = {
        '@context': '/api/contexts/Session',
        '@id': '/api/sessions',
        '@type': 'Collection',
        totalItems: 2,
        member: [mockSession, mockOtherSession],
      };

      service.list().subscribe((collection) => {
        expect(collection.totalItems).toBe(2);
        expect(collection.member.length).toBe(2);
        expect(collection.member[0].isCurrent).toBe(true);
        expect(collection.member[1].isCurrent).toBe(false);
      });

      const req = httpMock.expectOne(baseUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Accept')).toBe('application/ld+json');

      req.flush(mockCollection);
    });

    it('should send GET request with pagination options', () => {
      const mockCollection: HydraCollection<SessionOutput> = {
        '@context': '/api/contexts/Session',
        '@id': '/api/sessions?page=2&itemsPerPage=10',
        '@type': 'Collection',
        totalItems: 25,
        member: [mockSession],
      };

      service.list({ page: 2, itemsPerPage: 10 }).subscribe((collection) => {
        expect(collection.totalItems).toBe(25);
      });

      const req = httpMock.expectOne(`${baseUrl}?page=2&itemsPerPage=10`);
      expect(req.request.method).toBe('GET');

      req.flush(mockCollection);
    });

    it('should handle empty sessions list', () => {
      const emptyCollection: HydraCollection<SessionOutput> = {
        '@context': '/api/contexts/Session',
        '@id': '/api/sessions',
        '@type': 'Collection',
        totalItems: 0,
        member: [],
      };

      service.list().subscribe((collection) => {
        expect(collection.totalItems).toBe(0);
        expect(collection.member.length).toBe(0);
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(emptyCollection);
    });

    it('should handle unauthorized error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 401,
        type: 'https://api.test.com/errors/unauthorized',
        title: 'Unauthorized',
        detail: 'Authentication required.',
        instance: null,
      };

      service.list().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(401);
        },
      });

      const req = httpMock.expectOne(baseUrl);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('get', () => {
    const sessionId = 'session-uuid-1';

    it('should send GET request and return single session', () => {
      service.get(sessionId).subscribe((session) => {
        expect(session.id).toBe(sessionId);
        expect(session.browser).toBe('Chrome');
        expect(session.isCurrent).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/${sessionId}`);
      expect(req.request.method).toBe('GET');
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockSession);
    });

    it('should handle not found error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 404,
        type: 'https://api.test.com/errors/not-found',
        title: 'Not Found',
        detail: 'Session not found.',
        instance: null,
      };

      service.get('invalid-id').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
          expect(error.detail).toBe('Session not found.');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/invalid-id`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });
  });

  describe('revoke', () => {
    const sessionId = 'session-uuid-2';

    it('should send DELETE request to revoke session', () => {
      service.revoke(sessionId).subscribe(() => {
        // Success - no content
      });

      const req = httpMock.expectOne(`${baseUrl}/${sessionId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.withCredentials).toBe(true);

      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should handle not found error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 404,
        type: 'https://api.test.com/errors/not-found',
        title: 'Not Found',
        detail: 'Session not found or already revoked.',
        instance: null,
      };

      service.revoke('invalid-id').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(404);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/invalid-id`);
      req.flush(errorResponse, { status: 404, statusText: 'Not Found' });
    });

    it('should handle forbidden error when revoking current session', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 403,
        type: 'https://api.test.com/errors/forbidden',
        title: 'Forbidden',
        detail: 'Cannot revoke current session. Use logout instead.',
        instance: null,
      };

      service.revoke('current-session-id').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(403);
          expect(error.detail).toContain('logout');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/current-session-id`);
      req.flush(errorResponse, { status: 403, statusText: 'Forbidden' });
    });
  });

  describe('revokeAll', () => {
    it('should send POST request to revoke all sessions', () => {
      service.revokeAll().subscribe(() => {
        // Success - no content
      });

      const req = httpMock.expectOne(revokeAllUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.withCredentials).toBe(true);

      req.flush(null, { status: 204, statusText: 'No Content' });
    });

    it('should handle error when no other sessions to revoke', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 400,
        type: 'https://api.test.com/errors/no-sessions',
        title: 'Bad Request',
        detail: 'No other sessions to revoke.',
        instance: null,
      };

      service.revokeAll().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(revokeAllUrl);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });
});
