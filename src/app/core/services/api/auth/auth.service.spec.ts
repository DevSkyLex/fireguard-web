import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { AuthService } from './auth.service';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { LoginInput, LoginOutput, LogoutOutput, MfaVerifyInput } from '@core/models/auth';
import type { ApiError } from '@core/models/api';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/auth`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('login', () => {
    const credentials: LoginInput = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should send POST request with credentials', () => {
      const mockResponse: LoginOutput = {
        '@id': '/api/auth/login',
        '@type': 'Token',
        access_token: 'jwt-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      service.login(credentials).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(credentials);
      expect(req.request.withCredentials).toBe(true);
      expect(req.request.headers.get('Content-Type')).toBe('application/ld+json');

      req.flush(mockResponse);
    });

    it('should handle MFA required response', () => {
      const mfaResponse: LoginOutput = {
        '@id': '/api/auth/login',
        '@type': 'Token',
        access_token: '',
        token_type: 'Bearer',
        expires_in: 0,
        mfa_required: true,
        mfa_token: 'mfa-pre-auth-token',
        challenge_token: 'otp-challenge-token',
      };

      service.login(credentials).subscribe((response) => {
        expect(response.mfa_required).toBe(true);
        expect(response.mfa_token).toBe('mfa-pre-auth-token');
        expect(response.challenge_token).toBe('otp-challenge-token');
      });

      const req = httpMock.expectOne(`${baseUrl}/login`);
      req.flush(mfaResponse);
    });

    it('should handle API error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 401,
        type: 'https://api.test.com/errors/invalid-credentials',
        title: 'Invalid Credentials',
        detail: 'The email or password is incorrect.',
        instance: null,
      };

      service.login(credentials).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(401);
          expect(error.detail).toBe('The email or password is incorrect.');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/login`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('logout', () => {
    it('should send POST request without body', () => {
      const mockResponse: LogoutOutput = {
        '@id': '/api/auth/logout',
        '@type': 'Message',
        message: 'Successfully logged out',
      };

      service.logout().subscribe((response) => {
        expect(response.message).toBe('Successfully logged out');
      });

      const req = httpMock.expectOne(`${baseUrl}/logout`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockResponse);
    });
  });

  describe('refresh', () => {
    it('should send POST request and return new token', () => {
      const mockResponse: LoginOutput = {
        '@id': '/api/auth/refresh',
        '@type': 'Token',
        access_token: 'new-jwt-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      service.refresh().subscribe((response) => {
        expect(response.access_token).toBe('new-jwt-token');
      });

      const req = httpMock.expectOne(`${baseUrl}/refresh`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockResponse);
    });

    it('should handle refresh failure', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 401,
        type: 'https://api.test.com/errors/token-expired',
        title: 'Token Expired',
        detail: 'The refresh token has expired.',
        instance: null,
      };

      service.refresh().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(401);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/refresh`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('mfaVerify', () => {
    const mfaInput: MfaVerifyInput = {
      preAuthToken: 'mfa-pre-auth-token',
      code: '123456',
    };

    it('should send POST request with MFA verification data', () => {
      const mockResponse: LoginOutput = {
        '@id': '/api/auth/mfa/verify',
        '@type': 'Token',
        access_token: 'jwt-token-after-mfa',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      service.mfaVerify(mfaInput).subscribe((response) => {
        expect(response.access_token).toBe('jwt-token-after-mfa');
      });

      const req = httpMock.expectOne(`${baseUrl}/mfa/verify`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mfaInput);
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockResponse);
    });

    it('should handle invalid OTP code', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 400,
        type: 'https://api.test.com/errors/invalid-otp',
        title: 'Invalid OTP',
        detail: 'The verification code is invalid or expired.',
        instance: null,
      };

      service.mfaVerify(mfaInput).subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(400);
          expect(error.detail).toContain('invalid or expired');
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/mfa/verify`);
      req.flush(errorResponse, { status: 400, statusText: 'Bad Request' });
    });
  });
});
