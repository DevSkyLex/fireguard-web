import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { MercureService } from '@core/mercure';
import { AssistantService } from '@features/organization/features/assistant/data-access';
import type {
  AssistantGenerationEvent,
  AssistantMessage,
} from '@features/organization/features/assistant/models';
import { AssistantThreadStore } from '../assistant-thread.store';

const message = (id: string, body: string, extra: Partial<AssistantMessage> = {}) =>
  ({
    '@id': `/api/assistant-messages/${id}`,
    '@type': 'AssistantMessage',
    id,
    threadId: 't1',
    organizationId: 'org-1',
    role: 'assistant',
    body,
    status: 'pending',
    errorCode: null,
    tokenCount: null,
    createdAt: '2026-07-01T10:00:00Z',
    completedAt: null,
    ...extra,
  }) as AssistantMessage;

describe('AssistantThreadStore streaming', () => {
  const hub = new Subject<AssistantGenerationEvent>();

  const createStore = (messages: readonly AssistantMessage[]) => {
    TestBed.configureTestingModule({
      providers: [
        AssistantThreadStore,
        {
          provide: AssistantService,
          useValue: {
            listThreads: vi.fn(() => of({ member: [], totalItems: 0 })),
            getThread: vi.fn(() =>
              of({
                id: 't1',
                organizationId: 'org-1',
                memberId: 'm1',
                title: null,
                model: null,
                createdAt: '2026-07-01T09:00:00Z',
                updatedAt: '2026-07-01T09:00:00Z',
                lastMessageAt: null,
                messages,
              }),
            ),
            getSubscription: vi.fn(() => of({ token: 'jwt', topic: 'assistant/t1' })),
          },
        },
        { provide: MercureService, useValue: { subscribe: vi.fn(() => hub.asObservable()) } },
      ],
    });

    const store = TestBed.inject(AssistantThreadStore);
    store.setOrganization('org-1');
    store.openThread('t1');
    return store;
  };

  // The hub publishes { messageId, status, body, tokenCount, errorCode } — not
  // a message. Treating a frame as one crashed the createdAt sort on the very
  // first token and appended a duplicate bubble per chunk.
  it('should fold a generation frame into the answer it belongs to', () => {
    const store = createStore([message('a1', '')]);

    hub.next({
      messageId: 'a1',
      status: 'streaming',
      body: 'Checking the open non-conformities',
      tokenCount: 6,
      errorCode: null,
    });

    expect(store.messages()).toHaveLength(1);
    expect(store.messages()[0]?.body).toBe('Checking the open non-conformities');
    expect(store.messages()[0]?.status).toBe('streaming');
    expect(store.messages()[0]?.tokenCount).toBe(6);
    // The row keeps the identity the POST gave it.
    expect(store.messages()[0]?.createdAt).toBe('2026-07-01T10:00:00Z');
  });

  it('should keep folding successive frames into the same row', () => {
    const store = createStore([message('a1', '')]);

    hub.next({ messageId: 'a1', status: 'streaming', body: 'One', tokenCount: 1, errorCode: null });
    hub.next({
      messageId: 'a1',
      status: 'completed',
      body: 'One two',
      tokenCount: 2,
      errorCode: null,
    });

    expect(store.messages()).toHaveLength(1);
    expect(store.messages()[0]?.body).toBe('One two');
    expect(store.messages()[0]?.status).toBe('completed');
  });

  // Inventing a row from a frame would mean guessing its author and timestamp.
  it('should drop a frame for a message the thread does not hold', () => {
    const store = createStore([message('a1', 'kept')]);

    hub.next({
      messageId: 'ghost',
      status: 'streaming',
      body: 'x',
      tokenCount: 1,
      errorCode: null,
    });

    expect(store.messages()).toHaveLength(1);
    expect(store.messages()[0]?.id).toBe('a1');
  });

  it('should carry a failure through to the row', () => {
    const store = createStore([message('a1', '')]);

    hub.next({
      messageId: 'a1',
      status: 'failed',
      body: '',
      tokenCount: null,
      errorCode: 'model_unavailable',
    });

    expect(store.messages()[0]?.status).toBe('failed');
    expect(store.messages()[0]?.errorCode).toBe('model_unavailable');
  });
});
