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
});
