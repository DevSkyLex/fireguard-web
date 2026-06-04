import { Injectable } from '@angular/core';
import { type PreloadingStrategy, type Route } from '@angular/router';
import { EMPTY, type Observable } from 'rxjs';
import { catchError } from 'rxjs';

/**
 * Strategy SelectivePreloadingStrategy
 * @class SelectivePreloadingStrategy
 *
 * @description
 * Preloads only routes explicitly marked with `data.preload === true`.
 * This keeps the browser from fetching every lazy chunk while still
 * improving perceived navigation speed for high-value routes.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  //#region Methods
  /**
   * Method preload
   * @method preload
   *
   * @description
   * Preloads the route if `data.preload` is true,
   * otherwise returns an observable of null.
   *
   * @access public
   * @since 1.0.0
   *
   * @param {Route} route - The route to potentially preload
   * @param {() => Observable<unknown>} load - The function to load the route
   *
   * @returns {Observable<unknown>} - An observable of the loaded route or null
   */
  public preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] !== true) return EMPTY;
    return load().pipe(catchError(() => EMPTY));
  }
  //#endregion
}
