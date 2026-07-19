import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, type Subscription } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { MercureService } from '../mercure.service';

const HUB = 'https://mercure.test.com/.well-known/mercure';
const TOKEN = 'subscriber-jwt';
const TOPIC = '/users/42/notifications';

const encoder = new TextEncoder();

/** Builds a response body; leaving it open lets a test observe teardown. */
const bodyOf = (chunks: string[], keepOpen = false): ReadableStream<Uint8Array> =>
  new ReadableStream<Uint8Array>({
    start(controller: ReadableStreamDefaultController<Uint8Array>) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      if (!keepOpen) controller.close();
    },
  });

const okResponse = (body: ReadableStream<Uint8Array>): Response =>
  ({ ok: true, status: 200, body }) as unknown as Response;

/** Yields to the macrotask queue so the service's async read loop drains. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('MercureService', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  const createService = (platform: 'browser' | 'server' = 'browser'): MercureService => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        { provide: ENV_CONFIG, useValue: { apiUrl: 'https://api.test.com', mercureHubUrl: HUB } },
      ],
    });

    return TestBed.inject(MercureService);
  };

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(createService()).toBeTruthy();
  });

  it('should not open a connection during server-side rendering', async () => {
    const service = createService('server');

    const emissions: unknown[] = [];
    service.subscribe(TOPIC, TOKEN).subscribe((value) => emissions.push(value));
    await flush();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(emissions).toEqual([]);
  });

  it('should send the subscriber token as a bearer header', async () => {
    fetchMock.mockResolvedValue(okResponse(bodyOf([])));
    const service = createService();

    service.subscribe(TOPIC, TOKEN).subscribe({ error: () => undefined });
    await flush();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`);
  });

  // The regression this transport exists to prevent: a token in the query
  // string leaks into hub access logs, browser history, and Referer headers.
  it('should never put the token in the URL', async () => {
    fetchMock.mockResolvedValue(okResponse(bodyOf([])));
    const service = createService();

    service.subscribe(TOPIC, TOKEN).subscribe({ error: () => undefined });
    await flush();

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).not.toContain(TOKEN);
    expect(new URL(url).searchParams.get('authorization')).toBeNull();
    expect(new URL(url).searchParams.get('topic')).toBe(TOPIC);
  });

  it('should not send ambient cookies to the hub', async () => {
    fetchMock.mockResolvedValue(okResponse(bodyOf([])));
    const service = createService();

    service.subscribe(TOPIC, TOKEN).subscribe({ error: () => undefined });
    await flush();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe('omit');
  });

  it('should emit parsed messages', async () => {
    fetchMock.mockResolvedValue(
      okResponse(bodyOf(['data: {"id":"a"}\n\n', 'data: {"id":"b"}\n\n'], true)),
    );
    const service = createService();

    const emissions: unknown[] = [];
    service.subscribe(TOPIC, TOKEN).subscribe({ next: (v) => emissions.push(v) });
    await flush();

    expect(emissions).toEqual([{ id: 'a' }, { id: 'b' }]);
  });

  it('should reassemble a message split across chunks', async () => {
    fetchMock.mockResolvedValue(okResponse(bodyOf(['data: {"id"', ':"split"}\n\n'], true)));
    const service = createService();

    const emissions: unknown[] = [];
    service.subscribe(TOPIC, TOKEN).subscribe({ next: (v) => emissions.push(v) });
    await flush();

    expect(emissions).toEqual([{ id: 'split' }]);
  });

  it('should ignore heartbeat comment frames', async () => {
    fetchMock.mockResolvedValue(okResponse(bodyOf([':\n\n', 'data: {"id":"a"}\n\n'], true)));
    const service = createService();

    const emissions: unknown[] = [];
    service.subscribe(TOPIC, TOKEN).subscribe({ next: (v) => emissions.push(v) });
    await flush();

    expect(emissions).toEqual([{ id: 'a' }]);
  });

  it('should error when the hub rejects the token', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, body: null } as unknown as Response);
    const service = createService();

    await expect(firstValueFrom(service.subscribe(TOPIC, TOKEN))).rejects.toThrow('HTTP 401');
  });

  // A clean close must surface as an error, otherwise resilientMercureStream
  // completes instead of reconnecting and the channel goes silent for good.
  it('should error rather than complete when the hub closes the stream', async () => {
    fetchMock.mockResolvedValue(okResponse(bodyOf(['data: {"id":"a"}\n\n'])));
    const service = createService();

    const seen: { next: unknown[]; error?: Error; completed: boolean } = {
      next: [],
      completed: false,
    };
    service.subscribe(TOPIC, TOKEN).subscribe({
      next: (v) => seen.next.push(v),
      error: (e: Error) => (seen.error = e),
      complete: () => (seen.completed = true),
    });
    await flush();

    expect(seen.next).toEqual([{ id: 'a' }]);
    expect(seen.completed).toBe(false);
    expect(seen.error?.message).toBe('Mercure stream connection error');
  });

  it('should abort the request when the caller unsubscribes', async () => {
    fetchMock.mockResolvedValue(okResponse(bodyOf([], true)));
    const service = createService();

    const errors: Error[] = [];
    const subscription: Subscription = service
      .subscribe(TOPIC, TOKEN)
      .subscribe({ error: (e: Error) => errors.push(e) });
    await flush();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.signal?.aborted).toBe(false);

    subscription.unsubscribe();
    await flush();

    expect(init.signal?.aborted).toBe(true);
    // Teardown is not a failure; it must not reach the retry layer.
    expect(errors).toEqual([]);
  });
});
