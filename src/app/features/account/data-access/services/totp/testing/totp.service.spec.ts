import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ApiError } from '@core/api/models';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  ConfirmTotpOutput,
  DisableTotpOutput,
  SetupTotpOutput,
} from '@features/account/models';
import { TotpService } from '../totp.service';

describe('TotpService', () => {
  let service: TotpService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/otp/totp`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TotpService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(TotpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('setup', () => {
    it('should send a bodyless POST and return the generated secret and URI', () => {
      const mockOutput: SetupTotpOutput = {
        '@id': '',
        '@type': 'Totp',
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeUri:
          'otpauth://totp/FireGuard%20Auth:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=FireGuard%20Auth',
      };

      service.setup().subscribe((output) => {
        expect(output.secret).toBe('JBSWY3DPEHPK3PXP');
        expect(output.qrCodeUri).toContain('otpauth://totp');
      });

      const req = httpMock.expectOne(`${baseUrl}/setup`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockOutput);
    });

    it('should propagate a structured API error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 401,
        type: 'https://api.test.com/errors/unauthorized',
        title: 'Unauthorized',
        detail: 'Access token is missing or invalid.',
      };

      service.setup().subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(401);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/setup`);
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('confirm', () => {
    it('should send the code and return the activation result', () => {
      const mockOutput: ConfirmTotpOutput = { '@id': '', '@type': 'Totp', success: true };

      service.confirm('123456').subscribe((output) => {
        expect(output.success).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/confirm`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ code: '123456' });
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockOutput);
    });

    it('should propagate a 422 for an invalid or expired code', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 422,
        type: 'https://api.test.com/errors/unprocessable-entity',
        title: 'Unprocessable Entity',
        detail: 'Invalid or expired verification code.',
      };

      service.confirm('000000').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(422);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/confirm`);
      req.flush(errorResponse, { status: 422, statusText: 'Unprocessable Entity' });
    });

    it('should propagate a 429 when rate-limited', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 429,
        type: 'https://api.test.com/errors/too-many-requests',
        title: 'Too Many Requests',
        detail: 'Too many confirmation attempts.',
      };

      service.confirm('000000').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(429);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/confirm`);
      req.flush(errorResponse, { status: 429, statusText: 'Too Many Requests' });
    });
  });

  describe('disable', () => {
    it('should send the current code and return the disable result', () => {
      const mockOutput: DisableTotpOutput = { '@id': '', '@type': 'Totp', success: true };

      service.disable('654321').subscribe((output) => {
        expect(output.success).toBe(true);
      });

      const req = httpMock.expectOne(`${baseUrl}/disable`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ code: '654321' });
      expect(req.request.withCredentials).toBe(true);

      req.flush(mockOutput);
    });

    it('should propagate a structured API error', () => {
      const errorResponse: ApiError = {
        '@id': '',
        '@type': 'Error',
        status: 422,
        type: 'https://api.test.com/errors/unprocessable-entity',
        title: 'Unprocessable Entity',
        detail: 'Invalid verification code.',
      };

      service.disable('000000').subscribe({
        error: (error: ApiError) => {
          expect(error.status).toBe(422);
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/disable`);
      req.flush(errorResponse, { status: 422, statusText: 'Unprocessable Entity' });
    });
  });
});
