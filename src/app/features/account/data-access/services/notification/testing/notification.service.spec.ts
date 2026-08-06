import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { MarkAllNotificationsAsReadOutput } from '@features/account/models';
import { NotificationService } from '../notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;

  const mockEnv = { apiUrl: 'https://api.test.com' };
  const baseUrl = `${mockEnv.apiUrl}/api/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        NotificationService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });

    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('markAllAsRead', () => {
    it('should PATCH the bulk endpoint with no body', () => {
      const response: MarkAllNotificationsAsReadOutput = {
        '@id': '/api/notifications/read-all',
        '@type': 'Notification',
        count: 4,
      };
      let received: MarkAllNotificationsAsReadOutput | undefined;

      service.markAllAsRead().subscribe((result) => {
        received = result;
      });

      const request = httpMock.expectOne(`${baseUrl}/read-all`);

      expect(request.request.method).toBe('PATCH');
      // The endpoint takes no payload — it acts on every unread notification
      // of the authenticated user.
      expect(request.request.body).toBeNull();
      expect(request.request.withCredentials).toBe(true);

      request.flush(response);

      expect(received).toEqual(response);
    });

    it('should let a failure through untouched', () => {
      let failed = false;

      service.markAllAsRead().subscribe({
        error: () => {
          failed = true;
        },
      });

      httpMock
        .expectOne(`${baseUrl}/read-all`)
        .flush({ status: 500, title: 'Server Error' }, { status: 500, statusText: 'Error' });

      // A `catchError` here would break the toStoreError → errorCallState chain
      // the store depends on.
      expect(failed).toBe(true);
    });
  });
});
