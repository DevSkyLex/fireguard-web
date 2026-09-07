import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { FederatedConnectionsOutput, LoginOutput } from '@features/auth/models';
import { FederatedAuthService } from '../federated-auth.service';

describe('FederatedAuthService', () => {
  let service: FederatedAuthService;
  let httpMock: HttpTestingController;
  const baseUrl = 'https://api.test.com/api/auth/federated';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        FederatedAuthService,
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test.com' } },
      ],
    });
    service = TestBed.inject(FederatedAuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should start login with the selected provider and local return URL', () => {
    service.startLogin('google', { return_url: '/organizations/one' }).subscribe();

    const request = httpMock.expectOne(`${baseUrl}/google/start`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ return_url: '/organizations/one' });
    expect(request.request.withCredentials).toBe(true);
    request.flush({ authorization_url: 'https://accounts.google.com/authorize' });
  });

  it('should complete login through the existing session output contract', () => {
    const output = {
      '@id': '/api/auth/federated/google/complete',
      '@type': 'Token',
      access_token: 'access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      return_url: '/dashboard',
      new_account: true,
    } satisfies LoginOutput;

    service.completeLogin('google', { code: 'code', state: 'state' }).subscribe((result) => {
      expect(result).toEqual(output);
    });

    const request = httpMock.expectOne(`${baseUrl}/google/complete`);
    expect(request.request.body).toEqual({ code: 'code', state: 'state' });
    request.flush(output);
  });

  it('should use authenticated connection endpoints for link and disconnect', () => {
    const connections = {
      '@id': '/api/auth/federated/connections',
      '@type': 'FederatedConnections',
      password_configured: true,
      last_sign_in_method: 'password',
      connections: [],
    } satisfies FederatedConnectionsOutput;

    service.completeLink('microsoft', { code: 'code', state: 'state' }).subscribe();
    const complete = httpMock.expectOne(`${baseUrl}/connections/microsoft/complete`);
    expect(complete.request.method).toBe('POST');
    complete.flush(connections);

    service.disconnect('microsoft').subscribe((result) => expect(result).toEqual(connections));
    const remove = httpMock.expectOne(`${baseUrl}/connections/microsoft`);
    expect(remove.request.method).toBe('DELETE');
    expect(remove.request.withCredentials).toBe(true);
    remove.flush(connections);
  });
});
