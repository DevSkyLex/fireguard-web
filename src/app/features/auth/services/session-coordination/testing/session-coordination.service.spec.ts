import { DOCUMENT, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SessionCoordinationService } from '../session-coordination.service';

class FakeChannel {
  static channels = new Set<FakeChannel>();
  receiveMessage: ((event: MessageEvent<unknown>) => void) | null = null;
  addEventListener = vi.fn(
    (_event: string, listener: (event: MessageEvent<unknown>) => void): void => {
      this.receiveMessage = listener;
    },
  );
  postMessage = vi.fn((value: unknown): void => {
    for (const channel of FakeChannel.channels)
      if (channel !== this) channel.receiveMessage?.({ data: value } as MessageEvent<unknown>);
  });
  close = vi.fn((): void => {
    FakeChannel.channels.delete(this);
  });
  constructor() {
    FakeChannel.channels.add(this);
  }
}

const getChannel = (): FakeChannel => {
  const channel = FakeChannel.channels.values().next().value;
  if (!channel) throw new Error('Expected a registered browser channel');
  return channel;
};

describe('SessionCoordinationService', () => {
  let target: EventTarget & {
    BroadcastChannel?: typeof FakeChannel;
    localStorage: { setItem: ReturnType<typeof vi.fn> };
    crypto: { randomUUID: ReturnType<typeof vi.fn> };
  };
  beforeEach(() => {
    target = Object.assign(new EventTarget(), {
      BroadcastChannel: FakeChannel,
      localStorage: { setItem: vi.fn() },
      crypto: { randomUUID: vi.fn(() => 'event-identity') },
    });
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: { defaultView: target } },
      ],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    FakeChannel.channels.clear();
  });
  const storage = (value: unknown, key = 'fireguard-session-invalidation'): void => {
    target.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(value) }));
  };

  it('publishes only an ephemeral invalidation identity on both transports', () => {
    const service = TestBed.inject(SessionCoordinationService);
    const listener = vi.fn();
    service.subscribe(listener);
    service.publish();
    const channel = getChannel();
    expect(channel.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'invalidate',
      id: 'event-identity',
    });
    expect(target.localStorage.setItem).toHaveBeenCalledExactlyOnceWith(
      'fireguard-session-invalidation',
      '{"type":"invalidate","id":"event-identity"}',
    );
    expect(listener).not.toHaveBeenCalled();
  });

  it('invalidates once when the same remote event arrives through channel and storage', () => {
    const service = TestBed.inject(SessionCoordinationService);
    const listener = vi.fn();
    service.subscribe(listener);
    const event = { type: 'invalidate', id: 'remote-1' };
    getChannel().receiveMessage?.({ data: event } as MessageEvent<unknown>);
    storage(event);
    expect(listener).toHaveBeenCalledOnce();
    expect(target.localStorage.setItem).not.toHaveBeenCalled();
  });

  it('uses storage when BroadcastChannel is unavailable', () => {
    delete target.BroadcastChannel;
    const service = TestBed.inject(SessionCoordinationService);
    const listener = vi.fn();
    service.subscribe(listener);
    storage({ type: 'invalidate', id: 'remote-1' });
    expect(listener).toHaveBeenCalledOnce();
    service.publish();
    expect(target.localStorage.setItem).toHaveBeenCalledOnce();
  });

  it('keeps local auth usable when browser transports are blocked', () => {
    Reflect.deleteProperty(target.crypto, 'randomUUID');
    target.BroadcastChannel = vi.fn(function (): never {
      throw new Error('blocked');
    }) as unknown as typeof FakeChannel;
    target.localStorage.setItem.mockImplementation(() => {
      throw new Error('blocked');
    });
    const service = TestBed.inject(SessionCoordinationService);
    expect(() => service.publish()).not.toThrow();
  });

  it.each([
    null,
    'text',
    {},
    { type: 'login', id: 'remote' },
    { type: 'invalidate', id: '' },
    { type: 'invalidate', id: 'x'.repeat(101) },
  ])('ignores foreign or malformed events: %j', (value) => {
    const service = TestBed.inject(SessionCoordinationService);
    const listener = vi.fn();
    service.subscribe(listener);
    storage(value);
    expect(listener).not.toHaveBeenCalled();
  });

  it('removes subscriptions and browser listeners on destruction', () => {
    const service = TestBed.inject(SessionCoordinationService);
    const listener = vi.fn();
    service.subscribe(listener)();
    storage({ type: 'invalidate', id: 'remote-1' });
    expect(listener).not.toHaveBeenCalled();
    service.subscribe(listener);
    const channel = getChannel();
    TestBed.resetTestingModule();
    storage({ type: 'invalidate', id: 'remote-2' });
    expect(listener).not.toHaveBeenCalled();
    expect(channel.close).toHaveBeenCalledOnce();
  });

  it('does not touch browser transports during SSR', () => {
    TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
    const service = TestBed.inject(SessionCoordinationService);
    const listener = vi.fn();
    service.subscribe(listener);
    service.publish();
    storage({ type: 'invalidate', id: 'remote-1' });
    expect(FakeChannel.channels.size).toBe(0);
    expect(target.localStorage.setItem).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });
});
