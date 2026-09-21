import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { InboxService } from '../inbox.service';

describe('InboxService', () => {
  let http: HttpTestingController;
  let service: InboxService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(InboxService);
  });
  afterEach(() => http.verify());

  it('echoes cursor bytes unchanged and sends the same organization scope', () => {
    const cursor = 'opaque+with/slash=and space';
    service.list('org-1', cursor).subscribe();
    const request = http.expectOne((r) => r.url === 'https://api.test/api/inbox');
    expect(request.request.params.get('cursor')).toBe(cursor);
    expect(request.request.params.get('organization')).toBe('org-1');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.has('before')).toBe(false);
    expect(request.request.withCredentials).toBe(true);
    request.flush({ items: [], complete: true, hasMore: false, nextPageCursor: null });
  });

  it('omits cursor and organization for the first account-wide page', () => {
    service.list(null, null).subscribe();
    const request = http.expectOne((r) => r.url.endsWith('/api/inbox'));
    expect(request.request.params.has('organization')).toBe(false);
    expect(request.request.params.has('cursor')).toBe(false);
    request.flush({ items: [], complete: true, hasMore: false, nextPageCursor: null });
  });

  it('queries the independent server unread count in the same workspace', () => {
    let count = 0;
    service.unreadCount('org-2').subscribe((result) => {
      count = result;
    });
    const request = http.expectOne((r) => r.url.endsWith('/api/inbox/unread-count'));
    expect(request.request.params.get('organization')).toBe('org-2');
    request.flush({ unreadCount: 137 });
    expect(count).toBe(137);
  });
});
