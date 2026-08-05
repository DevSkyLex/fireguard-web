import { isPlatformBrowser } from '@angular/common';
import {
  ErrorHandler,
  inject,
  Service,
  PLATFORM_ID,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { EMPTY, Observable, type Subscriber } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { EnvironmentConfig } from '@core/config/environment/environment-config.interface';
import {
  MERCURE_RECONNECT_BASE_DELAY_MS,
  MERCURE_RECONNECT_MAX_DELAY_MS,
} from '@core/mercure/constants';
import type { MercureConnectionStatus } from '@core/mercure/models';

/**
 * One topic's shared connection and the subscribers riding on it.
 */
interface TopicConnection {
  eventSource: EventSource | null;
  /** Latest token seen for this topic; reconnects use it, not the first one. */
  token: string;
  subscribers: Set<Subscriber<never>>;
  /** Consecutive failed attempts, reset by a successful open. */
  attempt: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * MercureService
 * @class MercureService
 *
 * @description
 * Subscribes to Mercure topics over Server-Sent Events.
 *
 * Three properties matter to callers:
 *
 * **It survives failure.** An `error` from an `EventSource` covers everything
 * from a one-second network blip to a rejected token. Closing the source on
 * any of them — as this service used to — also cancels the browser's own
 * exponential retry, so a single dropped connection ended real-time updates
 * for the lifetime of the page. Now a still-`CONNECTING` source is left to the
 * browser, and only a `CLOSED` one is reconnected here, with capped jittered
 * backoff and no attempt limit.
 *
 * **One connection per topic.** Subscribers are ref-counted: the hub is
 * contacted once however many callers want the same topic, and the source is
 * closed when the last one leaves. Browsers cap concurrent SSE connections per
 * origin at around six on HTTP/1.1, so this is a hard requirement once more
 * than one feature subscribes.
 *
 * **A bad frame is not fatal.** Unparseable data is warned about and skipped
 * rather than terminating the stream.
 *
 * There is deliberately no `Last-Event-ID` resume: this deployment configures
 * no Mercure transport and the publishers set no update ids, so there is
 * nothing to resume from. Consumers that must not miss updates should refetch
 * on reconnect, watching {@link status}.
 *
 * @version 2.0.0
 *
 * @example
 * ```typescript
 * const mercure: MercureService = inject(MercureService);
 * const subscription = mercure
 *   .subscribe<MyMessage>(topic, token)
 *   .subscribe((message) => console.log(message));
 *
 * subscription.unsubscribe();
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class MercureService {
  //#region Properties
  /**
   * Property config
   * @readonly
   *
   * @description
   * Runtime configuration, read for the hub URL.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {EnvironmentConfig}
   */
  private readonly config: EnvironmentConfig = inject<EnvironmentConfig>(ENV_CONFIG);

  /**
   * Property browser
   * @readonly
   *
   * @description
   * Whether Server-Sent Events are available at all.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {boolean}
   */
  private readonly browser: boolean = isPlatformBrowser(inject<object>(PLATFORM_ID));

  /**
   * Property errorHandler
   * @readonly
   *
   * @description
   * Where a malformed frame is reported. The app's sanctioned channel for a
   * problem worth seeing that must not stop anything.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {ErrorHandler}
   */
  private readonly errorHandler: ErrorHandler = inject<ErrorHandler>(ErrorHandler);

  /**
   * Property connections
   * @readonly
   *
   * @description
   * Live connections, keyed by topic.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {Map<string, TopicConnection>}
   */
  private readonly connections: Map<string, TopicConnection> = new Map<string, TopicConnection>();

  /**
   * Property statuses
   * @readonly
   *
   * @description
   * Backing signal of {@link status}.
   *
   * @access private
   * @since 2.0.0
   *
   * @type {WritableSignal<ReadonlyMap<string, MercureConnectionStatus>>}
   */
  private readonly statuses: WritableSignal<ReadonlyMap<string, MercureConnectionStatus>> = signal<
    ReadonlyMap<string, MercureConnectionStatus>
  >(new Map<string, MercureConnectionStatus>());

  /**
   * Property status
   * @readonly
   *
   * @description
   * Connection health per topic. A topic with no entry has no subscriber.
   *
   * Consumers that must not miss updates watch this and refetch when a topic
   * returns to `connected` — this service replays nothing.
   *
   * @access public
   * @since 2.0.0
   *
   * @type {Signal<ReadonlyMap<string, MercureConnectionStatus>>}
   */
  public readonly status: Signal<ReadonlyMap<string, MercureConnectionStatus>> =
    this.statuses.asReadonly();
  //#endregion

  //#region Public Methods
  /**
   * Method subscribe
   * @method subscribe
   *
   * @description
   * Streams a topic's updates. Several callers may subscribe to the same topic
   * without opening more than one connection.
   *
   * The returned observable never errors on a connection problem — it goes
   * quiet while the connection is being re-established and resumes on its own.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {string} topic - Mercure topic.
   * @param {string} token - Subscriber JWT authorizing that topic.
   *
   * @return {Observable<T>} Parsed updates for the topic.
   */
  public subscribe<T>(topic: string, token: string): Observable<T> {
    if (!this.browser) return EMPTY;

    return new Observable<T>((subscriber: Subscriber<T>) => {
      const connection: TopicConnection = this.acquire(topic, token);
      connection.subscribers.add(subscriber as unknown as Subscriber<never>);

      return () => {
        connection.subscribers.delete(subscriber as unknown as Subscriber<never>);

        if (connection.subscribers.size === 0) this.release(topic);
      };
    });
  }

  /**
   * Method isConnected
   * @method isConnected
   *
   * @description
   * Whether a topic is currently receiving updates.
   *
   * @access public
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   *
   * @return {boolean} `true` only while the connection is open.
   */
  public isConnected(topic: string): boolean {
    return this.status().get(topic) === 'connected';
  }
  //#endregion

  //#region Connection lifecycle
  /**
   * Method acquire
   * @method acquire
   *
   * @description
   * Returns the topic's connection, opening one if this is the first
   * subscriber. A later subscriber's token replaces the stored one, so a
   * reconnect uses the freshest credentials rather than an expired first
   * token.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   * @param {string} token - Subscriber JWT.
   *
   * @return {TopicConnection} The shared connection.
   */
  private acquire(topic: string, token: string): TopicConnection {
    const existing: TopicConnection | undefined = this.connections.get(topic);

    if (existing) {
      existing.token = token;

      return existing;
    }

    const connection: TopicConnection = {
      eventSource: null,
      token,
      subscribers: new Set<Subscriber<never>>(),
      attempt: 0,
      retryTimer: null,
    };

    this.connections.set(topic, connection);
    this.open(topic, connection);

    return connection;
  }

  /**
   * Method release
   * @method release
   *
   * @description
   * Tears down a topic once its last subscriber leaves.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   *
   * @return {void}
   */
  private release(topic: string): void {
    const connection: TopicConnection | undefined = this.connections.get(topic);

    if (!connection) return;

    if (connection.retryTimer !== null) clearTimeout(connection.retryTimer);
    connection.eventSource?.close();
    this.connections.delete(topic);
    this.setStatus(topic, null);
  }

  /**
   * Method open
   * @method open
   *
   * @description
   * Opens the `EventSource` for a topic and wires its three listeners.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   * @param {TopicConnection} connection - The topic's shared connection.
   *
   * @return {void}
   */
  private open(topic: string, connection: TopicConnection): void {
    const url: URL = new URL(this.config.mercureHubUrl);
    url.searchParams.append('topic', topic);
    // EventSource cannot send headers, so the hub takes the JWT as a query
    // parameter — the one place a token travels in a URL in this app.
    url.searchParams.append('authorization', connection.token);

    this.setStatus(topic, connection.attempt === 0 ? 'connecting' : 'reconnecting');

    const eventSource: EventSource = new EventSource(url.toString());
    connection.eventSource = eventSource;

    eventSource.addEventListener('open', () => {
      connection.attempt = 0;
      this.setStatus(topic, 'connected');
    });

    eventSource.addEventListener('message', (event: MessageEvent) => {
      this.dispatch(topic, connection, event);
    });

    eventSource.addEventListener('error', () => {
      this.handleError(topic, connection, eventSource);
    });
  }

  /**
   * Method dispatch
   * @method dispatch
   *
   * @description
   * Parses one frame and fans it out. A frame that will not parse is dropped
   * with a warning: terminating every subscriber over one bad payload trades a
   * cosmetic problem for a total outage.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   * @param {TopicConnection} connection - The topic's shared connection.
   * @param {MessageEvent} event - Raw frame.
   *
   * @return {void}
   */
  private dispatch(topic: string, connection: TopicConnection, event: MessageEvent): void {
    let data: unknown;

    try {
      data = JSON.parse(event.data as string);
    } catch (error: unknown) {
      // Reported, not swallowed — a hub sending malformed frames is a real
      // problem — but never fatal to the subscribers.
      this.errorHandler.handleError(
        new Error(`Mercure: dropped an unparseable frame on "${topic}".`, { cause: error }),
      );

      return;
    }

    // Iterating the Set directly is deliberate: a subscriber that unsubscribes
    // mid-fanout is skipped, which is what it asked for.
    for (const subscriber of connection.subscribers) {
      subscriber.next(data as never);
    }
  }

  /**
   * Method handleError
   * @method handleError
   *
   * @description
   * Decides who owns the retry.
   *
   * A source still in `CONNECTING` is one the browser is already retrying with
   * its own backoff; touching it — in particular calling `close()` — is what
   * would turn a blip into a permanent outage. Only a `CLOSED` source is ours
   * to reopen.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   * @param {TopicConnection} connection - The topic's shared connection.
   * @param {EventSource} eventSource - The source that failed.
   *
   * @return {void}
   */
  private handleError(topic: string, connection: TopicConnection, eventSource: EventSource): void {
    // A stale source from a previous attempt: ignore it.
    if (connection.eventSource !== eventSource) return;

    this.setStatus(topic, 'reconnecting');

    if (eventSource.readyState !== EventSource.CLOSED) return;

    this.scheduleReconnect(topic, connection);
  }

  /**
   * Method scheduleReconnect
   * @method scheduleReconnect
   *
   * @description
   * Reopens the topic after a capped, jittered delay.
   *
   * The jitter is full rather than partial so that a hub restart does not bring
   * every client back in the same instant.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   * @param {TopicConnection} connection - The topic's shared connection.
   *
   * @return {void}
   */
  private scheduleReconnect(topic: string, connection: TopicConnection): void {
    if (connection.retryTimer !== null) return;

    connection.eventSource?.close();
    connection.eventSource = null;

    const ceiling: number = Math.min(
      MERCURE_RECONNECT_MAX_DELAY_MS,
      MERCURE_RECONNECT_BASE_DELAY_MS * 2 ** connection.attempt,
    );
    const delay: number = Math.random() * ceiling;

    connection.attempt += 1;
    connection.retryTimer = setTimeout(() => {
      connection.retryTimer = null;

      // The last subscriber may have left while we waited.
      if (this.connections.get(topic) !== connection) return;

      this.open(topic, connection);
    }, delay);
  }

  /**
   * Method setStatus
   * @method setStatus
   *
   * @description
   * Publishes a topic's health, or removes it entirely when `null`.
   *
   * @access private
   * @since 2.0.0
   *
   * @param {string} topic - Mercure topic.
   * @param {MercureConnectionStatus | null} status - New status, or `null` to forget the topic.
   *
   * @return {void}
   */
  private setStatus(topic: string, status: MercureConnectionStatus | null): void {
    this.statuses.update(
      (
        current: ReadonlyMap<string, MercureConnectionStatus>,
      ): ReadonlyMap<string, MercureConnectionStatus> => {
        const next = new Map<string, MercureConnectionStatus>(current);

        if (status === null) next.delete(topic);
        else next.set(topic, status);

        return next;
      },
    );
  }
  //#endregion
}
