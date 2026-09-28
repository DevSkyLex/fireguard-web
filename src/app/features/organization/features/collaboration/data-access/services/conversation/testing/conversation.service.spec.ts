import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { ConversationService } from '../conversation.service';

describe('ConversationService', () => {
  let service: ConversationService;
  let httpMock: HttpTestingController;
  const apiUrl = 'https://api.test.com';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ConversationService,
        { provide: ENV_CONFIG, useValue: { apiUrl } },
      ],
    });
    service = TestBed.inject(ConversationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads participant receipt positions from the conversation route', () => {
    service.getReceipts('conversation-1').subscribe();
    const request = httpMock.expectOne(`${apiUrl}/api/conversations/conversation-1/receipts`);

    expect(request.request.method).toBe('GET');
    request.flush({ receipts: [] });
  });

  it('acknowledges a received message by id without sending message content', () => {
    service.acknowledgeDelivery('conversation-1', 'message-2').subscribe();
    const request = httpMock.expectOne(`${apiUrl}/api/conversations/conversation-1/delivery`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ messageId: 'message-2' });
    request.flush({ accepted: true });
  });

  it('publishes only transient typing activity', () => {
    service.publishTyping('conversation-1', true).subscribe();
    const request = httpMock.expectOne(`${apiUrl}/api/conversations/conversation-1/typing`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ active: true });
    request.flush({ accepted: true });
  });
});
