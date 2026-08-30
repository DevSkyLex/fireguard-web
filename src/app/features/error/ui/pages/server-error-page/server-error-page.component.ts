import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideRotateCcw, lucideServerCrash } from '@ng-icons/lucide';
import { PageHeading } from '@shared/page-heading';
import { HlmButton } from '@shared/ui/button';

/**
 * Component ServerErrorPage
 * @class ServerErrorPage
 *
 * @description
 * Where `organizationGuard` lands when resolving the member's workspace
 * fails on transport — the API answered 5xx or not at all. The failure is
 * transient by definition, so the primary action retries the workspace
 * root with a full navigation rather than offering dead ends.
 *
 * @version 1.0.0
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-server-error-page',
  imports: [NgIcon, PageHeading, HlmButton],
  providers: [provideIcons({ lucideRotateCcw, lucideServerCrash })],
  templateUrl: './server-error-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerErrorPage {
  //#region Properties
  /**
   * Property router
   * @readonly
   *
   * @description
   * Used to retry the workspace root, re-running the guard that failed.
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
   * Method retry
   * @method retry
   *
   * @description
   * Navigates back to the workspace root, re-running the resolution that
   * failed. `onSameUrlNavigation` is not relied on: the member is on
   * `/error/500`, so the target is always a different URL.
   *
   * @access protected
   * @since 1.0.0
   *
   * @returns {void}
   */
  protected retry(): void {
    void this.router.navigate(['/']);
  }
  //#endregion
}
