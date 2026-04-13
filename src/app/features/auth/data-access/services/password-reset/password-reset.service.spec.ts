import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { PasswordResetService } from './password-reset.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  PasswordResetRequestInput,
  PasswordResetRequestOutput,
  PasswordResetResendInput,
  PasswordResetResendOutput,
  PasswordResetVerifyInput,
  PasswordResetVerifyOutput,
} from '@features/auth/models';
import type { ApiError } from '@core/models/api';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/auth/password/reset`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PasswordResetService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(PasswordResetService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should send request payload to request endpoint', () => {
    const input: PasswordResetRequestInput = { email: 'test@example.com' };
    const response: PasswordResetRequestOutput = {
      '@id': '/api/auth/password/reset/request',
      '@type': 'RequestPasswordResetOutput',
      success: true,
      message: 'Code sent',
      challengeToken: 'challenge-token',
      maskedRecipient: 't***@e***.com',
      expiresAt: '2026-01-01T00:10:00Z',
      maxAttempts: 5,
      canResendIn: 30,
    };

    service.request(input).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne(`${baseUrl}/request`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    expect(req.request.withCredentials).toBe(true);
    expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');
    req.flush(response);
  });

  it('should send confirm payload to confirm endpoint', () => {
    const input: PasswordResetVerifyInput = {
      token: 'challenge-token',
      code: '123456',
      newPassword: 'NewPass123!',
    };
    const response: PasswordResetVerifyOutput = {
      '@id': '/api/auth/password/reset/confirm',
      '@type': 'ConfirmPasswordResetOutput',
      success: true,
      message: 'Password updated',
      errorCode: null,
      attemptsRemaining: 5,
    };

    service.confirm(input).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne(`${baseUrl}/confirm`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    expect(req.request.withCredentials).toBe(true);
    req.flush(response);
  });

  it('should send resend payload to resend endpoint', () => {
    const input: PasswordResetResendInput = { token: 'challenge-token' };
    const response: PasswordResetResendOutput = {
      '@id': '/api/auth/password/reset/resend',
      '@type': 'ResendPasswordResetOutput',
      success: true,
      message: 'Code resent',
      challengeToken: 'new-challenge-token',
      maskedRecipient: 't***@e***.com',
      expiresAt: '2026-01-01T00:20:00Z',
      maxAttempts: 5,
      canResendIn: 30,
    };

    service.resend(input).subscribe((result) => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne(`${baseUrl}/resend`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    expect(req.request.withCredentials).toBe(true);
    req.flush(response);
  });

  it('should map API errors from request endpoint', () => {
    const input: PasswordResetRequestInput = { email: 'test@example.com' };
    const errorResponse: ApiError = {
      '@id': '',
      '@type': 'Error',
      status: 429,
      type: 'https://api.test.com/errors/rate-limit',
      title: 'Too Many Requests',
      detail: 'Please wait before requesting another code.',
      instance: null,
    };

    service.request(input).subscribe({
      error: (error: ApiError) => {
        expect(error.status).toBe(429);
        expect(error.detail).toContain('wait');
      },
    });

    const req = httpMock.expectOne(`${baseUrl}/request`);
    req.flush(errorResponse, { status: 429, statusText: 'Too Many Requests' });
  });
});
