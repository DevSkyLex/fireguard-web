import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCompass, lucideMapPin, lucideRoute } from '@ng-icons/lucide';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';

/**
 * Component NotFoundPage
 * @class NotFoundPage
 *
 * @description
 * Presents an unmatched route without exposing its address in the page.
 * Offers the workspace root first, followed by browser history navigation.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, NgIcon, PageHeading, HlmButton],
  providers: [provideIcons({ lucideMapPin, lucideRoute, lucideArrowLeft, lucideCompass })],
  templateUrl: './not-found-page.component.html',
  host: { class: 'my-auto block min-w-0 w-full max-w-full shrink-0 sm:max-w-xl' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  //#region Properties
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
