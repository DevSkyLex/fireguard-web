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
});
