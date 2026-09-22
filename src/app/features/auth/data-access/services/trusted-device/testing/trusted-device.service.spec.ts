import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config';
import type { TrustDeviceOutput } from '@features/auth/models';
import { TrustedDeviceService } from '../trusted-device.service';

describe('TrustedDeviceService', () => {
  let service: TrustedDeviceService;
  let httpMock: HttpTestingController;
  const baseUrl = 'https://api.test.com/api/trusted-devices';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test.com' } },
        TrustedDeviceService,
      ],
    });
    service = TestBed.inject(TrustedDeviceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('trusts the current browser through a bodyless credentialed command', () => {
    const response: TrustDeviceOutput = {
      '@id': '/api/trusted-devices/device-1',
      '@type': 'TrustDevice',
      deviceId: 'device-1',
      token: 'opaque-test-token',
      deviceName: 'Browser',
      expiresAt: '2026-10-22T00:00:00Z',
    };
    let result: TrustDeviceOutput | undefined;
    service.trustDevice().subscribe((value) => (result = value));
    const request = httpMock.expectOne(baseUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);
    expect(result).toEqual(response);
  });

  it('lists devices using server pagination and preserves the total', () => {
    const response = {
      '@id': '/api/trusted-devices',
      '@type': 'Collection',
      member: [],
      totalItems: 22,
    };
    let result: unknown;
    service.list({ page: 2, itemsPerPage: 10 }).subscribe((value) => (result = value));
    const request = httpMock.expectOne((candidate) => candidate.url === baseUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('itemsPerPage')).toBe('10');
    expect(request.request.withCredentials).toBe(true);
    request.flush(response);
    expect(result).toEqual(response);
  });

  it('revokes only the selected device through DELETE', () => {
    const result = vi.fn();
    service.revoke('device-1').subscribe(result);
    const request = httpMock.expectOne(`${baseUrl}/device-1`);
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBe(true);
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(result).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('revokes all devices through the credentialed bulk action', () => {
    const completed = vi.fn();
    service.revokeAll().subscribe({ complete: completed });
    const request = httpMock.expectOne(`${baseUrl}/revoke-all`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.headers.get('Content-Type')).toBe('application/ld+json');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toHaveBeenCalledOnce();
  });

  it('propagates bulk-revocation failures with the API error code', () => {
    const error = {
      '@type': 'Error',
      status: 403,
      code: 'access_denied',
      detail: 'Session revoked.',
    };
    let caught: unknown;
    service.revokeAll().subscribe({ error: (value: unknown) => (caught = value) });
    httpMock
      .expectOne(`${baseUrl}/revoke-all`)
      .flush(error, { status: 403, statusText: 'Forbidden' });
    expect(caught).toEqual(error);
  });
});
