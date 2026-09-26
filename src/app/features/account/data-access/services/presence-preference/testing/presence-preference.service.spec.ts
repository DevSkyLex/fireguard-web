import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { PresencePreferenceService } from '../presence-preference.service';

describe('PresencePreferenceService', () => {
  let service: PresencePreferenceService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(PresencePreferenceService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('reads the session-owned preference with credentials and no user parameter', () => {
    const response = vi.fn();
    service.getPreference().subscribe(response);
    const request = http.expectOne('https://api.test/api/me/presence-preference');
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ doNotDisturb: false, revision: 0 });
    expect(response).toHaveBeenCalledWith({ doNotDisturb: false, revision: 0 });
  });

  it('patches an explicit false value and preserves the returned revision', () => {
    const response = vi.fn();
    service.updatePreference({ doNotDisturb: false }).subscribe(response);
    const request = http.expectOne('https://api.test/api/me/presence-preference');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ doNotDisturb: false });
    request.flush({ doNotDisturb: false, revision: 4 });
    expect(response).toHaveBeenCalledWith({ doNotDisturb: false, revision: 4 });
  });

  it('loads the private subscription expiry without altering the token', () => {
    const response = vi.fn();
    service.getSubscription().subscribe(response);
    const request = http.expectOne('https://api.test/api/me/presence-preference/subscription');
    expect(request.request.method).toBe('GET');
    const subscription = {
      topic: '/users/user-1/presence-preference',
      token: 'test-token',
      expiresAt: '2026-09-26T12:00:00Z',
    };
    request.flush(subscription);
    expect(response).toHaveBeenCalledWith(subscription);
  });

  it('propagates the API error to its store', () => {
    const error = vi.fn();
    service.updatePreference({ doNotDisturb: true }).subscribe({ error });
    http
      .expectOne('https://api.test/api/me/presence-preference')
      .flush(
        { status: 429, title: 'Too many requests', detail: 'Try later.', type: 'about:blank' },
        { status: 429, statusText: 'Too Many Requests' },
      );
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 429, detail: 'Try later.' }),
    );
  });
});
