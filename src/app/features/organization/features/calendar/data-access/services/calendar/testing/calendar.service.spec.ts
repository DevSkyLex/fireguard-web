import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { CalendarService } from '../calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test' } },
      ],
    });
    service = TestBed.inject(CalendarService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should read the unified feed with its inclusive window', () => {
    let received: unknown;
    service.getFeed('org-1', '2026-07-25', '2026-09-07').subscribe((feed) => (received = feed));

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === 'https://api.test/api/organizations/org-1/calendar/feed' &&
        candidate.params.get('from') === '2026-07-25' &&
        candidate.params.get('to') === '2026-09-07',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ from: '2026-07-25', to: '2026-09-07', items: [] });
    expect(received).toMatchObject({ items: [] });
  });

  it('should POST a create with the event body', () => {
    let received: unknown;
    service
      .createEvent('org-1', { title: 'Fire drill', startsAt: '2026-08-01T09:00:00+02:00' })
      .subscribe((event) => (received = event));

    const request = httpMock.expectOne('https://api.test/api/organizations/org-1/calendar/events');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      title: 'Fire drill',
      startsAt: '2026-08-01T09:00:00+02:00',
    });
    expect(request.request.withCredentials).toBe(true);

    request.flush({ id: 'evt-1', title: 'Fire drill' });
    expect(received).toMatchObject({ id: 'evt-1' });
  });

  it('should PATCH an update with only the dirty fields and the merge-patch content type', () => {
    let received: unknown;
    service
      .updateEvent('org-1', 'evt-1', { title: 'Fire drill (updated)' })
      .subscribe((event) => (received = event));

    const request = httpMock.expectOne(
      'https://api.test/api/organizations/org-1/calendar/events/evt-1',
    );
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ title: 'Fire drill (updated)' });
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');

    request.flush({ id: 'evt-1', title: 'Fire drill (updated)' });
    expect(received).toMatchObject({ title: 'Fire drill (updated)' });
  });

  it('should PATCH an explicit null to clear a nullable field', () => {
    service.updateEvent('org-1', 'evt-1', { description: null }).subscribe();

    const request = httpMock.expectOne(
      'https://api.test/api/organizations/org-1/calendar/events/evt-1',
    );
    expect(request.request.body).toEqual({ description: null });

    request.flush({ id: 'evt-1' });
  });

  it('should DELETE an event', () => {
    let completed = false;
    service.deleteEvent('org-1', 'evt-1').subscribe({ complete: () => (completed = true) });

    const request = httpMock.expectOne(
      'https://api.test/api/organizations/org-1/calendar/events/evt-1',
    );
    expect(request.request.method).toBe('DELETE');

    request.flush(null);
    expect(completed).toBe(true);
  });

  it('should POST the feed-token creation without a body and surface the one-time secret', () => {
    let received: unknown;
    service.createFeedToken('org-1').subscribe((secret) => (received = secret));

    const request = httpMock.expectOne(
      'https://api.test/api/organizations/org-1/calendar/feed-token',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeNull();
    expect(request.request.withCredentials).toBe(true);

    request.flush({
      secret: 'raw-secret',
      feedUrl: 'https://api.test/api/calendar/feed/raw-secret.ics',
      createdAt: '2026-08-28T10:00:00+00:00',
      rotated: true,
    });
    expect(received).toMatchObject({
      secret: 'raw-secret',
      feedUrl: 'https://api.test/api/calendar/feed/raw-secret.ics',
      rotated: true,
    });
  });

  it('should GET the feed-token metadata', () => {
    let received: unknown;
    service.getFeedTokenMetadata('org-1').subscribe((metadata) => (received = metadata));

    const request = httpMock.expectOne(
      'https://api.test/api/organizations/org-1/calendar/feed-token',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.withCredentials).toBe(true);

    request.flush({ createdAt: '2026-08-01T08:00:00+00:00', lastUsedAt: null });
    expect(received).toMatchObject({ createdAt: '2026-08-01T08:00:00+00:00' });
  });

  it('should propagate the metadata 404 untouched for the no-token state', () => {
    let caught: unknown;
    service.getFeedTokenMetadata('org-1').subscribe({ error: (error) => (caught = error) });

    const request = httpMock.expectOne(
      'https://api.test/api/organizations/org-1/calendar/feed-token',
    );
    request.flush(
      { '@id': '/errors/404', '@type': 'Error', status: 404, title: 'Not Found' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(caught).toMatchObject({ status: 404 });
  });

  it('should DELETE the feed token', () => {
    let completed = false;
    service.revokeFeedToken('org-1').subscribe({ complete: () => (completed = true) });

    const request = httpMock.expectOne(
      'https://api.test/api/organizations/org-1/calendar/feed-token',
    );
    expect(request.request.method).toBe('DELETE');
    expect(request.request.withCredentials).toBe(true);

    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });
});
