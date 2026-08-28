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

  it('should edit through a merge PATCH on the message route', () => {
    service.editMessage('m1', { body: 'Corrigé.' }).subscribe();

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/messages/m1`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(request.request.body).toEqual({ body: 'Corrigé.' });
    request.flush(message);
  });

  it('should delete through the message route and complete on 204', () => {
    let completed = false;
    service.deleteMessage('m1').subscribe({ complete: () => (completed = true) });

    const request = httpMock.expectOne(`${mockEnv.apiUrl}/api/messages/m1`);

    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });

  it('should pin and unpin through the pin subresource', () => {
    service.pinMessage('m1').subscribe();
    const pin = httpMock.expectOne(`${mockEnv.apiUrl}/api/messages/m1/pin`);
    expect(pin.request.method).toBe('POST');
    pin.flush(message);

    service.unpinMessage('m1').subscribe();
    const unpin = httpMock.expectOne(`${mockEnv.apiUrl}/api/messages/m1/pin`);
    expect(unpin.request.method).toBe('DELETE');
    unpin.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should save and unsave through the save subresource', () => {
    service.saveMessage('m1').subscribe();
    const save = httpMock.expectOne(`${mockEnv.apiUrl}/api/messages/m1/save`);
    expect(save.request.method).toBe('POST');
    save.flush(message);

    service.unsaveMessage('m1').subscribe();
    const unsave = httpMock.expectOne(`${mockEnv.apiUrl}/api/messages/m1/save`);
    expect(unsave.request.method).toBe('DELETE');
    unsave.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('should list pinned messages under the conversation with its paging', () => {
    service.listPinned('c1', { page: 2, itemsPerPage: 100 }).subscribe();

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${mockEnv.apiUrl}/api/conversations/c1/pinned-messages` &&
        candidate.params.get('page') === '2' &&
        candidate.params.get('itemsPerPage') === '100',
    );

    expect(request.request.method).toBe('GET');
    request.flush({ member: [], totalItems: 0 });
  });

  it('should list saved messages with the required organization filter', () => {
    service.listSaved({ organization: 'org-1', page: 1, itemsPerPage: 30 }).subscribe();

    const request = httpMock.expectOne(
      (candidate) =>
        candidate.url === `${mockEnv.apiUrl}/api/saved-messages` &&
        candidate.params.get('organization') === 'org-1' &&
        candidate.params.get('page') === '1',
    );

    expect(request.request.method).toBe('GET');
    request.flush({ member: [], totalItems: 0 });
  });

  it('should post and list replies under the parent message', () => {
    service.postReply('m1', { body: 'Réponse.' }).subscribe();
    const post = httpMock.expectOne(`${mockEnv.apiUrl}/api/messages/m1/replies`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ body: 'Réponse.' });
    post.flush(message);

    service.listReplies('m1', { page: 1, itemsPerPage: 100 }).subscribe();
    const list = httpMock.expectOne(
      (candidate) => candidate.url === `${mockEnv.apiUrl}/api/messages/m1/replies`,
    );
    expect(list.request.method).toBe('GET');
    list.flush({ member: [], totalItems: 0 });
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
