import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCompass } from '@ng-icons/lucide';
import { HlmButton } from '@shared/ui/button';

/**
 * Component NotFoundPage
 * @class NotFoundPage
 *
 * @description
 * The route that did not resolve. `notFoundRedirectGuard` forwards the address
 * that failed as the `from` query parameter, so the page can name it instead of
 * offering the one exit a member who mistyped a deep link does not want.
 *
 * Two ways out, in the order they are useful: back to where they came from, and
 * the workspace root. Going back is first because an unmatched URL is usually a
 * stale link followed from somewhere that still works.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, NgIcon, HlmButton],
  providers: [provideIcons({ lucideArrowLeft, lucideCompass })],
  templateUrl: './not-found-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  //#region Properties
  /**
   * Property route
   * @readonly
   *
   * @description
   * Carries the `from` parameter the redirect guard attached.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {ActivatedRoute}
   */
  private readonly route: ActivatedRoute = inject<ActivatedRoute>(ActivatedRoute);

  /**
   * Property router
   * @readonly
   *
   * @description
   * Used for the back step, which has no static target.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {Router}
   */
  private readonly router: Router = inject<Router>(Router);

  /**
   * Property attemptedUrl
   * @readonly
   *
   * @description
   * The address that failed, or `null` when the page was reached directly.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string | null>}
   */
  protected readonly attemptedUrl: Signal<string | null> = computed((): string | null =>
    this.route.snapshot.queryParamMap.get('from'),
  );
  //#endregion

  //#region Methods
  /**
   * Method goBack
   * @method goBack
   *
   * @description
   * Returns to the previous page. Falls back to the root when there is no
   * history to step into — a page opened straight from a pasted link.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected goBack(): void {
    if (globalThis.history.length > 1) {
      globalThis.history.back();

      return;
    }

    void this.router.navigate(['/']);
  }
  //#endregion
}
