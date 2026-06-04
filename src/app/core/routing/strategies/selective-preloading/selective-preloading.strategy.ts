import { Injectable } from '@angular/core';
import { type PreloadingStrategy, type Route } from '@angular/router';
import { type Observable, of } from 'rxjs';
import { catchError } from 'rxjs';

/**
 * Strategy SelectivePreloadingStrategy
 *
 * @description
 * Preloads only routes explicitly marked with `data.preload === true`.
 * This keeps the browser from fetching every lazy chunk while still
 * improving perceived navigation speed for high-value routes.
 */
@Injectable({ providedIn: 'root' })
export class SelectivePreloadingStrategy implements PreloadingStrategy {
  public preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    if (route.data?.['preload'] !== true) {
      return of(null);
    }

    return load().pipe(catchError(() => of(null)));
  }
}
