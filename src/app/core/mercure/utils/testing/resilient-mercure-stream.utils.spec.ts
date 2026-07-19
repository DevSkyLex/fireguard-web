import { of, throwError, type Observable } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import { resilientMercureStream } from '../resilient-mercure-stream.utils';

describe('resilientMercureStream', () => {
  const scheduler = (): TestScheduler =>
    new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

  it('should pass messages straight through while the stream is healthy', () => {
    scheduler().run(({ cold, expectObservable }) => {
      const inner: Observable<string> = cold('a-b-c|');

      expectObservable(resilientMercureStream(() => of(inner))).toBe('a-b-c|');
    });
  });

  // The whole point: the fetch-based transport has no reconnect of its own, so
  // a single blip would otherwise leave the channel silent forever.
  it('should reconnect after a transport failure', () => {
    let attempt = 0;
    const factory = (): Observable<Observable<string>> => {
      attempt += 1;
      return of(attempt === 1 ? throwError(() => new Error('boom')) : of('recovered'));
    };

    scheduler().run(({ expectObservable }) => {
      // 1s of backoff before the second attempt lands.
      expectObservable(resilientMercureStream(factory)).toBe('1000ms (a|)', { a: 'recovered' });
    });

    expect(attempt).toBe(2);
  });

  // Each attempt must re-enter the factory: Mercure tokens are short-lived, so
  // replaying the first subscription would reconnect with an expired JWT.
  it('should ask the factory for a fresh subscription on every attempt', () => {
    let calls = 0;
    const factory = (): Observable<Observable<string>> => {
      calls += 1;
      return of(calls < 3 ? throwError(() => new Error('boom')) : of('ok'));
    };

    scheduler().run(({ expectObservable }) => {
      expectObservable(resilientMercureStream(factory)).toBe('3000ms (a|)', { a: 'ok' });
    });

    expect(calls).toBe(3);
  });

  it('should back off exponentially rather than hammering the hub', () => {
    let calls = 0;
    const factory = (): Observable<Observable<string>> => {
      calls += 1;
      return of(calls < 4 ? throwError(() => new Error('boom')) : of('ok'));
    };

    scheduler().run(({ expectObservable }) => {
      // 1s + 2s + 4s
      expectObservable(resilientMercureStream(factory)).toBe('7000ms (a|)', { a: 'ok' });
    });
  });

  // A hub that is genuinely down must eventually surface, not retry forever.
  it('should give up after the attempt ceiling', () => {
    const factory = (): Observable<Observable<string>> =>
      of(throwError(() => new Error('Mercure stream connection error')));

    scheduler().run(({ expectObservable }) => {
      // 1+2+4+8+16+30+30+30 seconds of backoff, then the error propagates.
      expectObservable(resilientMercureStream(factory)).toBe(
        '121000ms #',
        undefined,
        new Error('Mercure stream connection error'),
      );
    });
  });
});
