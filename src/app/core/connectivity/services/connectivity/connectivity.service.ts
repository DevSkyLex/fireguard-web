import { HttpErrorResponse } from '@angular/common/http';
import { computed, Service, type Signal } from '@angular/core';
import { online as createOnlineSignal } from '@signality/core';
import { isApiError } from '@core/api/utils';

/**
 * Service ConnectivityService
 * @class ConnectivityService
 *
 * @description
 * Single source of truth for browser network connectivity. Wraps the
 * reactive `navigator.onLine` signal once so every feature shares one
 * representation of "are we online" instead of re-deriving it from
 * `navigator.onLine`, ad-hoc `window` listeners or scattered SSR guards.
 *
 * SSR-safe: resolves to `true` (online) on the server, matching the
 * optimistic-online behavior expected during server rendering.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const connectivity: ConnectivityService = inject<ConnectivityService>(ConnectivityService);
 * if (connectivity.isOffline()) {
 *   // queue the operation locally
 * }
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Service()
export class ConnectivityService {
  //#region Properties
  /**
   * Property online
   * @readonly
   *
   * @description
   * Reactive online status. `true` when the browser reports connectivity,
   * `false` when offline. Updates live on `online`/`offline` events.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly online: Signal<boolean> = createOnlineSignal();

  /**
   * Property offline
   * @readonly
   *
   * @description
   * Reactive offline status, the negation of {@link online}. Provided as a
   * convenience for templates and guards that read the offline case.
   *
   * @access public
   * @since 1.0.0
   *
   * @type {Signal<boolean>}
   */
  public readonly offline: Signal<boolean> = computed<boolean>(() => !this.online());
  //#endregion

  //#region Methods
  /**
   * Method isOnline
   * @method isOnline
   *
   * @description
   * Reads the current online status imperatively, for use outside reactive
   * contexts (e.g. inside an `rxMethod` or an async service method).
   *
   * @access public
   * @since 1.0.0
   *
   * @return {boolean} Whether the browser currently reports connectivity.
   */
  public isOnline(): boolean {
    return this.online();
  }

  /**
   * Method isOffline
   * @method isOffline
   *
   * @description
   * Reads the current offline status imperatively.
   *
   * @access public
   * @since 1.0.0
   *
   * @return {boolean} Whether the browser currently reports no connectivity.
   */
  public isOffline(): boolean {
    return !this.online();
  }

  /**
   * Method isNetworkFailure
   * @method isNetworkFailure
   *
   * @description
   * Determines whether a transport error should be treated as a connectivity
   * loss, so callers may safely fall back to local data. True when the browser
   * is offline, or the response carries HTTP status 0 (a transport failure —
   * the "online but unreachable" case: captive portals, dropped cells, a dead
   * server while `navigator.onLine` stays true). Status 0 is detected both on a
   * raw `HttpErrorResponse` and on an `ApiError` already normalized by
   * `HydraApiService.handleError` (which strips the `HttpErrorResponse` type),
   * so every error flowing through a feature service is classified correctly.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {unknown} error - Transport error to classify.
   *
   * @return {boolean} Whether the failure represents unavailable connectivity.
   */
  public isNetworkFailure(error: unknown): boolean {
    if (!this.online()) {
      return true;
    }
    if (error instanceof HttpErrorResponse) {
      return error.status === 0;
    }
    return isApiError(error) && error.status === 0;
  }
  //#endregion
}
