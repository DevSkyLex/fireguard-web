import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  type EnvironmentProviders,
  PLATFORM_ID,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Events } from '@ngrx/signals/events';
import { filter, map } from 'rxjs';
import { isFeedbackEventPayload } from '@core/request-state';
import { FeedbackService } from './services/feedback/feedback.service';

/**
 * Provider provideFeedback
 *
 * @description
 * Wires the single, app-wide feedback listener. On the browser it subscribes
 * to the global NgRx event stream, picks out `FeedbackEventPayload` events
 * (success / info / warn / error dispatched by any store) and forwards them to
 * the {@link FeedbackService} which renders the toast.
 *
 * This is the only consumer of feedback payloads: stores stay the single
 * trigger, pages no longer subscribe to failure events to show toasts. Because
 * it filters by payload shape, it imports no feature event group and keeps
 * `core` independent of `features`.
 *
 * The listener is browser-only — toasts never render during SSR.
 *
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * export const appConfig: ApplicationConfig = {
 *   providers: [provideFeedback()],
 * };
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export function provideFeedback(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject<object>(PLATFORM_ID))) return;

      const events: Events = inject(Events);
      const feedback: FeedbackService = inject(FeedbackService);
      const destroyRef: DestroyRef = inject(DestroyRef);

      events
        .on()
        .pipe(
          map((event) => event.payload),
          filter(isFeedbackEventPayload),
          takeUntilDestroyed(destroyRef),
        )
        .subscribe((payload) => feedback.show(payload));
    }),
  ]);
}
