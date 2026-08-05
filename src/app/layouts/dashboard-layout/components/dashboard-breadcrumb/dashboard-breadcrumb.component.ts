import { ChangeDetectionStrategy, Component, inject, type Signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import { BreadcrumbService, type BreadcrumbItem } from '@core/breadcrumb';
import {
  HlmBreadcrumb,
  HlmBreadcrumbItem,
  HlmBreadcrumbLink,
  HlmBreadcrumbList,
  HlmBreadcrumbPage,
  HlmBreadcrumbSeparator,
} from '@shared/ui/breadcrumb';

/**
 * Component DashboardBreadcrumb
 * @class DashboardBreadcrumb
 *
 * @description
 * The trail in the shell header: where the routed page sits in the workspace.
 *
 * Layout-local shell chrome. It reads `BreadcrumbService`, which the shell
 * provides itself, so the trail is scoped to this shell rather than persisting
 * across the public ones (`ARCHITECTURE.md` §8.2). Each level's label comes from
 * its own route's `data.breadcrumb`; a route that sets it to `false` is skipped,
 * which is how the organization landing page avoids repeating the workspace
 * name the switcher already shows.
 *
 * The trail truncates rather than wraps: the header is one row, and pushing the
 * tool cluster off the card is worse than eliding a middle segment.
 *
 * @version 1.0.0
 *
 * @example
 * ```html
 * <app-dashboard-breadcrumb />
 * ```
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
@Component({
  selector: 'app-dashboard-breadcrumb',
  imports: [
    RouterLink,
    NgIcon,
    HlmBreadcrumb,
    HlmBreadcrumbItem,
    HlmBreadcrumbLink,
    HlmBreadcrumbList,
    HlmBreadcrumbPage,
    HlmBreadcrumbSeparator,
  ],
  providers: [provideIcons({ lucideHouse })],
  templateUrl: './dashboard-breadcrumb.component.html',
  host: { class: 'flex min-w-0 items-center' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardBreadcrumb {
  //#region Properties
  /**
   * Property breadcrumb
   * @readonly
   *
   * @description
   * The shell-scoped trail, rebuilt on every completed navigation.
   *
   * @access private
   * @since 1.0.0
   *
   * @type {BreadcrumbService}
   */
  private readonly breadcrumb: BreadcrumbService = inject<BreadcrumbService>(BreadcrumbService);

  /**
   * Property home
   * @readonly
   *
   * @description
   * The root step, rendered as a glyph because it needs no name.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BreadcrumbItem>}
   */
  protected readonly home: Signal<BreadcrumbItem> = this.breadcrumb.home;

  /**
   * Property items
   * @readonly
   *
   * @description
   * The named steps after home, in order.
   *
   * @access protected
   * @since 1.0.0
   *
   * @type {Signal<BreadcrumbItem[]>}
   */
  protected readonly items: Signal<BreadcrumbItem[]> = this.breadcrumb.items;
  //#endregion
}
