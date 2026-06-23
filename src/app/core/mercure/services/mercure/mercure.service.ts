import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { EMPTY, Observable, Subscriber } from 'rxjs';
import { ENV_CONFIG } from '@core/config/environment/env.token';
import type { EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * MercureService
 * @class MercureService
 *
 * @description
 * Service responsible for subscribing to Mercure topics using Server-Sent Events (SSE).
 * Provides a method to subscribe to a given topic with authentication, returning an observable of messages.
 * Mercure is a real-time update protocol that allows clients to receive updates from the server via SSE.
 *
 * @version 1.0.0
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
      url.searchParams.append('authorization', token);

      const eventSource: EventSource = new EventSource(url.toString());

      eventSource.addEventListener('message', (event: MessageEvent) => {
        try {
          const data: T = JSON.parse(event.data as string) as T;
          subscriber.next(data);
        } catch {
          subscriber.error(new Error(`Failed to parse Mercure message: ${String(event.data)}`));
        }
      });

      eventSource.addEventListener('error', () => {
        subscriber.error(new Error('Mercure EventSource connection error'));
        eventSource.close();
      });

      return () => eventSource.close();
    });
  }
  //#endregion
}
