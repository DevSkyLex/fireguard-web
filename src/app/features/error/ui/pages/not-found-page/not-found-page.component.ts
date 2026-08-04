import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, type ParamMap, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { map } from 'rxjs';
import { ErrorContent } from '../../components/error-content';
import { NOT_FOUND_COLLECTION_LABELS } from './constants';
import type { NotFoundOrigin } from './models';
import { resolveNotFoundOrigin } from './utils';

/**
 * Component NotFoundPage
 * @class NotFoundPage
 *
 * @description
 * Displayed when a route cannot be matched (HTTP 404). Reads the address that
 * failed from the `from` query parameter, set by `notFoundRedirectGuard`, so it
 * can offer the way back a member actually wants — the collection the address
 * was reaching for, or at least the organization it belonged to — instead of
 * the single "back to home" that used to be the only exit.
 *
 * @version 2.0.0
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, ButtonModule, ErrorContent],
  templateUrl: './not-found-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  //#region Properties
  /** Current route, read for the `from` query parameter. */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /** Organization and collection the failed address was reaching for. */
  protected readonly origin: Signal<NotFoundOrigin> = toSignal(
    this.route.queryParamMap.pipe(
      map((params: ParamMap): NotFoundOrigin => resolveNotFoundOrigin(params.get('from'))),
    ),
    { initialValue: { organizationId: null, collection: null } as NotFoundOrigin },
  );

  /** Router link back to the collection the address named, when recognised. */
  protected readonly collectionLink: Signal<readonly string[] | null> = computed<
    readonly string[] | null
  >(() => {
    const { organizationId, collection }: NotFoundOrigin = this.origin();

    return organizationId && collection ? ['/organizations', organizationId, collection] : null;
  });

  /** Human label of the collection the address named, when recognised. */
  protected readonly collectionLabel: Signal<string | null> = computed<string | null>(() => {
    const collection: string | null = this.origin().collection;

    return collection === null ? null : (NOT_FOUND_COLLECTION_LABELS[collection] ?? null);
  });

  /** Router link back to the organization the address belonged to. */
  protected readonly organizationLink: Signal<readonly string[] | null> = computed<
    readonly string[] | null
  >(() => {
    const organizationId: string | null = this.origin().organizationId;

    return organizationId === null ? null : ['/organizations', organizationId];
  });
  //#endregion
}
