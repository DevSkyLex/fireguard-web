import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { MessagingService } from '../messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;
  let http: HttpTestingController;
  const apiUrl = 'http://localhost:8000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MessagingService,
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ENV_CONFIG,
          useValue: { apiUrl, mercureHubUrl: `${apiUrl}/.well-known/mercure` },
        },
      ],
    });

    service = TestBed.inject(MessagingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  // The messaging endpoints are NOT organization-scoped in their path — the
  // backend derives the organization from the session. Prefixing them with
  // /organizations/{id} hits a route that does not exist.
  it('should list conversations from the unscoped collection endpoint', () => {
    service.listConversations().subscribe();

    const request = http.expectOne(`${apiUrl}/api/conversations`);
    expect(request.request.method).toBe('GET');
    request.flush({ member: [], totalItems: 0 });
  });

  it('should read one conversation', () => {
    service.getConversation('c1').subscribe();

    http.expectOne(`${apiUrl}/api/conversations/c1`).flush({});
  });

  it('should list a conversation messages under the conversation', () => {
    service.listMessages('c1').subscribe();

    const request = http.expectOne(`${apiUrl}/api/conversations/c1/messages`);
    expect(request.request.method).toBe('GET');
    request.flush({ member: [], totalItems: 0 });
  });

  it('should post a message body to the conversation', () => {
    service.sendMessage('c1', { body: 'hello' }).subscribe();

    const request = http.expectOne(`${apiUrl}/api/conversations/c1/messages`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ body: 'hello' });
    request.flush({});
  });

  it('should mark a conversation read', () => {
    service.markRead('c1').subscribe();

    const request = http.expectOne(`${apiUrl}/api/conversations/c1/read`);
    expect(request.request.method).toBe('POST');
    request.flush({});
  });

  it('should favorite through POST and unfavorite through DELETE', () => {
    service.setFavorite('c1', true).subscribe();
    http
      .expectOne(
        (request) =>
          request.url === `${apiUrl}/api/conversations/c1/favorite` && request.method === 'POST',
      )
      .flush({});

    service.setFavorite('c1', false).subscribe();
    http
      .expectOne(
        (request) =>
          request.url === `${apiUrl}/api/conversations/c1/favorite` && request.method === 'DELETE',
      )
      .flush(null);
  });

  it('should list saved messages filtered by the organization IRI', () => {
    service.listSavedMessages('org-1', 2).subscribe();

    const request = http.expectOne((candidate) => candidate.url === `${apiUrl}/api/saved-messages`);
    expect(request.request.params.get('organization')).toBe('/api/organizations/org-1');
    expect(request.request.params.get('page')).toBe('2');
    request.flush({ member: [], totalItems: 0 });
  });
});
