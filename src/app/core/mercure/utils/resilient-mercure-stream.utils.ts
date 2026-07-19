import { defer, throwError, timer, type Observable } from 'rxjs';
import { retry, switchMap } from 'rxjs/operators';

/**
 * How a caller obtains a **fresh** Mercure subscription for one attempt.
 *
 * @since 1.0.0
 */
export type MercureSubscriptionFactory<T> = () => Observable<Observable<T>>;

/** First backoff step; doubles each attempt, capped at 30s. */
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

/** Consecutive failures tolerated before the error reaches the caller. */
const MAX_ATTEMPTS = 8;

/**
 * Function resilientMercureStream
 *
 * @description
 * Keeps a Mercure subscription alive across network failures.
 *
 * It wraps a **factory** rather than retrying an existing stream because
 * Mercure subscriber JWTs expire (see `mercure_subscriber_token_ttl` on the
 * API): replaying the same subscription would reconnect with a token the hub
 * now rejects, so every attempt has to go back through `GET /subscription` for
 * a fresh one. Only the caller knows how.
 *
 * This is also the only thing standing between a network blip and a
 * permanently silent channel. `MercureService` streams over `fetch`, which —
 * unlike `EventSource` — has no reconnect of its own, so nothing else will
 * bring the channel back. Every consumer must therefore go through this
 * helper; subscribing to `MercureService` directly yields a channel that dies
 * on the first blip and stays dead.
 *
 * @param {MercureSubscriptionFactory<T>} factory - Produces a fresh subscription per attempt.
 *
 * @returns {Observable<T>} A stream that survives transport failures.
 */
export function resilientMercureStream<T>(factory: MercureSubscriptionFactory<T>): Observable<T> {
  return defer(factory).pipe(
    switchMap((stream: Observable<T>) => stream),
    retry({
      count: MAX_ATTEMPTS,
      delay: (error: unknown, attempt: number): Observable<number> => {
        if (attempt > MAX_ATTEMPTS) return throwError(() => error);
        return timer(Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS));
      },
      resetOnSuccess: true,
    }),
  );
}
