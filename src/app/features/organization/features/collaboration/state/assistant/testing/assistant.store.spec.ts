import { signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { CookieService } from '@core/cookie';
import { MercureService } from '@core/mercure';
import { OrganizationPermissionService } from '@features/organization/access';
import { AssistantService } from '@features/organization/features/collaboration/data-access';
import type {
  AssistantFrame,
  AssistantMessageOutput,
  AssistantThreadDetailOutput,
} from '@features/organization/features/collaboration/models';
import { ORGANIZATION_CONTEXT_PORT } from '@features/organization/ports';
import { AssistantStore, type AssistantStoreType } from '../assistant.store';

/** A turn, with only the fields a test cares about spelled out. */
function message(
  id: string,
  role: string,
  overrides: Partial<AssistantMessageOutput> = {},
): AssistantMessageOutput {
  return {
    id,
    threadId: 'thread-1',
    organizationId: 'org-1',
    role,
    body: role === 'user' ? 'question' : '',
    status: role === 'user' ? 'complete' : 'pending',
    createdAt: '2026-07-22T10:00:00+00:00',
    ...overrides,
  };
}

/** A thread read carrying one page. */
function detail(
  messages: readonly AssistantMessageOutput[],
  page: number,
  total: number,
): AssistantThreadDetailOutput {
  return {
    '@id': '/api/assistant/threads/thread-1',
    '@type': 'AssistantThread',
    id: 'thread-1',
    organizationId: 'org-1',
    memberId: 'mem-1',
    createdAt: '2026-07-22T09:00:00+00:00',
    updatedAt: '2026-07-22T09:00:00+00:00',
    messages,
    messagesPage: page,
    messagesItemsPerPage: 50,
    messagesTotal: total,
  } as AssistantThreadDetailOutput;
}

describe('AssistantStore', () => {
  let service: {
    startThread: ReturnType<typeof vi.fn>;
    getThread: ReturnType<typeof vi.fn>;
    ask: ReturnType<typeof vi.fn>;
    getSubscription: ReturnType<typeof vi.fn>;
  };
  let cookies: {
    getCookie: ReturnType<typeof vi.fn>;
    setCookie: ReturnType<typeof vi.fn>;
    deleteCookie: ReturnType<typeof vi.fn>;
  };
  let frames: Subject<AssistantFrame>;
  let organization: WritableSignal<string | null>;
  let granted: boolean;

  function createStore(): AssistantStoreType {
    TestBed.configureTestingModule({
      providers: [
        AssistantStore,
        { provide: AssistantService, useValue: service },
        { provide: CookieService, useValue: cookies },
        { provide: MercureService, useValue: { subscribe: () => frames.asObservable() } },
        {
          provide: OrganizationPermissionService,
          useValue: { hasPermission: (): boolean => granted },
        },
        {
          provide: ORGANIZATION_CONTEXT_PORT,
          useValue: { selectedOrganizationId: organization.asReadonly() },
        },
      ],
    });

    const store: AssistantStoreType = TestBed.inject(AssistantStore);

    // `resume` is wired from an onInit hook reading a signal.
    TestBed.tick();

    return store;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    frames = new Subject<AssistantFrame>();
    granted = true;
    organization = signal<string | null>('org-1');
    service = {
      startThread: vi.fn().mockReturnValue(of({ id: 'thread-1' })),
      getThread: vi.fn().mockReturnValue(of(detail([], 1, 0))),
      ask: vi.fn().mockReturnValue(
        of({
          threadId: 'thread-1',
          organizationId: 'org-1',
          userMessage: message('m-user', 'user'),
          assistantMessage: message('m-bot', 'assistant'),
        }),
      ),
      getSubscription: vi.fn().mockReturnValue(of({ topic: '/t/thread-1', token: 'jwt' })),
    };
    cookies = {
      getCookie: vi.fn().mockReturnValue(null),
      setCookie: vi.fn(),
      deleteCookie: vi.fn(),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('creates no thread until the first question is asked', () => {
    const store: AssistantStoreType = createStore();

    expect(service.startThread).not.toHaveBeenCalled();
    expect(store.threadId()).toBeNull();
  });

  it('creates the thread on the first question, remembers it, and reuses it after', () => {
    const store: AssistantStoreType = createStore();

    store.ask('first');
    store.ask('second');

    expect(service.startThread).toHaveBeenCalledTimes(1);
    expect(cookies.setCookie).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'fg-assistant-thread-org-1', value: 'thread-1' }),
    );
    expect(store.threadId()).toBe('thread-1');
    expect(service.ask).toHaveBeenCalledTimes(2);
  });

  it('appends both turns from the ask response and waits on the reply', () => {
    const store: AssistantStoreType = createStore();

    store.ask('first');

    expect(store.messages().map((m: AssistantMessageOutput) => m.id)).toEqual(['m-user', 'm-bot']);
    expect(store.generatingMessageId()).toBe('m-bot');
    expect(store.isGenerating()).toBe(true);
  });

  it('refuses to ask without the assistant permission', () => {
    granted = false;

    const store: AssistantStoreType = createStore();

    store.ask('first');

    expect(store.isAvailable()).toBe(false);
    expect(service.startThread).not.toHaveBeenCalled();
    expect(service.ask).not.toHaveBeenCalled();
  });

  it('replaces the reply body from each frame and settles on complete', () => {
    const store: AssistantStoreType = createStore();
    store.ask('first');
    // The subscription is established through `timer(0, …)`, so it exists only
    // after the scheduler has run once.
    vi.advanceTimersByTime(1);

    frames.next({
      messageId: 'm-bot',
      status: 'streaming',
      body: 'Par',
      tokenCount: null,
      errorCode: null,
    });

    expect(store.messages()[1]?.body).toBe('Par');
    expect(store.isGenerating()).toBe(true);

    // The frame carries the whole body, not a delta.
    frames.next({
      messageId: 'm-bot',
      status: 'complete',
      body: 'Partial then whole',
      tokenCount: 12,
      errorCode: null,
    });

    expect(store.messages()[1]?.body).toBe('Partial then whole');
    expect(store.messages()[1]?.tokenCount).toBe(12);
    expect(store.isGenerating()).toBe(false);
  });

  it('flags a generation that goes quiet, and re-arms the watchdog on every frame', () => {
    const store: AssistantStoreType = createStore();
    store.ask('first');
    vi.advanceTimersByTime(1);

    vi.advanceTimersByTime(89_000);
    expect(store.generationStalled()).toBe(false);

    frames.next({
      messageId: 'm-bot',
      status: 'streaming',
      body: 'still going',
      tokenCount: null,
      errorCode: null,
    });

    // Had the timer not been re-armed, this would already have tripped.
    vi.advanceTimersByTime(89_000);
    expect(store.generationStalled()).toBe(false);

    vi.advanceTimersByTime(2_000);
    expect(store.generationStalled()).toBe(true);
  });

  it('marks a dismissed generation failed and stops waiting on it', () => {
    const store: AssistantStoreType = createStore();
    store.ask('first');
    vi.advanceTimersByTime(91_000);

    store.dismissStalled();

    expect(store.messages()[1]?.status).toBe('failed');
    expect(store.messages()[1]?.errorCode).toBe('client_stalled');
    expect(store.generationStalled()).toBe(false);
    expect(store.isGenerating()).toBe(false);
  });

  it('reads the last message page of a remembered thread', () => {
    cookies.getCookie.mockReturnValue('thread-1');
    service.getThread
      .mockReturnValueOnce(of(detail([message('old', 'user')], 1, 120)))
      .mockReturnValueOnce(of(detail([message('recent', 'user')], 3, 120)));

    const store: AssistantStoreType = createStore();

    // 120 messages at 50 per page: page 1 to learn the total, then page 3.
    expect(service.getThread).toHaveBeenNthCalledWith(1, 'org-1', 'thread-1');
    expect(service.getThread).toHaveBeenNthCalledWith(2, 'org-1', 'thread-1', 3);
    expect(store.messages().map((m: AssistantMessageOutput) => m.id)).toEqual(['recent']);
    expect(store.hasEarlierMessages()).toBe(true);
  });

  it('asks only once when the remembered thread fits on a single page', () => {
    cookies.getCookie.mockReturnValue('thread-1');
    service.getThread.mockReturnValue(of(detail([message('only', 'user')], 1, 1)));

    const store: AssistantStoreType = createStore();

    expect(service.getThread).toHaveBeenCalledTimes(1);
    expect(store.hasEarlierMessages()).toBe(false);
  });

  it('forgets a remembered thread the server no longer has', () => {
    cookies.getCookie.mockReturnValue('thread-gone');
    service.getThread.mockReturnValue(
      throwError(() => ({
        '@id': '/errors/404',
        '@type': 'hydra:Error',
        status: 404,
        type: '/errors/404',
        title: 'Not Found',
        detail: 'Thread not found.',
      })),
    );

    const store: AssistantStoreType = createStore();

    expect(cookies.deleteCookie).toHaveBeenCalledWith('fg-assistant-thread-org-1');
    expect(store.threadId()).toBeNull();
    expect(store.loadError()).toBeNull();
  });

  it('claims and releases the contextual column', () => {
    const store: AssistantStoreType = createStore();

    store.openPanel();
    store.openPanel(); // A second open is not a toggle.

    expect(store.panelOpen()).toBe(true);

    store.closePanel();

    expect(store.panelOpen()).toBe(false);
  });

  it('opens and closes the column from a single control', () => {
    const store: AssistantStoreType = createStore();

    store.togglePanel();
    expect(store.panelOpen()).toBe(true);

    store.togglePanel();
    expect(store.panelOpen()).toBe(false);
  });

  it('drops the transcript but keeps the panel open when the organization changes', () => {
    const store: AssistantStoreType = createStore();
    store.openPanel();
    store.ask('first');

    organization.set('org-2');
    TestBed.tick();

    expect(store.messages()).toEqual([]);
    expect(store.threadId()).toBeNull();
    expect(store.panelOpen()).toBe(true);
  });

  // A1: a thread restored mid-generation must adopt its unfinished reply so the
  // watchdog can end the wait — otherwise "Thinking…" shows forever.
  it('adopts an unfinished reply when a thread is restored mid-generation', () => {
    cookies.getCookie.mockReturnValue('thread-1');
    service.getThread.mockReturnValue(
      of(
        detail(
          [message('m-user', 'user'), message('m-bot', 'assistant', { status: 'streaming' })],
          1,
          2,
        ),
      ),
    );

    const store: AssistantStoreType = createStore();

    expect(store.generatingMessageId()).toBe('m-bot');
    expect(store.isGenerating()).toBe(true);
  });

  // A2: a settled frame arriving when nothing is generating must not re-adopt
  // that message as "generating", which would disable the composer forever.
  it('does not re-adopt a completed reply as generating on a duplicate frame', () => {
    const store: AssistantStoreType = createStore();
    store.ask('first');
    vi.advanceTimersByTime(1);

    frames.next({
      messageId: 'm-bot',
      status: 'complete',
      body: 'done',
      tokenCount: 5,
      errorCode: null,
    });
    expect(store.isGenerating()).toBe(false);

    // A late duplicate terminal frame for the same turn.
    frames.next({
      messageId: 'm-bot',
      status: 'complete',
      body: 'done',
      tokenCount: 5,
      errorCode: null,
    });

    expect(store.isGenerating()).toBe(false);
    expect(store.generatingMessageId()).toBeNull();
  });

  // A5: a stall that is really a lost terminal frame is recovered by re-reading
  // the thread, not reported as a failure.
  it('recovers a reply whose terminal frame was lost when the watchdog fires', () => {
    const store: AssistantStoreType = createStore();
    store.ask('first');
    vi.advanceTimersByTime(1);

    // By the time the watchdog fires, the server holds the finished reply.
    service.getThread.mockReturnValue(
      of(
        detail(
          [
            message('m-user', 'user'),
            message('m-bot', 'assistant', { status: 'complete', body: 'recovered answer' }),
          ],
          1,
          2,
        ),
      ),
    );

    vi.advanceTimersByTime(91_000);

    expect(store.generationStalled()).toBe(false);
    expect(store.isGenerating()).toBe(false);
    expect(store.messages()[1]?.body).toBe('recovered answer');
  });

  // A6: starting over must close the previous thread's socket, not leak it.
  it('closes the realtime connection when a new thread is started', () => {
    const store: AssistantStoreType = createStore();
    store.ask('first');
    vi.advanceTimersByTime(1);

    expect(frames.observed).toBe(true);

    store.startNewThread();

    expect(frames.observed).toBe(false);
    expect(store.messages()).toEqual([]);
    expect(store.threadId()).toBeNull();
  });
});
