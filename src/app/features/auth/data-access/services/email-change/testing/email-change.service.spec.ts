import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { ConfirmEmailChangeOutput } from '@features/auth/models';
import { EmailChangeService } from '../email-change.service';

describe('EmailChangeService', () => {
  let service: EmailChangeService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const confirmUrl = `${mockEnv.apiUrl}/api/me/email-change/confirm`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        EmailChangeService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(EmailChangeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('confirm', () => {
    it('should POST the token to the public confirm endpoint', () => {
      const response = {
        '@id': '/api/me/email-change/confirm',
        '@type': 'ConfirmEmailChangeOutput',
        success: true,
        message: 'Your email address has been changed. Please sign in again with the new address.',
      } as ConfirmEmailChangeOutput;

      service.confirm({ token: 'a'.repeat(64) }).subscribe((result) => {
        expect(result.success).toBe(true);
        expect(result.message).toContain('sign in again');
      });

      const req = httpMock.expectOne(confirmUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ token: 'a'.repeat(64) });
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');

      req.flush(response);
    });

    it('should propagate the neutral 400 of a rejected token untouched', () => {
      service.confirm({ token: 'expired-token' }).subscribe({
        next: () => {
          throw new Error('should not succeed');
        },
        error: (error: ApiError) => {
          expect(error.status).toBe(400);
        },
      });

      const req = httpMock.expectOne(confirmUrl);
      req.flush(
        {
          '@id': '',
          '@type': 'Error',
          status: 400,
          type: 'about:blank',
          title: 'Bad Request',
          detail: 'This confirmation link is invalid or has expired.',
        },
        { status: 400, statusText: 'Bad Request' },
      );
    });
  });
});
