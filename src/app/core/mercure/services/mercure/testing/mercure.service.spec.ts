import { ErrorHandler, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { Subscription } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import { MercureService } from '../mercure.service';

/** Minimal EventSource stand-in whose lifecycle a test drives by hand. */
class FakeEventSource {
  public static instances: FakeEventSource[] = [];

  public static readonly CONNECTING = 0;

  public static readonly OPEN = 1;

  public static readonly CLOSED = 2;

  public readyState: number = FakeEventSource.CONNECTING;

  public closed = false;

  private readonly listeners = new Map<string, ((event: unknown) => void)[]>();

  public constructor(public readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  public addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public close(): void {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }

  /** Fires a listener as the browser would. */
  public emit(type: string, event: unknown = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

describe('MercureService', () => {
  const hubUrl = 'https://hub.test.com/.well-known/mercure';
  let originalEventSource: unknown;

  function createService(platform: string = 'browser'): MercureService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platform },
        {
          provide: ENV_CONFIG,
          useValue: { apiUrl: 'https://api.test.com', mercureHubUrl: hubUrl },
        },
      ],
    });

    return TestBed.inject(MercureService);
  }

  function latest(): FakeEventSource {
    const source = FakeEventSource.instances.at(-1);

    if (!source) throw new Error('No EventSource was opened.');

    return source;
  }

  beforeEach(() => {
    FakeEventSource.instances = [];
    originalEventSource = globalThis.EventSource;
    (globalThis as unknown as { EventSource: unknown }).EventSource = FakeEventSource;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as unknown as { EventSource: unknown }).EventSource = originalEventSource;
    TestBed.resetTestingModule();
  });

  it('should not open a connection on the server', () => {
    const service = createService('server');
    const received: unknown[] = [];

    service.subscribe('topic-a', 'token').subscribe((value) => received.push(value));

    expect(FakeEventSource.instances).toHaveLength(0);
    expect(received).toEqual([]);
  });

  it('should carry the topic and the token in the hub URL', () => {
    const service = createService();
    service.subscribe('topic-a', 'token-1').subscribe();

    const url = new URL(latest().url);

    expect(url.searchParams.get('topic')).toBe('topic-a');
    // EventSource cannot send headers, so the JWT has to travel as a param.
    expect(url.searchParams.get('authorization')).toBe('token-1');
  });

  it('should deliver parsed frames to every subscriber of a topic', () => {
    const service = createService();
    const first: unknown[] = [];
    const second: unknown[] = [];

    service.subscribe('topic-a', 'token').subscribe((value) => first.push(value));
    service.subscribe('topic-a', 'token').subscribe((value) => second.push(value));

    latest().emit('message', { data: '{"id":"m1"}' });

    expect(first).toEqual([{ id: 'm1' }]);
    expect(second).toEqual([{ id: 'm1' }]);
  });

  it('should open one connection per topic however many subscribers there are', () => {
    const service = createService();

    service.subscribe('topic-a', 'token').subscribe();
    service.subscribe('topic-a', 'token').subscribe();
    service.subscribe('topic-b', 'token').subscribe();

    // Browsers cap concurrent SSE connections per origin at around six, so
    // sharing is a requirement rather than an optimization.
    expect(FakeEventSource.instances).toHaveLength(2);
  });

  it('should keep the connection open until the last subscriber leaves', () => {
    const service = createService();
    const first: Subscription = service.subscribe('topic-a', 'token').subscribe();
    const second: Subscription = service.subscribe('topic-a', 'token').subscribe();
    const source = latest();

    first.unsubscribe();
    expect(source.closed).toBe(false);

    second.unsubscribe();
    expect(source.closed).toBe(true);
  });

  it('should drop an unparseable frame instead of ending the stream', () => {
    const service = createService();
    const errorHandler = TestBed.inject(ErrorHandler);
    const reported = vi.spyOn(errorHandler, 'handleError').mockImplementation(() => undefined);
    const received: unknown[] = [];
    let completed = false;
    let errored = false;

    service.subscribe('topic-a', 'token').subscribe({
      next: (value) => received.push(value),
      error: () => (errored = true),
      complete: () => (completed = true),
    });

    latest().emit('message', { data: 'not json' });
    latest().emit('message', { data: '{"id":"m1"}' });

    // One bad payload used to terminate every subscriber.
    expect(errored).toBe(false);
    expect(completed).toBe(false);
    expect(received).toEqual([{ id: 'm1' }]);
    // Reported, so a hub sending garbage is still visible.
    expect(reported).toHaveBeenCalled();
  });

  it('should leave a still-connecting source to the browser', () => {
    const service = createService();
    service.subscribe('topic-a', 'token').subscribe();
    const source = latest();
    source.readyState = FakeEventSource.CONNECTING;

    source.emit('error');
    vi.advanceTimersByTime(60_000);

    // Closing here would cancel the browser's own retry — the bug this
    // service used to have.
    expect(source.closed).toBe(false);
    expect(FakeEventSource.instances).toHaveLength(1);
    expect(service.status().get('topic-a')).toBe('reconnecting');
  });

  it('should reopen a closed source after a backoff delay', () => {
    const service = createService();
    service.subscribe('topic-a', 'token').subscribe();
    const source = latest();
    source.readyState = FakeEventSource.CLOSED;

    source.emit('error');
    expect(FakeEventSource.instances).toHaveLength(1);

    vi.advanceTimersByTime(60_000);

    expect(FakeEventSource.instances).toHaveLength(2);
    expect(service.status().get('topic-a')).toBe('reconnecting');
  });

  it('should reconnect with the freshest token, not the first one', () => {
    const service = createService();
    service.subscribe('topic-a', 'token-1').subscribe();
    // A second subscriber arrives with a rotated token.
    service.subscribe('topic-a', 'token-2').subscribe();

    const source = latest();
    source.readyState = FakeEventSource.CLOSED;
    source.emit('error');
    vi.advanceTimersByTime(60_000);

    // The subscriber JWT is short-lived; reusing the first one would reconnect
    // with an expired credential and loop.
    expect(new URL(latest().url).searchParams.get('authorization')).toBe('token-2');
  });

  it('should not reconnect a topic whose subscribers have all left', () => {
    const service = createService();
    const subscription = service.subscribe('topic-a', 'token').subscribe();
    const source = latest();

    source.readyState = FakeEventSource.CLOSED;
    source.emit('error');
    subscription.unsubscribe();

    vi.advanceTimersByTime(60_000);

    expect(FakeEventSource.instances).toHaveLength(1);
    expect(service.status().has('topic-a')).toBe(false);
  });

  it('should report a topic as connected only once it is open', () => {
    const service = createService();
    service.subscribe('topic-a', 'token').subscribe();

    expect(service.isConnected('topic-a')).toBe(false);
    expect(service.status().get('topic-a')).toBe('connecting');

    latest().emit('open');

    expect(service.isConnected('topic-a')).toBe(true);
  });

  it('should forget a topic once it is released', () => {
    const service = createService();
    const subscription = service.subscribe('topic-a', 'token').subscribe();
    latest().emit('open');

    subscription.unsubscribe();

    expect(service.status().has('topic-a')).toBe(false);
    expect(service.isConnected('topic-a')).toBe(false);
  });
});
