import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment';
import { InboxService } from '../inbox.service';

describe('InboxService', () => {
  const apiUrl = 'http://localhost:8000';
  let service: InboxService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InboxService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl, production: false } },
      ],
    });

    service = TestBed.inject(InboxService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should read the first page without any cursor', () => {
    service.list().subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${apiUrl}/api/inbox`);
    expect(request.request.params.has('before')).toBe(false);
    request.flush({ items: [], nextCursor: null, hasMore: false });
  });

  // `before` is the only pagination parameter the API reads. Sending the
  // cursor as `cursor` was ignored, so "load more" re-fetched page one and
  // appended the same items forever — and no hermetic e2e could see it,
  // because the mock matched either name.
  it('should send the cursor as the before parameter', () => {
    service.list(undefined, '2026-07-01T09:00:00+00:00').subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${apiUrl}/api/inbox`);
    expect(request.request.params.get('before')).toBe('2026-07-01T09:00:00+00:00');
    expect(request.request.params.has('cursor')).toBe(false);
    request.flush({ items: [], nextCursor: null, hasMore: false });
  });

  it('should narrow to one organization when asked', () => {
    service.list('org-1').subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${apiUrl}/api/inbox`);
    expect(request.request.params.get('organizationId')).toBe('org-1');
    request.flush({ items: [], nextCursor: null, hasMore: false });
  });
});
