import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { MessageOutput } from '@features/organization/features/collaboration/models';
import { MessageService } from '../message.service';

describe('MessageService', () => {
  let service: MessageService;
  let httpMock: HttpTestingController;
  const mockEnv = { apiUrl: 'https://api.test.com' };

  const message = { '@id': '/api/messages/m1', '@type': 'Message', id: 'm1' } as MessageOutput;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: ENV_CONFIG, useValue: mockEnv },
      ],
    });
    service = TestBed.inject(MessageService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should let the server mint the id on an ordinary send', () => {
    service.postMessage('c1', { body: 'Bien reçu.' }).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/conversations/c1/messages`);

    expect(request.request.method).toBe('POST');
    expect(request.request.headers.get('If-None-Match')).toBeNull();
    request.flush(message);
  });

  it('should send a client-minted id as a create-only PUT', () => {
    service.postMessageWithClientId('c1', 'client-1', { body: 'Bien reçu.' }).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/conversations/c1/messages/client-1`);

    // The id is in the path, not the body — and `If-None-Match: *` is what
    // makes the endpoint refuse to behave as an edit.
    expect(request.request.method).toBe('PUT');
    expect(request.request.headers.get('If-None-Match')).toBe('*');
    expect(request.request.body).toEqual({ body: 'Bien reçu.' });
    request.flush(message);
  });

  it('should surface the replay conflict rather than swallowing it', () => {
    let status = 0;
    service
      .postMessageWithClientId('c1', 'client-1', { body: 'Bien reçu.' })
      .subscribe({ error: (error: { status?: number }) => (status = error.status ?? 0) });

    // A replayed client id answers 409; the caller decides that this means
    // "already stored", so the service must not translate it away.
    httpMock
      .expectOne(`${mockEnv.apiUrl}/api/conversations/c1/messages/client-1`)
      .flush(
        { type: '/problems/client-resource-already-exists' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(status).toBe(409);
  });
});
