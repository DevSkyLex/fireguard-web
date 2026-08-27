import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type {
  MarkAllNotificationsAsReadOutput,
  NotificationPreferencesOutput,
  UpdateNotificationPreferencesInput,
} from '@features/account/models';
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
  describe('getPreferences', () => {
    it('should GET the preferences endpoint and return the customized set', () => {
      const response: NotificationPreferencesOutput = {
        '@id': '/api/notifications/preferences',
        '@type': 'Notification',
        preferences: [
          { category: 'organization', emailEnabled: false, mercureEnabled: true, updatedAt: null },
        ],
      };
      let received: NotificationPreferencesOutput | undefined;

      service.getPreferences().subscribe((result) => {
        received = result;
      });

      const request = httpMock.expectOne(`${baseUrl}/preferences`);

      expect(request.request.method).toBe('GET');
      expect(request.request.withCredentials).toBe(true);

      request.flush(response);

      expect(received).toEqual(response);
    });

    it('should let a failure through untouched', () => {
      let failed = false;

      service.getPreferences().subscribe({
        error: () => {
          failed = true;
        },
      });

      httpMock
        .expectOne(`${baseUrl}/preferences`)
        .flush({ status: 500, title: 'Server Error' }, { status: 500, statusText: 'Error' });

      expect(failed).toBe(true);
    });
  });

  describe('updatePreferences', () => {
    it('should PATCH the preferences endpoint as merge-patch with the upsert body', () => {
      const input: UpdateNotificationPreferencesInput = {
        preferences: [{ category: 'intervention', emailEnabled: true, mercureEnabled: false }],
      };
      const response: NotificationPreferencesOutput = {
        '@id': '/api/notifications/preferences',
        '@type': 'Notification',
        preferences: [
          {
            category: 'intervention',
            emailEnabled: true,
            mercureEnabled: false,
            updatedAt: '2026-08-27T10:00:00+00:00',
          },
        ],
      };
      let received: NotificationPreferencesOutput | undefined;

      service.updatePreferences(input).subscribe((result) => {
        received = result;
      });

      const request = httpMock.expectOne(`${baseUrl}/preferences`);

      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual(input);
      expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      expect(request.request.withCredentials).toBe(true);

      request.flush(response);

      expect(received).toEqual(response);
    });

    it('should let a failure through untouched', () => {
      let failed = false;

      service
        .updatePreferences({
          preferences: [{ category: 'intervention', emailEnabled: true, mercureEnabled: false }],
        })
        .subscribe({
          error: () => {
            failed = true;
          },
        });

      httpMock
        .expectOne(`${baseUrl}/preferences`)
        .flush(
          { status: 400, title: 'Validation Failed' },
          { status: 400, statusText: 'Bad Request' },
        );

      expect(failed).toBe(true);
    });
  });
});
