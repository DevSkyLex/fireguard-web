import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { PresenceService } from '../presence.service';

describe('PresenceService', () => {
  let service: PresenceService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PresenceService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(PresenceService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('requests scoped private subscription credentials with their expiry', () => {
    const result = vi.fn();
    service.getSubscription('org-1').subscribe(result);
    const request = httpMock.expectOne(
      (candidate) => candidate.url === `${mockEnv.apiUrl}/api/presence/subscription`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('organization')).toBe('org-1');
    const credentials = {
      topic: '/organizations/org-1/presence',
      token: 'private-topic-token',
      expiresAt: '2026-09-26T10:00:00Z',
    };
    request.flush(credentials);
    expect(result).toHaveBeenCalledWith(credentials);
  });

  it('should ping with the organization and nothing else', () => {
    service.ping({ organization: '/api/organizations/org-1' }).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/presence/ping`);

    // The acting member is resolved server-side; sending one would be ignored
    // at best.
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ organization: '/api/organizations/org-1' });
    request.flush({ memberId: 'mem-1', lastSeenAt: '2026-07-22T09:00:00+00:00' });
  });

  it('should send both required filters, with member ids comma-separated', () => {
    service.list({ organization: 'org-1', memberIds: ['mem-1', 'mem-2'] }).subscribe();

    const request = httpMock.expectOne(
      (candidate) => candidate.url === `${mockEnv.apiUrl}/api/presence`,
    );

    expect(request.request.params.get('organization')).toBe('org-1');
    expect(request.request.params.get('memberIds')).toBe('mem-1,mem-2');
    request.flush({ '@id': '/x', '@type': 'Collection', totalItems: 0, member: [] });
  });
});
