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

  it('reads public provider availability without normalizing disabled providers away', () => {
    const response = {
      '@id': '/api/auth/federated/providers',
      '@type': 'Collection',
      member: [{ '@id': '/google', '@type': 'Provider', provider: 'google', enabled: false }],
      totalItems: 1,
    };
    let result: unknown;
    service.providers().subscribe((value) => (result = value));
    const request = httpMock.expectOne(`${baseUrl}/providers`);
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(result).toEqual(response);
  });

  it('reads credentialed connection details and starts linking with the account security destination', () => {
    const response: FederatedConnectionsOutput = {
      '@id': '/api/auth/federated/connections',
      '@type': 'FederatedConnections',
      password_configured: false,
      last_sign_in_method: 'google',
      connections: [],
    };
    let result: FederatedConnectionsOutput | undefined;
    service.connections().subscribe((value) => (result = value));
    const read = httpMock.expectOne(`${baseUrl}/connections`);
    expect(read.request.method).toBe('GET');
    expect(read.request.withCredentials).toBe(true);
    read.flush(response);
    expect(result).toEqual(response);

    service.startLink('microsoft').subscribe();
    const start = httpMock.expectOne(`${baseUrl}/connections/microsoft/start`);
    expect(start.request.method).toBe('POST');
    expect(start.request.body).toEqual({ return_url: '/account/security' });
    expect(start.request.withCredentials).toBe(true);
    start.flush({ authorization_url: 'https://login.microsoftonline.com/authorize' });
  });

  it('requests a bodyless first-password challenge and confirms the exact OTP payload', () => {
    service.requestPasswordSetup().subscribe();
    const challenge = httpMock.expectOne('https://api.test.com/api/auth/password/setup');
    expect(challenge.request.method).toBe('POST');
    expect(challenge.request.body).toBeNull();
    expect(challenge.request.withCredentials).toBe(true);
    challenge.flush({ challengeToken: 'challenge', success: true });

    const input = { token: 'challenge', code: '123456', newPassword: 'StrongPassword123!' };
    const response = {
      '@id': '/api/auth/password/setup/confirm',
      '@type': 'PasswordSetupConfirm',
      success: false,
      message: 'Invalid code',
      errorCode: 'invalid_code',
      attemptsRemaining: 4,
    };
    let result: unknown;
    service.confirmPasswordSetup(input).subscribe((value) => (result = value));
    const confirm = httpMock.expectOne('https://api.test.com/api/auth/password/setup/confirm');
    expect(confirm.request.method).toBe('POST');
    expect(confirm.request.body).toEqual(input);
    expect(confirm.request.withCredentials).toBe(true);
    confirm.flush(response);
    expect(result).toEqual(response);
  });

  it('preserves the structured last-sign-in-method disconnect refusal', () => {
    const error = {
      '@type': 'Error',
      status: 409,
      code: 'last_sign_in_method',
      detail: 'Keep one sign-in method.',
    };
    let caught: unknown;
    service.disconnect('google').subscribe({ error: (value: unknown) => (caught = value) });
    httpMock
      .expectOne(`${baseUrl}/connections/google`)
      .flush(error, { status: 409, statusText: 'Conflict' });
    expect(caught).toEqual(error);
  });

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
