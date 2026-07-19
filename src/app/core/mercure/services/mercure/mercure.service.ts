import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { EMPTY, Observable, Subscriber } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * Raised whenever the hub connection ends for any reason other than the caller
 * unsubscribing — a rejected token, a dropped socket, or a clean close by the
 * hub. All three are surfaced as an error so `resilientMercureStream` retries
 * with a freshly minted token.
 *
 * @since 1.0.0
 */
const CONNECTION_ERROR = 'Mercure stream connection error';

/**
 * MercureService
 * @class MercureService
 *
 * @description
 * Subscribes to Mercure topics over Server-Sent Events.
 *
 * Uses `fetch` rather than `EventSource` because the subscriber JWT must travel
 * in an `Authorization` header: `EventSource` cannot set headers, which forces
 * the token into the query string where it leaks into hub access logs, browser
 * history, and `Referer`. The trade-off is that `fetch` has no built-in
 * reconnect — deliberately so, since each reconnect needs a fresh short-lived
 * token. Reconnection is owned by `resilientMercureStream`, which re-invokes the
 * subscription factory per attempt.
 *
 * @version 2.0.0
 *
 * @example
 * ```typescript
 * const mercureService: MercureService = inject<MercureService>(MercureService);
 * const subscription = mercureService.subscribe<MyMessageType>('my-topic', 'my-jwt-token').subscribe(message => {
 *  console.log('Received Mercure message:', message);
 * });
 *
 * // To unsubscribe later
 * subscription.unsubscribe();
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class MercureService {
  //#region Properties
  /**
   * Property config
   * @readonly
   *
   * @description
   * The environment configuration injected from the ENV_CONFIG token.
   * Used to access the Mercure hub URL and other related settings.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EnvironmentConfig}
   */
  private readonly config: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);

  /**
   * Property platformId
   * @readonly
   *
   * @description
   * The platform ID injected from Angular's PLATFORM_ID token.
   *
   * Used to determine if the code is running in a browser
   * environment, as Mercure relies on Server-Sent Events which
   * are only supported in browsers.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {object}
   */
  private readonly platformId: object = inject<object>(PLATFORM_ID);
  //#endregion

  //#region Public Methods
  /**
   * Method subscribe
   * @method subscribe
   *
   * @description
   * Subscribes to a Mercure topic using Server-Sent Events (SSE).
   * Only works in browser environments. Returns an observable that emits parsed messages from the Mercure hub.
   *
   * The observable errors — rather than completing — whenever the connection
   * ends without the caller unsubscribing, so the retry layer can reconnect.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} topic - The Mercure topic to subscribe to.
   * @param {string} token - The JWT token for authentication with the Mercure hub.
   *
   * @return {Observable<T>} An observable that emits messages of type T received from the Mercure hub.
   */
  public subscribe<T>(topic: string, token: string): Observable<T> {
    if (!isPlatformBrowser(this.platformId)) return EMPTY;

    return new Observable<T>((subscriber: Subscriber<T>) => {
      const url: URL = new URL(this.config.mercureHubUrl);
      url.searchParams.append('topic', topic);

      const controller: AbortController = new AbortController();

      void this.stream<T>(url.toString(), token, controller, subscriber);

      return () => controller.abort();
    });
  }
  //#endregion

  //#region Private Methods
  /**
   * Method stream
   * @method stream
   *
   * @description
   * Opens the SSE connection and pumps decoded frames into the subscriber until
   * the caller unsubscribes. Never rejects: every failure is routed to
   * `subscriber.error`, except an abort we triggered ourselves, which is the
   * normal teardown path and must stay silent.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} url - The fully built hub URL, topic included.
   * @param {string} token - The subscriber JWT, sent as a bearer credential.
   * @param {AbortController} controller - Aborted when the caller unsubscribes.
   * @param {Subscriber<T>} subscriber - The RxJS subscriber to feed.
   *
   * @return {Promise<void>} Resolves once the connection is fully torn down.
   */
  private async stream<T>(
    url: string,
    token: string,
    controller: AbortController,
    subscriber: Subscriber<T>,
  ): Promise<void> {
    try {
      const response: Response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        // The credential travels in the header; no ambient cookie should reach
        // the hub, which lives on a different origin than the API.
        credentials: 'omit',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
      });

      if (!response.ok || null === response.body) {
        throw new Error(`Mercure hub rejected the subscription (HTTP ${response.status})`);
      }

      await this.pump<T>(response.body, subscriber);

      // The hub closed the stream. Treat it as a failure so the retry layer
      // reconnects; completing here would leave the channel permanently silent.
      throw new Error(CONNECTION_ERROR);
    } catch (error: unknown) {
      if (controller.signal.aborted) return;

      subscriber.error(error instanceof Error ? error : new Error(CONNECTION_ERROR));
    }
  }

  /**
   * Method pump
   * @method pump
   *
   * @description
   * Reads the response body and splits it into SSE frames on the blank-line
   * boundary, decoding incrementally because a chunk can cut a frame — or a
   * multi-byte character — in half.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {ReadableStream<Uint8Array>} body - The response body stream.
   * @param {Subscriber<T>} subscriber - The RxJS subscriber to feed.
   *
   * @return {Promise<void>} Resolves when the hub closes the stream.
   */
  private async pump<T>(
    body: ReadableStream<Uint8Array>,
    subscriber: Subscriber<T>,
  ): Promise<void> {
    const reader: ReadableStreamDefaultReader<Uint8Array> = body.getReader();
    const decoder: TextDecoder = new TextDecoder();
    let buffer = '';

    for (;;) {
      // Sequential by nature: an SSE body is an open-ended stream, so chunks
      // can only be read one after another. There is no set of promises to
      // parallelise here, which is what the rule assumes.
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) return;

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

      let boundary: number = buffer.indexOf('\n\n');
      while (-1 !== boundary) {
        this.emit<T>(buffer.slice(0, boundary), subscriber);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    }
  }

  /**
   * Method emit
   * @method emit
   *
   * @description
   * Parses one SSE frame and emits its payload. Comment frames (the hub's
   * heartbeat) and named events carry no payload for this transport and are
   * skipped — matching the single `message` listener this service used to
   * register on `EventSource`.
   *
   * @access private
   * @since 1.0.0
   *
   * @param {string} frame - One raw SSE frame, without its trailing blank line.
   * @param {Subscriber<T>} subscriber - The RxJS subscriber to feed.
   *
   * @return {void}
   */
  private emit<T>(frame: string, subscriber: Subscriber<T>): void {
    const data: string[] = [];
    let event = 'message';

    for (const line of frame.split('\n')) {
      if ('' === line || line.startsWith(':')) continue;

      const separator: number = line.indexOf(':');
      const field: string = -1 === separator ? line : line.slice(0, separator);
      const rest: string = -1 === separator ? '' : line.slice(separator + 1);
      const value: string = rest.startsWith(' ') ? rest.slice(1) : rest;

      if ('data' === field) data.push(value);
      else if ('event' === field) event = value;
    }

    if ('message' !== event || 0 === data.length) return;

    const payload: string = data.join('\n');

    try {
      subscriber.next(JSON.parse(payload) as T);
    } catch {
      subscriber.error(new Error(`Failed to parse Mercure message: ${payload}`));
    }
  }
  //#endregion
}
