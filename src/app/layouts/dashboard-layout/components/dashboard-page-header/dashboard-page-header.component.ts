import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { TitleService } from '@core/title';
import { DashboardPageActions } from '../dashboard-page-actions';

/**
 * Component DashboardPageHeader
 * @class DashboardPageHeader
 *
 * @description
 * The shell's title band: the activated route's own title on the left, its
 * registered actions (`DashboardPageActions`) on the right. It sits between
 * the 48px tool bar and the routed content, replacing the per-page title
 * blocks features used to render for themselves — the title is now the
 * document's one `<h1>`, sourced from `TitleService.pageTitle`, which
 * `PageTitleStrategy` already keeps in sync with each route's `title`.
 *
 * Layout-local shell chrome, like `DashboardBreadcrumb`: it reads a core
 * service the shell itself provides and stays ignorant of what a page
 * contributes to either side (`ARCHITECTURE.md` §8.2, §10.3).
 *
 * The title and the actions render independently: a route with no title
 * shows no `<h1>` but still shows any registered actions, and
 * `DashboardPageActions` itself renders nothing when the activated page
 * registered none — a route always sets a title in this app, but the guard
 * keeps the band from showing a bare heading tag for one that does not.
 *
 * Its horizontal padding mirrors the `p-4 md:p-6` every routed page applies
 * to its own root, so the title starts on the same vertical line as the
 * content below it. The band carries no bottom border: the spacing alone
 * separates it from the content, keeping the shell free of a rule that cut
 * across the inset surface.
 *
 * @version 1.1.0
 *
 * @example
 * ```html
 * <app-dashboard-page-header />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-page-header',
  imports: [DashboardPageActions],
  templateUrl: './dashboard-page-header.component.html',
  host: { class: 'block' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageHeader {
  //#region Properties
  /**
   * Property titleService
   * @readonly
   *
   * @description
   * Source of the activated route's reactive title.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {TitleService}
   */
  private readonly titleService: TitleService = inject<TitleService>(TitleService);

  /**
   * Property title
   * @readonly
   *
   * @description
   * The activated route's own title, empty before the first navigation
   * resolves one.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<string>}
   */
  protected readonly title: Signal<string> = this.titleService.pageTitle;
  //#endregion
}
